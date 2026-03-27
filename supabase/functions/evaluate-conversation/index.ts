import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userMessages, duration, targetLanguage = 'English' } = await req.json();
    
    console.log('🗣️ Evaluating conversation:', {
      messageCount: userMessages?.length,
      duration,
      targetLanguage
    });

    if (!userMessages || userMessages.length === 0) {
      throw new Error('No user messages provided');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Combine all user messages into conversation text
    const conversationText = userMessages.map((msg: any) => msg.content).join('\n\n');
    const messageCount = userMessages.length;
    const avgMessageLength = Math.round(conversationText.length / messageCount);
    const totalWords = conversationText.split(/\s+/).length;

    console.log('📊 Conversation stats:', {
      totalCharacters: conversationText.length,
      messageCount,
      avgMessageLength,
      totalWords,
      duration
    });

    // Step 1: Linguistic Evaluation (similar to writing rubric)
    const evaluationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert ${targetLanguage} language assessor evaluating conversational fluency. 
Analyze the user's conversation contributions ONLY (ignore AI responses) for:

1. **Fluency & Coherence** (0-5): Natural flow, connected ideas, conversational appropriateness
2. **Grammar & Syntax** (0-5): Grammatical accuracy, sentence structure variety
3. **Vocabulary & Expression** (0-5): Range, precision, idiomatic usage
4. **Comprehension & Responsiveness** (0-5): Understanding questions, relevant responses
5. **Engagement** (0-5): Sustained participation, elaboration beyond minimal answers

Provide scores and brief justification for each trait. Be strict but fair.`
          },
          {
            role: 'user',
            content: `Evaluate this conversation (user's ${messageCount} messages over ${Math.floor(duration / 60)}m ${duration % 60}s):

${conversationText}

Provide JSON format:
{
  "fluency": { "score": 0-5, "notes": "brief justification" },
  "grammar": { "score": 0-5, "notes": "brief justification" },
  "vocabulary": { "score": 0-5, "notes": "brief justification" },
  "comprehension": { "score": 0-5, "notes": "brief justification" },
  "engagement": { "score": 0-5, "notes": "brief justification" },
  "recommendedCEFR": "A1/A2/B1/B2/C1/C2"
}`
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      }),
    });

    if (!evaluationResponse.ok) {
      const errorText = await evaluationResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${evaluationResponse.status}`);
    }

    const evaluationData = await evaluationResponse.json();
    const evaluationText = evaluationData.choices[0].message.content;
    
    console.log('📝 Raw evaluation:', evaluationText);

    // Parse the evaluation
    let evaluation;
    try {
      const jsonMatch = evaluationText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse evaluation:', evaluationText);
      throw new Error('Failed to parse evaluation results');
    }

    // Step 2: Calculate base linguistic score (0-100)
    const traitScores = [
      evaluation.fluency?.score || 0,
      evaluation.grammar?.score || 0,
      evaluation.vocabulary?.score || 0,
      evaluation.comprehension?.score || 0,
      evaluation.engagement?.score || 0
    ];
    
    const avgTraitScore = traitScores.reduce((a, b) => a + b, 0) / traitScores.length;
    const linguisticScore = (avgTraitScore / 5) * 100; // Convert 0-5 to 0-100

    console.log('📊 Trait scores:', traitScores, '→ Avg:', avgTraitScore.toFixed(2), '→', linguisticScore.toFixed(1));

    // Step 3: Engagement adjustment based on duration + message count
    // Minimum expectations: 2 minutes, 8 meaningful exchanges
    const durationRatio = Math.min(duration / 120, 1.0); // 0-1 based on 2min target
    const messageRatio = Math.min(messageCount / 8, 1.0); // 0-1 based on 8 messages
    const engagementFactor = (durationRatio * 0.5) + (messageRatio * 0.5); // Combined 0-1
    
    console.log('⏱️ Engagement:', {
      durationRatio: durationRatio.toFixed(2),
      messageRatio: messageRatio.toFixed(2),
      engagementFactor: engagementFactor.toFixed(2)
    });

    // Step 4: Final score calculation
    // 85% linguistic quality, 15% engagement factor
    const rawScore = (linguisticScore * 0.85) + (engagementFactor * 100 * 0.15);
    
    // Penalize if conversation is too short (< 1 minute)
    let finalScore = rawScore;
    if (duration < 60) {
      const shortnessPenalty = (60 - duration) / 60 * 20; // Up to 20 point penalty
      finalScore = Math.max(rawScore - shortnessPenalty, 0);
      console.log(`⚠️ Short conversation penalty: -${shortnessPenalty.toFixed(1)} points`);
    }

    finalScore = Math.round(Math.max(0, Math.min(100, finalScore)));

    console.log('✅ Final conversation score:', finalScore);

    return new Response(JSON.stringify({
      score: finalScore,
      traits: {
        fluency: evaluation.fluency,
        grammar: evaluation.grammar,
        vocabulary: evaluation.vocabulary,
        comprehension: evaluation.comprehension,
        engagement: evaluation.engagement
      },
      stats: {
        duration,
        messageCount,
        avgMessageLength,
        totalWords,
        engagementFactor: parseFloat(engagementFactor.toFixed(2))
      },
      recommendedCEFR: evaluation.recommendedCEFR,
      linguisticScore: Math.round(linguisticScore),
      engagementBonus: Math.round((engagementFactor * 100 * 0.15))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error evaluating conversation:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      score: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
