// Shared helpers for the AI item-authoring gauntlet.
// All correct answers stay server-side; nothing here is callable from the browser.

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export const AUTHOR_MODEL = "google/gemini-3.6-flash";
export const SOLVER_MODEL = "openai/gpt-5.4-mini";
export const EMBED_MODEL = "openai/text-embedding-3-small";
export const PROMPT_VERSION = "authoring-v1";

function apiKey(): string {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY is not set");
  return key;
}

export async function chatJSON(
  model: string,
  system: string,
  user: string,
): Promise<any> {
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  };
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      "Lovable-API-Key": apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI gateway ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  return safeParse(content);
}

export function safeParse(content: string): any {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch { /* fall through */ }
    }
    return {};
  }
}

export async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${GATEWAY}/embeddings`, {
    method: "POST",
    headers: {
      "Lovable-API-Key": apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!res.ok) {
    const text2 = await res.text();
    throw new Error(`Embedding ${res.status}: ${text2.slice(0, 200)}`);
  }
  const data = await res.json();
  return data?.data?.[0]?.embedding ?? [];
}

export function cosine(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/* ---------------- Readability ---------------- */

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "")
    .match(/[aeiouy]{1,2}/g);
  return groups ? groups.length : 1;
}

/** Flesch–Kincaid grade level. */
export function readabilityGrade(text: string): number {
  const sentences = (text.match(/[.!?]+/g) || []).length || 1;
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const grade = 0.39 * (words.length / sentences) +
    11.8 * (syllables / words.length) - 15.59;
  return Math.round(grade * 10) / 10;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/* ---------------- Level targets ---------------- */

export const WIDA_TO_CEFR: Record<number, string> = {
  1: "A1",
  2: "A1",
  3: "A2",
  4: "B1",
  5: "B2",
  6: "C1",
};

/** Acceptable Flesch–Kincaid grade window per WIDA level for a grade 6–8 audience. */
export const READABILITY_WINDOW: Record<number, [number, number]> = {
  1: [0, 3],
  2: [1, 4.5],
  3: [2.5, 6],
  4: [4, 8],
  5: [6, 10.5],
  6: [8, 13],
};

export interface GateResult {
  pass: boolean;
  reason: string;
  [k: string]: unknown;
}
