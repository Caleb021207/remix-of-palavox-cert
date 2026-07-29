// AI item-authoring gauntlet. Admin-only. Correct answers never leave the server.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsFor, preflight, json } from "../_shared/cors.ts";
import { getUser, hasRole, serviceClient, isServiceCall } from "../_shared/auth.ts";
import {
  AUTHOR_MODEL,
  SOLVER_MODEL,
  PROMPT_VERSION,
  chatJSON,
  embed,
  cosine,
  readabilityGrade,
  wordCount,
  WIDA_TO_CEFR,
  READABILITY_WINDOW,
  type GateResult,
} from "../_shared/authoring.ts";

const SENSITIVE = [
  "suicide", "self-harm", "abortion", "terrorism", "sexual", "drug use",
  "alcohol", "gun", "weapon", "racial slur", "immigration raid", "death penalty",
];

function draftPrompt(skill: string, level: number, topic: string, kluse: string) {
  const cefr = WIDA_TO_CEFR[level];
  const [lo, hi] = READABILITY_WINDOW[level];
  return `Author ONE English language-proficiency practice item for US grades 6-8 multilingual learners.

Skill: ${skill}
Target WIDA level: ${level} (of 6)
Matching CEFR band: ${cefr}
Key language use: ${kluse}
Topic: ${topic}
Target Flesch-Kincaid readability grade for the passage: between ${lo} and ${hi}.

${skill === "listening"
    ? "Write a short spoken SCRIPT (60-140 words) that will be read aloud by a narrator."
    : "Write a short READING passage (70-160 words)."}

Return strict JSON:
{
  "title": string,
  "passage": string,
  "stem": string,
  "dok": 1|2|3,
  "can_do": string,           // a WIDA-style can-do statement for this level and skill
  "options": [ { "label": string, "is_correct": boolean, "rationale": string } ]  // exactly 4, exactly one correct
}

Rules: exactly one defensible key; distractors plausible, similar in length and register to the key, each defensibly WRONG based on the passage; no trick wording; age-appropriate, culturally inclusive, no sensitive content.`;
}

async function runGauntlet(
  svc: ReturnType<typeof serviceClient>,
  skill: string,
  level: number,
  topic: string,
  kluse: string,
  existing: Array<{ item_id: string; embedding: number[] }>,
  keyPositionCounts: number[],
) {
  const gates: Record<string, GateResult> = {};
  const draft = await chatJSON(
    AUTHOR_MODEL,
    "You are an expert ESL assessment item writer working to WIDA and CEFR standards. Reply with JSON only.",
    draftPrompt(skill, level, topic, kluse),
  );

  const passage: string = draft.passage ?? "";
  const stem: string = draft.stem ?? "";
  let options: Array<{ label: string; is_correct: boolean; rationale: string }> =
    Array.isArray(draft.options) ? draft.options : [];

  if (!passage || !stem || options.length < 3 || options.length > 4) {
    return { ok: false, reason: "malformed_draft", gates, draft };
  }
  if (options.filter((o) => o.is_correct).length !== 1) {
    return { ok: false, reason: "not_exactly_one_key", gates, draft };
  }

  /* (b) LEVEL / READABILITY GATE */
  const fk = readabilityGrade(passage);
  const [lo, hi] = READABILITY_WINDOW[level];
  const inWindow = fk >= lo && fk <= hi;
  const classify = await chatJSON(
    AUTHOR_MODEL,
    "You are a strict CEFR/WIDA level classifier. Reply with JSON only.",
    `Classify the language demand of this text for US grade 6-8 multilingual learners.\nText:\n"""${passage}"""\n\nReturn {"cefr": "A1|A2|B1|B2|C1", "wida": 1-6}`,
  );
  const widaGuess = Number(classify.wida ?? 0);
  const levelOk = Math.abs(widaGuess - level) <= 1;
  gates.level = {
    pass: inWindow && levelOk,
    reason: inWindow && levelOk
      ? "on target"
      : `readability ${fk} (window ${lo}-${hi}); classifier WIDA ${widaGuess || "?"} vs target ${level}`,
    readability_grade: fk,
    classified_wida: widaGuess,
    classified_cefr: classify.cefr ?? null,
  };

  /* (c) INDEPENDENT SOLVER GATE — different model, no key */
  const blind = options.map((o, i) => `${i + 1}. ${o.label}`).join("\n");
  const solved = await chatJSON(
    SOLVER_MODEL,
    "You are a careful test taker. Reply with JSON only.",
    `Read the text and answer the question. Then justify why every other choice is wrong.\n\nText:\n"""${passage}"""\n\nQuestion: ${stem}\nChoices:\n${blind}\n\nReturn {"answer_index": 1-based integer, "confidence": 0-1, "second_defensible_index": integer or null, "rejections": {"1": "why wrong", ...}}`,
  );
  const intended = options.findIndex((o) => o.is_correct) + 1;
  const solverPicked = Number(solved.answer_index ?? 0);
  const second = solved.second_defensible_index;
  const solverOk = solverPicked === intended &&
    (second === null || second === undefined || Number(second) === intended);
  gates.solver = {
    pass: solverOk,
    reason: solverOk
      ? "independent solver selected the intended key with no second defensible answer"
      : `solver chose ${solverPicked} (intended ${intended})${second ? `, second defensible ${second}` : ""}`,
    solver_model: SOLVER_MODEL,
    confidence: solved.confidence ?? null,
  };

  /* (d) DISTRACTOR GATE */
  const lens = options.map((o) => (o.label ?? "").length);
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  const spread = Math.max(...lens) / Math.max(1, Math.min(...lens));
  const allRationales = options.every((o) => (o.rationale ?? "").trim().length > 10);
  const distractorOk = spread <= 2.5 && allRationales && mean > 1;
  gates.distractors = {
    pass: distractorOk,
    reason: distractorOk
      ? "homogeneous length/register, each distractor defensibly wrong"
      : `length spread ${spread.toFixed(2)}${allRationales ? "" : ", missing rationale"}`,
    length_spread: Number(spread.toFixed(2)),
  };

  /* (e) DUPLICATE GATE */
  const vector = await embed(`${stem}\n${passage.slice(0, 400)}`);
  let maxSim = 0;
  for (const e of existing) {
    const sim = cosine(vector, e.embedding);
    if (sim > maxSim) maxSim = sim;
  }
  const dupOk = maxSim < 0.9;
  gates.duplicate = {
    pass: dupOk,
    reason: dupOk ? `max cosine ${maxSim.toFixed(3)}` : `near-duplicate of an existing item (cosine ${maxSim.toFixed(3)})`,
    max_cosine: Number(maxSim.toFixed(3)),
  };

  /* (f) KEY-POSITION BALANCING */
  const target = keyPositionCounts.indexOf(Math.min(...keyPositionCounts.slice(0, options.length)));
  const keyIdx = options.findIndex((o) => o.is_correct);
  if (keyIdx !== target && target >= 0 && target < options.length) {
    const swapped = [...options];
    [swapped[keyIdx], swapped[target]] = [swapped[target], swapped[keyIdx]];
    options = swapped;
  }
  const finalKeyIdx = options.findIndex((o) => o.is_correct);
  gates.key_position = {
    pass: true,
    reason: `key placed at position ${finalKeyIdx + 1} to keep the bank uniform`,
    position: finalKeyIdx + 1,
  };

  /* (g) BIAS / SENSITIVITY */
  const haystack = `${passage} ${stem} ${options.map((o) => o.label).join(" ")}`.toLowerCase();
  const hits = SENSITIVE.filter((w) => haystack.includes(w));
  const screen = await chatJSON(
    AUTHOR_MODEL,
    "You are a test fairness and sensitivity reviewer. Reply with JSON only.",
    `Screen this grade 6-8 assessment content for bias, stereotyping, exclusionary cultural assumptions, or sensitive/upsetting topics.\n\n"""${haystack.slice(0, 3000)}"""\n\nReturn {"safe": true|false, "reason": string}`,
  );
  const biasOk = hits.length === 0 && screen.safe !== false;
  gates.bias = {
    pass: biasOk,
    reason: biasOk ? "no bias or sensitivity concerns" : (hits.length ? `flagged terms: ${hits.join(", ")}` : String(screen.reason ?? "flagged by reviewer")),
  };

  const allPass = Object.values(gates).every((g) => g.pass);

  /* ---- persist ---- */
  const cefr = WIDA_TO_CEFR[level];
  const { data: passageRow, error: pErr } = await svc
    .from("passages")
    .insert({
      skill,
      target_wida_level: level,
      cefr_level: cefr,
      topic,
      key_language_use: kluse,
      title: draft.title ?? topic,
      body: passage,
      word_count: wordCount(passage),
      readability_grade: fk,
      audio_status: skill === "listening" ? "pending" : "not_required",
      source_model: AUTHOR_MODEL,
      status: allPass ? "gated" : "draft",
    })
    .select("id")
    .single();
  if (pErr) throw pErr;

  const { data: itemRow, error: iErr } = await svc
    .from("items")
    .insert({
      skill,
      format: "mcq",
      stem,
      passage_id: passageRow.id,
      target_wida_level: level,
      cefr_level: cefr,
      topic,
      dok: Number(draft.dok ?? 2),
      source_model: AUTHOR_MODEL,
      prompt_version: PROMPT_VERSION,
      gate_results: gates,
      status: allPass ? "gated" : "draft",
    })
    .select("id")
    .single();
  if (iErr) throw iErr;

  await svc.from("item_options").insert(
    options.map((o, idx) => ({
      item_id: itemRow.id,
      label: o.label,
      is_correct: !!o.is_correct,
      position: idx + 1,
      rationale: o.rationale ?? null,
    })),
  );

  await svc.from("item_embeddings").insert({
    item_id: itemRow.id,
    skill,
    embedding: vector,
  });

  if (draft.can_do) {
    const { data: cd } = await svc
      .from("can_do_statements")
      .insert({ framework: "WIDA", skill_or_mode: skill, level: String(level), statement: draft.can_do })
      .select("id")
      .single();
    if (cd) await svc.from("item_can_do_map").insert({ item_id: itemRow.id, can_do_id: cd.id });
  }

  if (allPass) keyPositionCounts[finalKeyIdx] += 1;

  return { ok: allPass, item_id: itemRow.id, gates, reason: allPass ? "gated" : "failed gates" };
}

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const service = isServiceCall(req);
  if (!service) {
    const user = await getUser(req);
    if (!user) return json(req, { error: "Unauthorized" }, 401);
    if (!(await hasRole(user.id, "admin"))) return json(req, { error: "Forbidden" }, 403);
  }

  try {
    const body = await req.json();
    const skill = body.skill === "listening" ? "listening" : "reading";
    const level = Math.min(6, Math.max(1, Number(body.target_wida_level ?? 3)));
    const topic = String(body.topic ?? "school life");
    const kluse = ["Narrate", "Inform", "Explain", "Argue"].includes(body.key_language_use)
      ? body.key_language_use
      : "Inform";
    const count = Math.min(10, Math.max(1, Number(body.count ?? 3)));

    const svc = serviceClient();
    const { data: embRows } = await svc
      .from("item_embeddings")
      .select("item_id, embedding")
      .eq("skill", skill)
      .limit(500);
    const existing = (embRows ?? []).map((r: any) => ({
      item_id: r.item_id,
      embedding: r.embedding as number[],
    }));

    const { data: keyRows } = await svc
      .from("item_options")
      .select("position")
      .eq("is_correct", true)
      .limit(2000);
    const keyPositionCounts = [0, 0, 0, 0];
    for (const r of keyRows ?? []) {
      const p = Number((r as any).position) - 1;
      if (p >= 0 && p < 4) keyPositionCounts[p] += 1;
    }

    const results: any[] = [];
    for (let i = 0; i < count; i++) {
      try {
        const r = await runGauntlet(svc, skill, level, topic, kluse, existing, keyPositionCounts);
        results.push(r);
      } catch (e) {
        results.push({ ok: false, reason: `error: ${(e as Error).message}` });
      }
    }

    const passed = results.filter((r) => r.ok).length;
    console.log(`generate-items: generated ${results.length}, passed ${passed} (${skill} WIDA ${level} / ${topic})`);

    return json(req, {
      generated: results.length,
      passed,
      skill,
      target_wida_level: level,
      topic,
      results: results.map((r) => ({ item_id: r.item_id ?? null, ok: r.ok, reason: r.reason, gates: r.gates ?? null })),
    });
  } catch (e) {
    console.error("generate-items failed", e);
    return json(req, { error: (e as Error).message }, 500);
  }
});
