import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

const SCORING_TOOL = {
  type: "function" as const,
  function: {
    name: "submit_speaking_score",
    description: "Submit a structured CEFR speaking assessment score based on audio transcription analysis",
    parameters: {
      type: "object",
      properties: {
        rubric_scores: {
          type: "object",
          properties: {
            intelligibility: { type: "number", description: "0-5: How easily understood is the speaker?" },
            fluency: { type: "number", description: "0-5: Flow, pace, hesitation patterns" },
            lexical_range: { type: "number", description: "0-5: Vocabulary variety and precision" },
            grammatical_control: { type: "number", description: "0-5: Accuracy and complexity of structures" },
            relevance: { type: "number", description: "0-5: How well the response addresses the prompt" },
            discourse_development: { type: "number", description: "0-5: Length, depth, coherence of ideas" },
          },
          required: ["intelligibility", "fluency", "lexical_range", "grammatical_control", "relevance", "discourse_development"],
          additionalProperties: false,
        },
        predicted_cefr: { type: "string", enum: ["Pre-A1","A1","A1+","A2","A2+","B1","B1+","B2","B2+","C1","C1+","C2"] },
        evidence_quotes: {
          type: "array",
          items: { type: "string" },
          description: "3-5 direct quotes from the transcription that support the scoring",
        },
        error_tags: {
          type: "array",
          items: { type: "string", enum: [
            "pronunciation_error","word_stress_error","intonation_flat","excessive_pausing",
            "false_starts","self_correction","filler_overuse","limited_vocabulary",
            "grammar_error","tense_confusion","article_error","word_order_error",
            "off_topic","too_short","incomprehensible","code_switching","repetitive"
          ]},
        },
        fluency_metrics: {
          type: "object",
          properties: {
            estimated_words_per_minute: { type: "number" },
            pause_frequency: { type: "string", enum: ["none","few","moderate","frequent","excessive"] },
            self_correction_count: { type: "integer" },
            filler_word_count: { type: "integer" },
          },
          required: ["estimated_words_per_minute", "pause_frequency", "self_correction_count", "filler_word_count"],
          additionalProperties: false,
        },
        confidence: { type: "number", description: "0.0-1.0 confidence in the assessment" },
        human_review_recommended: { type: "boolean" },
        fraud_flags: {
          type: "array",
          items: { type: "string", enum: ["voice_mismatch","pre_recorded_suspicion","ai_generated_speech","reading_not_speaking","background_voice"] },
        },
        feedback_strengths: { type: "array", items: { type: "string" }, description: "2-3 specific strengths" },
        feedback_improvements: { type: "array", items: { type: "string" }, description: "2-3 specific areas to improve" },
      },
      required: ["rubric_scores","predicted_cefr","evidence_quotes","error_tags","fluency_metrics","confidence","human_review_recommended","fraud_flags","feedback_strengths","feedback_improvements"],
      additionalProperties: false,
    },
  },
};

const SYSTEM_PROMPT = `You are a CEFR-certified English speaking assessor. Score the speaking response using the submit_speaking_score tool.

You will receive a transcription of the speaker's audio response. Analyze it for spoken language proficiency.

RUBRIC (each trait 0-5):
- intelligibility: Can the speaker be easily understood? (0=incomprehensible, 5=effortlessly clear)
- fluency: Flow and pace of speech. (0=constant pausing/halting, 5=smooth natural flow)
- lexical_range: Vocabulary variety and precision. (0=isolated basic words, 5=sophisticated/idiomatic)
- grammatical_control: Accuracy of grammar in speech. (0=no control, 5=consistent complex structures)
- relevance: Does the response address the prompt? (0=completely off-topic, 5=thorough treatment)
- discourse_development: Depth, length, coherence. (0=single word/phrase, 5=extended well-structured discourse)

CEFR SPEAKING ANCHORS:
- Pre-A1/A1: Isolated words, memorized phrases, very slow with long pauses
- A2: Simple phrases, basic descriptions, frequent hesitation but comprehensible
- B1: Connected speech on familiar topics, some fluency, can explain opinions
- B2: Clear detailed speech, can argue and discuss, good fluency with occasional errors
- C1: Fluent spontaneous speech, flexible language, rare searching for words
- C2: Near-native fluency, precise and nuanced, effortless expression

IMPORTANT SCORING RULES:
- Pronunciation/accent is only ONE sub-factor of intelligibility — do NOT penalize accents
- Weight intelligibility > fluency > lexical/grammatical > relevance > discourse
- evidence_quotes must be EXACT quotes from the transcription
- Estimate words_per_minute from transcription length and task duration
- Flag voice_mismatch if quality seems inconsistent across segments
- Flag reading_not_speaking if the response sounds like it was read from a prepared text (for non-read-aloud tasks)`;

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
      tool_choice: { type: "function", function: { name: "submit_speaking_score" } },
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
  const weights = {
    intelligibility: 0.25,
    fluency: 0.20,
    lexical_range: 0.15,
    grammatical_control: 0.15,
    relevance: 0.15,
    discourse_development: 0.10,
  };
  let weighted = 0;
  for (const [key, weight] of Object.entries(weights)) {
    weighted += (rubric[key] || 0) * weight;
  }
  return Math.round((weighted / 5) * 100);
}

function adjudicate(pass1: any, pass2: any): { finalScore: any; needsHumanReview: boolean } {
  const traits = ['intelligibility', 'fluency', 'lexical_range', 'grammatical_control', 'relevance', 'discourse_development'];
  const avgRubric: Record<string, number> = {};
  let maxDiff = 0;

  for (const t of traits) {
    const s1 = pass1.rubric_scores[t] ?? 0;
    const s2 = pass2.rubric_scores[t] ?? 0;
    avgRubric[t] = Math.round(((s1 + s2) / 2) * 10) / 10;
    maxDiff = Math.max(maxDiff, Math.abs(s1 - s2));
  }

  const needsHumanReview = maxDiff >= 2 || pass1.human_review_recommended || pass2.human_review_recommended;
  const primary = pass1.confidence >= pass2.confidence ? pass1 : pass2;

  // Average fluency metrics
  const avgFluency = {
    estimated_words_per_minute: Math.round((pass1.fluency_metrics.estimated_words_per_minute + pass2.fluency_metrics.estimated_words_per_minute) / 2),
    pause_frequency: primary.fluency_metrics.pause_frequency,
    self_correction_count: Math.round((pass1.fluency_metrics.self_correction_count + pass2.fluency_metrics.self_correction_count) / 2),
    filler_word_count: Math.round((pass1.fluency_metrics.filler_word_count + pass2.fluency_metrics.filler_word_count) / 2),
  };

  return {
    finalScore: {
      rubric_scores: avgRubric,
      predicted_cefr: primary.predicted_cefr,
      evidence_quotes: [...new Set([...pass1.evidence_quotes, ...pass2.evidence_quotes])].slice(0, 5),
      error_tags: [...new Set([...pass1.error_tags, ...pass2.error_tags])],
      fluency_metrics: avgFluency,
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { section_id, prompt_id, prompt_text, prompt_type, cefr_target, transcription, duration_ms, audio_storage_path } = await req.json();

    if (!transcription || !section_id || !prompt_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields: section_id, prompt_id, transcription' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const durationSec = duration_ms ? Math.round(duration_ms / 1000) : null;
    const wordCount = transcription.trim().split(/\s+/).length;
    console.log(`🎤 Scoring speaking: ${wordCount} words, ${durationSec}s, target ${cefr_target || 'B1'}, type=${prompt_type}`);

    const scoringPrompt = `SPEAKING PROMPT: "${prompt_text || 'Not provided'}"
PROMPT TYPE: ${prompt_type || 'short_response'}
TARGET CEFR LEVEL: ${cefr_target || 'B1'}
DURATION: ${durationSec ? durationSec + ' seconds' : 'unknown'}
WORD COUNT: ${wordCount}

TRANSCRIPTION OF SPEAKER'S AUDIO:
"""
${transcription}
"""

${prompt_type === 'read_aloud' ? 'NOTE: This is a read-aloud task. Focus on intelligibility and fluency. Do NOT flag reading_not_speaking for this task type.' : ''}

Score this speaking response using the submit_speaking_score tool.`;

    // === DUAL PASS ===
    console.log('🔄 Pass 1: Primary scoring...');
    const pass1 = await callGemini(scoringPrompt, SYSTEM_PROMPT);
    console.log(`  Pass 1: ${pass1.predicted_cefr}, confidence=${pass1.confidence}`);

    console.log('🔄 Pass 2: Audit scoring...');
    const auditSystem = SYSTEM_PROMPT + '\n\nIMPORTANT: This is an independent audit pass. Score strictly based on evidence in the transcription. Do not be lenient.';
    const pass2 = await callGemini(scoringPrompt, auditSystem);
    console.log(`  Pass 2: ${pass2.predicted_cefr}, confidence=${pass2.confidence}`);

    // === ADJUDICATE ===
    const { finalScore, needsHumanReview } = adjudicate(pass1, pass2);
    const weightedScore = computeWeightedScore(finalScore.rubric_scores);
    console.log(`✅ Final: ${finalScore.predicted_cefr}, weighted=${weightedScore}, review=${needsHumanReview}`);

    // === STORE ===
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: scoreErr } = await supabase.from('scores_section').insert({
      section_id,
      pass_type: 'primary',
      raw_score: weightedScore,
      weighted_score: weightedScore,
      cefr_level: finalScore.predicted_cefr,
      rubric_scores: finalScore.rubric_scores,
      evidence: {
        quotes: finalScore.evidence_quotes,
        strengths: finalScore.feedback_strengths,
        improvements: finalScore.feedback_improvements,
        fluency_metrics: finalScore.fluency_metrics,
      },
      error_tags: finalScore.error_tags,
      confidence: finalScore.confidence,
      human_review_recommended: needsHumanReview,
      model_used: 'google/gemini-2.5-flash',
    });
    if (scoreErr) console.error('Score insert error:', scoreErr);

    if (finalScore.max_trait_disagreement >= 1) {
      await supabase.from('score_audits').insert({
        section_score_id: section_id,
        reviewer_type: 'ai_dual_pass',
        original_cefr: pass1.predicted_cefr,
        revised_cefr: finalScore.predicted_cefr,
        rationale: `Dual-pass speaking adjudication. Pass1=${pass1.predicted_cefr}(${pass1.confidence}), Pass2=${pass2.predicted_cefr}(${pass2.confidence}). Max disagreement=${finalScore.max_trait_disagreement}.`,
      });
    }

    if (finalScore.fraud_flags.length > 0) {
      for (const flag of finalScore.fraud_flags) {
        await supabase.from('fraud_flags').insert({
          session_id: section_id,
          flag_type: flag === 'voice_mismatch' ? 'voice_mismatch' : 'other',
          severity: 'medium',
          details: { source: 'score-speaking', flag, prompt_type },
        });
      }
    }

    return new Response(JSON.stringify({
      score: weightedScore,
      cefr_level: finalScore.predicted_cefr,
      rubric_scores: finalScore.rubric_scores,
      fluency_metrics: finalScore.fluency_metrics,
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
    console.error('❌ score-speaking error:', error);
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
