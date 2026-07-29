import { preflight, json } from "../_shared/cors.ts";
import { getUser, serviceClient, ownsSession } from "../_shared/auth.ts";
import { gradeAgainstKey, calculateLevel, AnswerKeyEntry } from "../_shared/grading.ts";

const SECTION_MAP: Record<string, string> = {
  comprehension: "reading",
  reading: "reading",
  listening: "listening",
  writing: "writing",
  speaking: "speaking",
  pronunciation: "speaking",
  conversation: "conversation",
};

async function callFunction(name: string, body: unknown) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${name}`;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${name} failed: ${res.status} ${await res.text()}`);
  return await res.json();
}

/**
 * The ONLY way a score enters the database.
 * The browser submits raw answers; scoring happens here against server-held
 * answer keys / AI rubrics, and the result is written with the service role.
 */
Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const user = await getUser(req);
    if (!user) return json(req, { error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { sessionId, phase, responses, targetLanguage } = body ?? {};

    if (typeof sessionId !== "string" || typeof phase !== "string") {
      return json(req, { error: "sessionId and phase are required" }, 400);
    }
    const sectionType = SECTION_MAP[phase];
    if (!sectionType) return json(req, { error: "Unknown phase" }, 400);
    if (!responses || typeof responses !== "object") {
      return json(req, { error: "responses are required" }, 400);
    }

    const { ok, session } = await ownsSession(user.id, sessionId);
    if (!ok || !session) return json(req, { error: "Session not found" }, 404);
    if (session.status === "completed") {
      return json(req, { error: "Session already finalized" }, 409);
    }

    const svc = serviceClient();
    let score = 0;
    let feedback: Record<string, unknown> = {};
    let rubric: Record<string, unknown> | null = null;

    if (phase === "comprehension" || phase === "reading" || phase === "listening") {
      // Grade against the trusted, server-stored answer key
      const { data: keyRows } = await svc
        .from("content_answer_keys")
        .select("answer_key, section, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      const relevant = (keyRows ?? []).filter((r) =>
        phase === "comprehension" ? true : r.section === phase
      );
      if (relevant.length === 0) {
        return json(req, { error: "No answer key on file for this session" }, 409);
      }

      const key: AnswerKeyEntry[] = relevant.flatMap((r) => r.answer_key as AnswerKeyEntry[]);
      const graded = gradeAgainstKey(key, responses as Record<string, string>);
      score = graded.score;
      feedback = {
        overall: `Comprehension assessed on ${graded.totalQuestions} items.`,
        correct: graded.correct,
        totalQuestions: graded.totalQuestions,
      };
    } else if (phase === "writing") {
      const text = Object.values(responses as Record<string, string>).join("\n\n");
      const validatorResult = await callFunction("validate-writing", {
        response: text,
        targetLanguage: targetLanguage ?? "English",
      });
      const scoring = await callFunction("score-writing", {
        response: text,
        validatorResult,
        targetLevel: "B1",
      });
      score = Number(scoring.score) || 0;
      rubric = scoring.traits ?? null;
      feedback = {
        notes: scoring.notes,
        recommendedCEFR: scoring.recommendedCEFR,
        validatorFlags: validatorResult?.flags,
      };
    } else {
      const result = await callFunction("evaluate-test-responses", {
        phase,
        responses,
        targetLanguage: targetLanguage ?? "English",
      });
      score = Number(result.score) || 0;
      feedback = result.feedback ?? {};
    }

    score = Math.max(0, Math.min(100, score));
    const levels = calculateLevel(score);

    // Upsert the section row (server-owned)
    const { data: existing } = await svc
      .from("test_sections")
      .select("id")
      .eq("session_id", sessionId)
      .eq("section_type", sectionType)
      .maybeSingle();

    let sectionId = existing?.id as string | undefined;
    if (!sectionId) {
      const { data: created, error: secErr } = await svc
        .from("test_sections")
        .insert({
          session_id: sessionId,
          section_type: sectionType,
          status: "completed",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (secErr) throw new Error(secErr.message);
      sectionId = created.id;
    } else {
      await svc
        .from("test_sections")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", sectionId);
    }

    await svc.from("scores_section").insert({
      section_id: sectionId,
      pass_type: "primary",
      raw_score: score,
      weighted_score: score,
      cefr_level: levels.cefr,
      rubric_scores: rubric,
      evidence: feedback as never,
      model_used: "server-grader-v1",
    });

    await svc.from("event_logs").insert({
      session_id: sessionId,
      event_type: "phase_submitted",
      payload: { phase, section_type: sectionType, score, responses } as never,
    });

    return json(req, {
      score: Math.round(score * 10) / 10,
      cefr_level: levels.cefr,
      actfl_level: levels.actfl,
      feedback,
    });
  } catch (e) {
    console.error("submit-phase error:", (e as Error).message);
    return json(req, { error: "Could not score this phase" }, 500);
  }
});
