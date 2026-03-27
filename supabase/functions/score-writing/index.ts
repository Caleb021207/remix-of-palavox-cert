import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Concise CEFR-anchored rubric (4 traits × 0-5 scale)
const RUBRIC_ANCHORS = {
  taskFulfillment: {
    0: "No attempt / completely off-topic",
    1: "A2: Simple personal info, minimal detail",
    2: "A2+: Basic info with some elaboration",
    3: "B1: Adequate detail, covers main points",
    4: "B2: Well-developed, organized response",
    5: "C1: Sophisticated, nuanced treatment"
  },
  range: {
    0: "Isolated words only",
    1: "A2: High-frequency vocabulary, simple structures",
    2: "A2+/B1: Expanding vocabulary, some variety",
    3: "B1/B2: Good range of vocabulary and structures",
    4: "B2/C1: Varied, precise vocabulary",
    5: "C1+: Sophisticated, idiomatic language"
  },
  accuracy: {
    0: "Errors block comprehension",
    1: "A2: Frequent errors, basic structures mostly correct",
    2: "A2+/B1: Errors present but meaning clear",
    3: "B1/B2: Good control, occasional errors",
    4: "B2/C1: Mostly error-free",
    5: "C1+: Near-native accuracy"
  },
  cohesion: {
    0: "No organization",
    1: "A2: Simple connectors (and, but)",
    2: "A2+/B1: Basic linking (because, so, first, then)",
    3: "B1/B2: Clear paragraphing, cohesive devices",
    4: "B2/C1: Well-organized, varied connectors",
    5: "C1+: Seamless flow, sophisticated transitions"
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { response, validatorResult, targetLevel = 'B1' } = await req.json();
    
    console.log('📝 Scoring writing response...', { 
      wordCount: validatorResult.wordCount,
      targetLevel,
      validationPassed: validatorResult.isValid
    });
    
    // If validation failed, return early with penalties
    if (!validatorResult.isValid) {
      let penaltyScore = 20;
      let penaltyReason = 'Response too short';
      
      if (validatorResult.flags.wrongLanguage) {
        penaltyScore = 10;
        penaltyReason = `Wrong language detected: ${validatorResult.language}`;
      } else if (validatorResult.flags.mixed) {
        penaltyScore = 15;
        penaltyReason = 'Mixed languages detected';
      }
      
      console.log(`❌ Validation failed: ${penaltyReason}, score: ${penaltyScore}%`);
      
      return new Response(JSON.stringify({
        score: penaltyScore,
        traits: { taskFulfillment: 0, range: 0, accuracy: 0, cohesion: 0 },
        notes: {
          overall: `Validation failed: ${penaltyReason}`
        },
        recommendedCEFR: 'A1',
        lengthAdjustment: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Calculate length-based adjustment (gentle glide curve)
    const wordCount = validatorResult.wordCount;
    const targets: Record<string, number> = { A2: 60, B1: 120, B2: 180, C1: 220 };
    const target = targets[targetLevel] || 120;
    const ratio = wordCount / target;
    
    let lengthAdjustment = 0;
    if (ratio < 0.4) lengthAdjustment = -15;
    else if (ratio < 0.6) lengthAdjustment = -10;
    else if (ratio < 0.8) lengthAdjustment = -5;
    // else 0 (full credit)

    console.log(`📏 Length: ${wordCount}/${target} words (${(ratio*100).toFixed(0)}%), adjustment: ${lengthAdjustment}%`);

    const systemPrompt = `You are a CEFR-certified writing assessor. Rate the response on 4 traits (0-5 each) using the provided CEFR anchors. Return ONLY valid JSON.

Rubric:
${JSON.stringify(RUBRIC_ANCHORS, null, 2)}

Guidelines:
- Rate each trait 0-5 based on CEFR anchors above
- Provide brief notes (≤80 chars per trait)
- Average trait score × 20 = base score (0-100)
- Length adjustment already calculated: ${lengthAdjustment}%
- Focus on demonstrated proficiency, not native-like perfection`;

    const userPrompt = `Response (${wordCount} words, target ${target}):
"${response}"

Return JSON (no markdown):
{
  "traits": {
    "taskFulfillment": 0-5,
    "range": 0-5,
    "accuracy": 0-5,
    "cohesion": 0-5
  },
  "notes": {
    "taskFulfillment": "Brief note",
    "range": "Brief note",
    "accuracy": "Brief note",
    "cohesion": "Brief note"
  },
  "recommendedCEFR": "A2|B1|B2|C1"
}`;

    const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 800,
        response_format: { type: "json_object" },
      }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('❌ OpenAI API error:', apiResponse.status, errorText);
      throw new Error(`OpenAI API error: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    console.log('🤖 OpenAI response received:', { 
      finishReason: data.choices[0].finish_reason,
      contentLength: data.choices[0].message.content?.length 
    });
    
    const content = data.choices[0].message.content;
    if (!content || content.trim().length === 0) {
      throw new Error('OpenAI returned empty content');
    }
    
    const cleaned = content.replace(/```json\s*|\s*```/g, '').trim();
    console.log('📋 Parsing JSON response (length:', cleaned.length, ')');
    
    let result;
    try {
      result = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('❌ JSON parse error. Raw content:', cleaned.substring(0, 500));
      throw new Error(`Failed to parse OpenAI response: ${parseError.message}`);
    }
    
    // Calculate score: average of 4 traits × 20 + length adjustment
    const traitAvg = (
      result.traits.taskFulfillment + 
      result.traits.range + 
      result.traits.accuracy + 
      result.traits.cohesion
    ) / 4;
    const baseScore = traitAvg * 20; // Convert 0-5 to 0-100
    const finalScore = Math.max(0, Math.min(100, baseScore + lengthAdjustment));
    
    console.log('✅ Scoring complete:', {
      traits: result.traits,
      traitAvg: traitAvg.toFixed(2),
      baseScore: baseScore.toFixed(1),
      lengthAdjustment,
      finalScore: finalScore.toFixed(1)
    });
    
    return new Response(JSON.stringify({
      score: Math.round(finalScore),
      traits: result.traits,
      notes: result.notes,
      recommendedCEFR: result.recommendedCEFR,
      lengthAdjustment
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Scoring error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
