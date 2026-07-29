// Server-side grading primitives. Answer keys never leave the server.

export const LEVEL_WEIGHTS: Record<string, number> = {
  A1: 0.5,
  A2: 0.75,
  B1: 1.0,
  B2: 1.25,
  C1: 1.5,
  C2: 2.0,
};

export interface AnswerKeyEntry {
  level: string;
  questions: Array<{ id: string; correctOptionId: string }>;
}

/** Strips correct answers out of comprehension content before it reaches the browser. */
export function stripAnswers(content: any[]): any[] {
  return content.map((item) => ({
    ...item,
    questions: (item.questions ?? []).map((q: any) => ({
      id: q.id,
      text: q.text,
      options: (q.options ?? []).map((o: any) => ({ id: o.id, text: o.text })),
    })),
  }));
}

/** Builds the answer key for a generated comprehension payload. */
export function buildAnswerKey(content: any[]): AnswerKeyEntry[] {
  return content.map((item) => ({
    level: item.level ?? "B1",
    questions: (item.questions ?? []).map((q: any) => ({
      id: q.id,
      correctOptionId: (q.options ?? []).find((o: any) => o.isCorrect)?.id ?? "",
    })),
  }));
}

/** CEFR-weighted MCQ scoring against a trusted, server-stored answer key. */
export function gradeAgainstKey(
  key: AnswerKeyEntry[],
  responses: Record<string, string>,
): { score: number; totalQuestions: number; correct: number } {
  let weightedCorrect = 0;
  let totalWeight = 0;
  let correct = 0;
  let totalQuestions = 0;

  for (const entry of key) {
    const weight = LEVEL_WEIGHTS[entry.level] ?? 1.0;
    for (const q of entry.questions) {
      // Adaptive sessions pre-generate more items than the candidate ever
      // sees. Only items the candidate actually answered are graded.
      const answer = responses?.[q.id];
      if (answer === undefined || answer === null || answer === "") continue;
      totalWeight += weight;
      totalQuestions += 1;
      if (q.correctOptionId && answer === q.correctOptionId) {
        weightedCorrect += weight;
        correct += 1;
      }
    }

  }

  const score = totalWeight > 0 ? (weightedCorrect / totalWeight) * 100 : 0;
  return { score, totalQuestions, correct };
}

export function calculateLevel(score: number): { cefr: string; actfl: string } {
  if (score >= 95) return { cefr: "C2", actfl: "Superior" };
  if (score >= 83) return { cefr: "C1", actfl: "Advanced-Mid" };
  if (score >= 73) return { cefr: "B2", actfl: "Intermediate-High" };
  if (score >= 63) return { cefr: "B1", actfl: "Intermediate-Mid" };
  if (score >= 46) return { cefr: "A2", actfl: "Novice-High" };
  if (score >= 25) return { cefr: "A1", actfl: "Novice-Mid" };
  return { cefr: "Pre-A1", actfl: "Novice-Low" };
}

/** Constant-time string comparison for signature checks. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Full-length hex HMAC-SHA256. */
export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Single source of truth for the certification/certificate signing secret. */
export function signingSecret(): string {
  const secret = Deno.env.get("CERT_SIGNING_SECRET");
  if (!secret || secret.trim().length < 16) {
    throw new Error("CERT_SIGNING_SECRET is not configured");
  }
  return secret;
}
