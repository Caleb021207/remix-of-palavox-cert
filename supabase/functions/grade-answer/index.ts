import { preflight, json } from "../_shared/cors.ts";
import { getUser, serviceClient, ownsSession } from "../_shared/auth.ts";
import { AnswerKeyEntry } from "../_shared/grading.ts";

/**
 * Grades a SINGLE adaptive comprehension answer server-side.
 *
 * The browser never receives `isCorrect` flags with the content, so the
 * adaptive engine asks the server whether the last answer was right in order
 * to pick the next difficulty. Only the boolean is returned — never the
 * correct option — and the authoritative score still comes from submit-phase.
 */
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const user = await getUser(req);
    if (!user) return json(req, { error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { sessionId, questionId, selectedOptionId, section, responseTimeMs } = body ?? {};

    if (typeof sessionId !== "string" || typeof questionId !== "string" || typeof selectedOptionId !== "string") {
      return json(req, { error: "sessionId, questionId and selectedOptionId are required" }, 400);
    }

    const { ok, session } = await ownsSession(user.id, sessionId);
    if (!ok || !session) return json(req, { error: "Session not found" }, 404);
    if (session.status === "completed") return json(req, { error: "Session already finalized" }, 409);

    const svc = serviceClient();
    const { data: keyRows } = await svc
      .from("content_answer_keys")
      .select("answer_key")
      .eq("session_id", sessionId);

    let correctOptionId: string | null = null;
    let level: string | null = null;
    for (const row of keyRows ?? []) {
      for (const entry of (row.answer_key ?? []) as AnswerKeyEntry[]) {
        const q = (entry.questions ?? []).find((x) => x.id === questionId);
        if (q) {
          correctOptionId = q.correctOptionId;
          level = entry.level;
          break;
        }
      }
      if (correctOptionId) break;
    }

    if (!correctOptionId) {
      return json(req, { error: "No answer key on file for this question" }, 409);
    }

    const isCorrect = correctOptionId === selectedOptionId;

    await svc.from("event_logs").insert({
      session_id: sessionId,
      user_id: user.id,
      event_type: "adaptive_question_attempt",
      payload: {
        question_id: questionId,
        section: typeof section === "string" ? section : null,
        level,
        selected_option_id: selectedOptionId,
        is_correct: isCorrect,
        response_time_ms: typeof responseTimeMs === "number" ? responseTimeMs : null,
      } as never,
    });

    return json(req, { isCorrect, level });
  } catch (e) {
    console.error("grade-answer error:", (e as Error).message);
    return json(req, { error: "Could not grade this answer" }, 500);
  }
});
