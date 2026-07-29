import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsFor, preflight } from '../_shared/cors.ts';
import { requireCaller } from '../_shared/auth.ts';



const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// Structured output tool schema for scoring
const SCORING_TOOL = {
  type: "function" as const,
  function: {
    name: "submit_writing_score",
    description: "Submit a structured CEFR writing assessment score",
    parameters: {
      type: "object",
      properties: {
        rubric_scores: {
          type: "object",
          properties: {
            task_completion: { type: "number", description: "0-5 scale" },
            coherence: { type: "number", description: "0-5 scale" },
            grammar: { type: "number", description: "0-5 scale" },
            vocabulary: { type: "number", description: "0-5 scale" },
            accuracy: { type: "number", description: "0-5 scale" },
            register: { type: "number", description: "0-5 scale" },
          },
          required: ["task_completion", "coherence", "grammar", "vocabulary", "accuracy", "register"],
          additionalProperties: false,
        },
        predicted_cefr: { type: "string", enum: ["Pre-A1","A1","A1+","A2","A2+","B1","B1+","B2","B2+","C1","C1+","C2"] },
        evidence_quotes: {
          type: "array",
          items: { type: "string" },
          description: "3-5 direct quotes from the response that support the scoring",
        },
        error_tags: {
          type: "array",
          items: { type: "string", enum: ["spelling","subject_verb_agreement","tense_error","article_error","word_order","run_on_sentence","fragment","wrong_word","missing_punctuation","capitalization","coherence_gap","off_topic","repetitive","too_short","register_mismatch"] },
        },
        confidence: { type: "number", description: "0.0-1.0 confidence in the assessment" },
        human_review_recommended: { type: "boolean" },
        fraud_flags: {
          type: "array",
          items: { type: "string", enum: ["ai_writing_suspicion","copy_paste_pattern","incoherent_quality_jump","off_topic"] },
        },
        feedback_strengths: { type: "array", items: { type: "string" }, description: "2-3 specific strengths" },
        feedback_improvements: { type: "array", items: { type: "string" }, description: "2-3 specific areas to improve" },
      },
      required: ["rubric_scores","predicted_cefr","evidence_quotes","error_tags","confidence","human_review_recommended","fraud_flags","feedback_strengths","feedback_improvements"],
      additionalProperties: false,
    },
  },
};

const SYSTEM_PROMPT = `You are a CEFR-certified English writing assessor. Score the writing response using the structured rubric tool.

RUBRIC (each trait 0-5):
- task_completion: Did the writer address the prompt fully? (0=off-topic, 5=sophisticated treatment)
- coherence: Is the text well-organized with logical flow? (0=no organization, 5=seamless transitions)
- grammar: How well-controlled are grammatical structures? (0=errors block comprehension, 5=near-native)
- vocabulary: Range and precision of vocabulary? (0=isolated words, 5=sophisticated/idiomatic)
- accuracy: Overall spelling, punctuation, morphology? (0=unintelligible, 5=virtually error-free)
- register: Appropriate formality for the task? (0=completely wrong register, 5=perfectly matched)

CEFR ANCHORS:
- Pre-A1/A1: Isolated words/phrases, very basic structures
- A2: Simple sentences, high-frequency vocabulary, basic connectors
- B1: Connected text, familiar topics, good basic control
- B2: Clear detailed text, complex structures, good range
- C1: Well-structured, sophisticated, flexible language use
- C2: Near-native precision, subtle nuance, exceptional range

SCORING RULES:
- Be strict but fair — score what is demonstrated, not what is missing
- evidence_quotes must be EXACT quotes from the response
- Set human_review_recommended=true if confidence < 0.7 or scores span 3+ CEFR levels across traits
- Flag ai_writing_suspicion if quality seems inconsistent with the overall level or unnaturally polished`;

async function callGemini(prompt: string, systemPrompt: string): Promise<any> {
  const response = await fetch(AI_GATEWAY, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      tools: [SCORING_TOOL],
      tool_choice: { type: "function", function: { name: "submit_writing_score" } },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 429) throw new Error('RATE_LIMITED');
    if (response.status === 402) throw new Error('CREDITS_EXHAUSTED');
    throw new Error(`AI gateway error ${response.status}: ${errText.substring(0, 200)}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error('No tool call in response');
  
  return JSON.parse(toolCall.function.arguments);
}

function computeWeightedScore(rubric: Record<string, number>): number {
  // Weighted: task_completion and coherence weighted higher
  const weights = { task_completion: 0.25, coherence: 0.20, grammar: 0.15, vocabulary: 0.15, accuracy: 0.15, register: 0.10 };
  let weighted = 0;
  for (const [key, weight] of Object.entries(weights)) {
    weighted += (rubric[key] || 0) * weight;
  }
  return Math.round((weighted / 5) * 100); // normalize to 0-100
}

function adjudicate(pass1: any, pass2: any): { finalScore: any; needsHumanReview: boolean } {
  const traits = ['task_completion', 'coherence', 'grammar', 'vocabulary', 'accuracy', 'register'];
  const avgRubric: Record<string, number> = {};
  let maxDiff = 0;

  for (const t of traits) {
    const s1 = pass1.rubric_scores[t] ?? 0;
    const s2 = pass2.rubric_scores[t] ?? 0;
    avgRubric[t] = Math.round(((s1 + s2) / 2) * 10) / 10;
    maxDiff = Math.max(maxDiff, Math.abs(s1 - s2));
  }

  // If any trait differs by 2+ points, flag for review
  const needsHumanReview = maxDiff >= 2 || pass1.human_review_recommended || pass2.human_review_recommended;

  // Use higher confidence pass as primary, average the rubric
  const primary = pass1.confidence >= pass2.confidence ? pass1 : pass2;
  
  return {
    finalScore: {
      rubric_scores: avgRubric,
      predicted_cefr: primary.predicted_cefr,
      evidence_quotes: [...new Set([...pass1.evidence_quotes, ...pass2.evidence_quotes])].slice(0, 5),
      error_tags: [...new Set([...pass1.error_tags, ...pass2.error_tags])],
      confidence: Math.round(((pass1.confidence + pass2.confidence) / 2) * 100) / 100,
      human_review_recommended: needsHumanReview,
      fraud_flags: [...new Set([...pass1.fraud_flags, ...pass2.fraud_flags])],
      feedback_strengths: primary.feedback_strengths,
      feedback_improvements: primary.feedback_improvements,
      scoring_method: 'dual_pass_adjudicated',
      pass1_cefr: pass1.predicted_cefr,
      pass2_cefr: pass2.predicted_cefr,
      max_trait_disagreement: maxDiff,
    },
    needsHumanReview,
  };
}

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const corsHeaders = corsFor(req);

  const caller = await requireCaller(req);
  if (!caller) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { section_id, prompt_id, response_text, prompt_text, cefr_target, word_count, copy_paste_events } = await req.json();

    if (!response_text || !section_id || !prompt_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields: section_id, prompt_id, response_text' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const actualWordCount = word_count || response_text.trim().split(/\s+/).length;
    console.log(`📝 Scoring writing: ${actualWordCount} words, target ${cefr_target || 'B1'}, section ${section_id}`);

    // Build the scoring prompt
    const scoringPrompt = `WRITING PROMPT: "${prompt_text || 'Not provided'}"
TARGET CEFR LEVEL: ${cefr_target || 'B1'}
WORD COUNT: ${actualWordCount}
COPY-PASTE EVENTS DETECTED: ${copy_paste_events || 0}

STUDENT RESPONSE:
"""
${response_text}
"""

Score this response using the submit_writing_score tool.`;

    // === DUAL PASS SCORING ===
    console.log('🔄 Pass 1: Primary scoring...');
    const pass1 = await callGemini(scoringPrompt, SYSTEM_PROMPT);
    console.log(`  Pass 1: ${pass1.predicted_cefr}, confidence=${pass1.confidence}`);

    console.log('🔄 Pass 2: Audit scoring...');
    const auditSystem = SYSTEM_PROMPT + '\n\nIMPORTANT: This is an independent audit pass. Score strictly based on evidence. Do not be lenient.';
    const pass2 = await callGemini(scoringPrompt, auditSystem);
    console.log(`  Pass 2: ${pass2.predicted_cefr}, confidence=${pass2.confidence}`);

    // === ADJUDICATE ===
    const { finalScore, needsHumanReview } = adjudicate(pass1, pass2);
    const weightedScore = computeWeightedScore(finalScore.rubric_scores);
    console.log(`✅ Final: ${finalScore.predicted_cefr}, weighted=${weightedScore}, review=${needsHumanReview}`);

    // === STORE IN DATABASE ===
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Store primary score
    const { error: scoreErr } = await supabase.from('scores_section').insert({
      section_id,
      pass_type: 'primary',
      raw_score: weightedScore,
      weighted_score: weightedScore,
      cefr_level: finalScore.predicted_cefr,
      rubric_scores: finalScore.rubric_scores,
      evidence: { quotes: finalScore.evidence_quotes, strengths: finalScore.feedback_strengths, improvements: finalScore.feedback_improvements },
      error_tags: finalScore.error_tags,
      confidence: finalScore.confidence,
      human_review_recommended: needsHumanReview,
      model_used: 'google/gemini-2.5-flash',
    });
    if (scoreErr) console.error('Score insert error:', scoreErr);

    // Store audit record if passes disagreed
    if (finalScore.max_trait_disagreement >= 1) {
      await supabase.from('score_audits').insert({
        section_score_id: section_id, // will link properly once we have the score ID
        reviewer_type: 'ai_dual_pass',
        original_cefr: pass1.predicted_cefr,
        revised_cefr: finalScore.predicted_cefr,
        rationale: `Dual-pass adjudication. Pass1=${pass1.predicted_cefr}(${pass1.confidence}), Pass2=${pass2.predicted_cefr}(${pass2.confidence}). Max trait disagreement=${finalScore.max_trait_disagreement}.`,
      });
    }

    // Log fraud flags
    if (finalScore.fraud_flags.length > 0 || (copy_paste_events && copy_paste_events > 3)) {
      const flags = [...finalScore.fraud_flags];
      if (copy_paste_events > 3) flags.push('copy_paste');
      for (const flag of flags) {
        const flagType = flag === 'copy_paste' ? 'copy_paste' : 'ai_writing_suspicion';
        await supabase.from('fraud_flags').insert({
          session_id: section_id,
          flag_type: flagType,
          severity: flag === 'ai_writing_suspicion' ? 'high' : 'medium',
          details: { source: 'score-writing', flag, copy_paste_events },
        });
      }
    }

    return new Response(JSON.stringify({
      score: weightedScore,
      cefr_level: finalScore.predicted_cefr,
      rubric_scores: finalScore.rubric_scores,
      feedback: {
        strengths: finalScore.feedback_strengths,
        improvements: finalScore.feedback_improvements,
      },
      evidence_quotes: finalScore.evidence_quotes,
      error_tags: finalScore.error_tags,
      confidence: finalScore.confidence,
      human_review_recommended: needsHumanReview,
      fraud_flags: finalScore.fraud_flags,
      scoring_method: finalScore.scoring_method,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ score-writing error:', error);
    const message = error.message || 'Unknown error';
    if (message === 'RATE_LIMITED') {
      return new Response(JSON.stringify({ error: 'Rate limited, please try again later.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (message === 'CREDITS_EXHAUSTED') {
      return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
