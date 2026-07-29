import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

import { corsFor, preflight } from "../_shared/cors.ts";
import { getUser, ownsSession } from "../_shared/auth.ts";

// ── CEFR ordered scale ──────────────────────────────────────────────
const CEFR_ORDER = [
  "Pre-A1", "A1", "A1+", "A2", "A2+",
  "B1", "B1+", "B2", "B2+",
  "C1", "C1+", "C2",
] as const;
type CefrLevel = (typeof CEFR_ORDER)[number];

function cefrIndex(level: string): number {
  const idx = CEFR_ORDER.indexOf(level as CefrLevel);
  return idx === -1 ? 0 : idx;
}

function cefrFromScore(score: number): CefrLevel {
  if (score >= 95) return "C2";
  if (score >= 88) return "C1+";
  if (score >= 80) return "C1";
  if (score >= 73) return "B2+";
  if (score >= 67) return "B2";
  if (score >= 60) return "B1+";
  if (score >= 53) return "B1";
  if (score >= 45) return "A2+";
  if (score >= 37) return "A2";
  if (score >= 28) return "A1+";
  if (score >= 18) return "A1";
  return "Pre-A1";
}

// ── Functional labels ───────────────────────────────────────────────
function functionalLabel(cefr: CefrLevel): string {
  const idx = cefrIndex(cefr);
  if (idx <= 1) return "Beginner";           // Pre-A1, A1
  if (idx <= 3) return "Elementary";          // A1+, A2
  if (idx <= 5) return "Intermediate";        // A2+, B1
  if (idx <= 7) return "Upper Intermediate";  // B1+, B2
  if (idx <= 9) return "Advanced";            // B2+, C1
  return "Proficient";                        // C1+, C2
}

// ── Confidence band ─────────────────────────────────────────────────
function confidenceBand(sectionScores: number[]): string {
  if (sectionScores.length < 2) return "low";
  const mean = sectionScores.reduce((a, b) => a + b, 0) / sectionScores.length;
  const variance = sectionScores.reduce((a, b) => a + (b - mean) ** 2, 0) / sectionScores.length;
  const stdDev = Math.sqrt(variance);
  // Low spread = high confidence; high spread = low confidence
  if (stdDev <= 8) return "high";
  if (stdDev <= 15) return "medium";
  return "low";
}

// ── Floor rule: overall can't exceed weakest section by more than 1 CEFR band ──
function applyFloorRule(
  overallCefr: CefrLevel,
  sectionCefrs: CefrLevel[]
): CefrLevel {
  if (sectionCefrs.length === 0) return overallCefr;
  const minIdx = Math.min(...sectionCefrs.map(cefrIndex));
  const overallIdx = cefrIndex(overallCefr);
  // Cap: overall can be at most 1 level above the weakest section
  const maxAllowed = minIdx + 1;
  if (overallIdx > maxAllowed) {
    return CEFR_ORDER[maxAllowed];
  }
  return overallCefr;
}

// ── Retake recommendation ───────────────────────────────────────────
function shouldRecommendRetake(sectionScores: number[], confidence: string): boolean {
  if (confidence === "low") return true;
  // If any section is drastically lower than others (>25pt gap)
  if (sectionScores.length >= 2) {
    const max = Math.max(...sectionScores);
    const min = Math.min(...sectionScores);
    if (max - min > 25) return true;
  }
  return false;
}

// ── Strengths / next-steps generator ────────────────────────────────
interface SectionDetail {
  type: string;
  score: number;
  cefr: CefrLevel;
}

function generateStrengths(sections: SectionDetail[]): string[] {
  const sorted = [...sections].sort((a, b) => b.score - a.score);
  const strengths: string[] = [];
  if (sorted.length > 0) {
    strengths.push(`Strongest skill: ${sorted[0].type} (${sorted[0].cefr})`);
  }
  for (const s of sorted) {
    if (s.score >= 80) strengths.push(`${s.type}: Advanced-level performance`);
    else if (s.score >= 60) strengths.push(`${s.type}: Solid intermediate competence`);
  }
  return strengths.length > 0 ? strengths : ["Completed all test sections"];
}

function generateNextSteps(sections: SectionDetail[]): string[] {
  const sorted = [...sections].sort((a, b) => a.score - b.score);
  const steps: string[] = [];
  for (const s of sorted) {
    if (s.score < 40) {
      steps.push(`Focus on ${s.type}: currently at ${s.cefr}, needs foundational practice`);
    } else if (s.score < 60) {
      steps.push(`Improve ${s.type}: strengthen from ${s.cefr} with targeted exercises`);
    }
  }
  if (steps.length === 0) steps.push("Continue practicing all skills to maintain proficiency");
  return steps;
}

// ── Section weights ─────────────────────────────────────────────────
const SECTION_WEIGHTS: Record<string, number> = {
  reading: 0.25,
  listening: 0.25,
  writing: 0.30,
  speaking: 0.20,
};

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const corsHeaders = corsFor(req);

  try {
    const user = await getUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const owns = await ownsSession(user.id, session_id);
    if (!owns.ok) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── 1. Verify session exists ────────────────────────────────────
    const { data: session, error: sessErr } = await supabase
      .from("test_sessions")
      .select("id, user_id, status")
      .eq("id", session_id)
      .single();

    if (sessErr || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 1b. Idempotency: never write a second overall score ─────────
    const { data: alreadyFinal } = await supabase
      .from("scores_overall")
      .select("*")
      .eq("session_id", session_id)
      .maybeSingle();

    if (alreadyFinal) {
      return new Response(JSON.stringify({
        success: true,
        alreadyFinalized: true,
        result: {
          overall_score: alreadyFinal.overall_score,
          overall_cefr: alreadyFinal.overall_cefr,
          functional_label: alreadyFinal.functional_label,
          confidence_band: alreadyFinal.confidence_band,
          retake_recommended: alreadyFinal.retake_recommended,
          strengths: alreadyFinal.strengths,
          next_steps: alreadyFinal.next_steps,
          sections: {
            reading: { score: alreadyFinal.reading_score, cefr: alreadyFinal.reading_cefr },
            listening: { score: alreadyFinal.listening_score, cefr: alreadyFinal.listening_cefr },
            writing: { score: alreadyFinal.writing_score, cefr: alreadyFinal.writing_cefr },
            speaking: { score: alreadyFinal.speaking_score, cefr: alreadyFinal.speaking_cefr },
          },
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── 2. Fetch all completed sections + their scores ──────────────

    const { data: sections } = await supabase
      .from("test_sections")
      .select("id, section_type, status")
      .eq("session_id", session_id);

    if (!sections || sections.length === 0) {
      return new Response(JSON.stringify({ error: "No sections found for session" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sectionIds = sections.map((s) => s.id);

    // Get the best (adjudication > audit > primary) score per section
    const { data: allScores } = await supabase
      .from("scores_section")
      .select("section_id, weighted_score, cefr_level, pass_type, confidence")
      .in("section_id", sectionIds)
      .order("created_at", { ascending: false });

    if (!allScores || allScores.length === 0) {
      return new Response(JSON.stringify({ error: "No scores found. Score sections before finalizing." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick best score per section (prefer adjudication > audit > primary)
    const passOrder: Record<string, number> = { adjudication: 3, audit: 2, primary: 1 };
    const bestScores = new Map<string, typeof allScores[0]>();
    for (const score of allScores) {
      const existing = bestScores.get(score.section_id);
      if (!existing || (passOrder[score.pass_type] || 0) > (passOrder[existing.pass_type] || 0)) {
        bestScores.set(score.section_id, score);
      }
    }

    // ── 3. Compute weighted overall score ───────────────────────────
    const sectionDetails: SectionDetail[] = [];
    let weightedSum = 0;
    let totalWeight = 0;
    const sectionScoreValues: number[] = [];
    const sectionCefrs: CefrLevel[] = [];

    const resultByType: Record<string, { score: number | null; cefr: CefrLevel | null }> = {
      reading: { score: null, cefr: null },
      listening: { score: null, cefr: null },
      writing: { score: null, cefr: null },
      speaking: { score: null, cefr: null },
    };

    for (const section of sections) {
      const scoreRow = bestScores.get(section.id);
      if (!scoreRow || scoreRow.weighted_score == null) continue;

      const sType = section.section_type as string;
      const weight = SECTION_WEIGHTS[sType] || 0.25;
      const score = Number(scoreRow.weighted_score);
      const cefr = (scoreRow.cefr_level || cefrFromScore(score)) as CefrLevel;

      weightedSum += score * weight;
      totalWeight += weight;
      sectionScoreValues.push(score);
      sectionCefrs.push(cefr);
      sectionDetails.push({ type: sType, score, cefr });

      if (resultByType[sType]) {
        resultByType[sType] = { score, cefr };
      }
    }

    if (totalWeight === 0) {
      return new Response(JSON.stringify({ error: "No valid section scores" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const overallScore = Math.round((weightedSum / totalWeight) * 10) / 10;
    let overallCefr = cefrFromScore(overallScore);

    // ── 4. Apply floor rule ─────────────────────────────────────────
    overallCefr = applyFloorRule(overallCefr, sectionCefrs);

    // ── 5. Confidence band ──────────────────────────────────────────
    const confidence = confidenceBand(sectionScoreValues);

    // ── 6. Retake recommendation ────────────────────────────────────
    const retakeRecommended = shouldRecommendRetake(sectionScoreValues, confidence);

    // ── 7. Strengths & next steps ───────────────────────────────────
    const strengths = generateStrengths(sectionDetails);
    const nextSteps = generateNextSteps(sectionDetails);

    // ── 8. Functional label ─────────────────────────────────────────
    const label = functionalLabel(overallCefr);

    // ── 9. Insert into scores_overall ───────────────────────────────
    const overallRow = {
      session_id,
      overall_score: overallScore,
      overall_cefr: overallCefr,
      functional_label: label,
      confidence_band: confidence,
      retake_recommended: retakeRecommended,
      strengths,
      next_steps: nextSteps,
      reading_score: resultByType.reading.score,
      reading_cefr: resultByType.reading.cefr,
      listening_score: resultByType.listening.score,
      listening_cefr: resultByType.listening.cefr,
      writing_score: resultByType.writing.score,
      writing_cefr: resultByType.writing.cefr,
      speaking_score: resultByType.speaking.score,
      speaking_cefr: resultByType.speaking.cefr,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("scores_overall")
      .insert(overallRow)
      .select()
      .single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save overall score", details: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 10. Mark session as completed ───────────────────────────────
    await supabase
      .from("test_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", session_id);

    // ── 11. Log event ───────────────────────────────────────────────
    await supabase.from("event_logs").insert({
      event_type: "test_finalized",
      session_id,
      user_id: session.user_id,
      payload: {
        overall_score: overallScore,
        overall_cefr: overallCefr,
        confidence_band: confidence,
        floor_rule_applied: overallCefr !== cefrFromScore(overallScore),
        section_count: sectionDetails.length,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      result: {
        overall_score: overallScore,
        overall_cefr: overallCefr,
        functional_label: label,
        confidence_band: confidence,
        retake_recommended: retakeRecommended,
        strengths,
        next_steps: nextSteps,
        sections: resultByType,
        floor_rule_applied: overallCefr !== cefrFromScore(overallScore),
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Finalize error:", err);
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
