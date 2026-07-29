import { preflight, json } from "../_shared/cors.ts";
import { getUser, serviceClient, ownsSession } from "../_shared/auth.ts";
import { gradeAgainstKey, calculateLevel, AnswerKeyEntry } from "../_shared/grading.ts";
import { scoreSession, mapToBand, type ScoredResponse, type CutScoreRow } from "../_shared/exam-scoring.ts";

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

    const raw = responses as Record<string, unknown>;
    const formId = typeof raw.formId === "string" ? raw.formId : null;

    if (formId && (phase === "reading" || phase === "listening" || phase === "comprehension")) {
      // ── Item-bank form: grade against item_options (server-only keys) ──
      const answers = (raw.answers ?? {}) as Record<string, string>;
      const skill = phase === "listening" ? "listening" : "reading";

      const { data: formItems, error: fiErr } = await svc
        .from("form_items")
        .select("item_id, is_trial, position")
        .eq("form_id", formId)
        .order("position", { ascending: true });
      if (fiErr) throw new Error(fiErr.message);
      if (!formItems || formItems.length === 0) {
        return json(req, { error: "Unknown practice form" }, 409);
      }

      const itemIds = formItems.map((f) => f.item_id);
      const { data: keyOptions, error: koErr } = await svc
        .from("item_options")
        .select("id, item_id, is_correct")
        .in("item_id", itemIds);
      if (koErr) throw new Error(koErr.message);

      const correctByItem = new Map<string, string>();
      for (const o of keyOptions ?? []) {
        if (o.is_correct) correctByItem.set(o.item_id, o.id);
      }

      const graded: ScoredResponse[] = [];
      const rows: Record<string, unknown>[] = [];
      const answeredItemIds: string[] = [];

      for (const fi of formItems) {
        const selected = answers[fi.item_id];
        if (!selected) continue;
        const isCorrect = correctByItem.get(fi.item_id) === selected;
        graded.push({ itemId: fi.item_id, isCorrect, isTrial: !!fi.is_trial });
        answeredItemIds.push(fi.item_id);
        rows.push({
          session_id: sessionId,
          user_id: session.user_id,
          form_id: formId,
          item_id: fi.item_id,
          selected_option_id: selected,
          is_correct: isCorrect,
          is_trial: !!fi.is_trial,
        });
      }

      if (rows.length > 0) {
        await svc.from("item_responses").insert(rows as never);
        // Trial responses are recorded and counted for calibration but never scored.
        await svc.rpc("bump_item_responses", { _item_ids: answeredItemIds });
      }

      const result = scoreSession(graded);
      score = result.scaledScore;

      const { data: cuts } = await svc
        .from("cut_scores")
        .select("skill, wida_level, min_scaled, max_scaled, cefr_band")
        .eq("skill", skill)
        .eq("active", true);

      const band = mapToBand((cuts ?? []) as CutScoreRow[], result.scaledScore, result.sem);

      await svc.from("proficiency_results").upsert(
        {
          user_id: session.user_id,
          session_id: sessionId,
          form_id: formId,
          skill,
          scaled_score: result.scaledScore,
          sem: result.sem,
          wida_level: band.widaLevel,
          wida_low: band.widaLow,
          wida_high: band.widaHigh,
          cefr_band: band.cefrBand,
          n_scored: result.nScored,
          n_correct: result.nCorrect,
        } as never,
        { onConflict: "session_id,skill" },
      );

      feedback = {
        overall: "Practice / formative result — not an official proficiency measure.",
        scaledScore: result.scaledScore,
        sem: result.sem,
        nScored: result.nScored,
        nCorrect: result.nCorrect,
        trialItems: graded.filter((g) => g.isTrial).length,
        scoringMethod: result.method,
        band: band.label,
        widaLevel: band.widaLevel,
        widaLow: band.widaLow,
        widaHigh: band.widaHigh,
        cefrBand: band.cefrBand,
      };
    } else if (phase === "comprehension" || phase === "reading" || phase === "listening") {
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
    } else if (phase === "conversation") {
      const r = responses as { messages?: Array<{ content: string; timestamp?: string }>; duration?: number };
      const result = await callFunction("evaluate-conversation", {
        userMessages: (r.messages ?? []).slice(0, 200).map((m) => ({
          content: String(m.content ?? "").slice(0, 4000),
          timestamp: m.timestamp,
        })),
        duration: Number(r.duration) || 0,
        targetLanguage: targetLanguage ?? "English",
      });
      score = Number(result.score) || 0;
      rubric = result.traits ?? null;
      feedback = { stats: result.stats, notes: result.notes };
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
