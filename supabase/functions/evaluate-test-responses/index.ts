
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { calculateLevel, evaluateMultipleChoiceAnswers } from './scoring.ts';
import { evaluateWithAI } from './aiEvaluation.ts';
import { evaluatePronunciation } from './pronunciationEvaluation.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phase, responses, content, targetLanguage } = await req.json();
    
    console.log(`🎯 Evaluating ${phase} responses for: ${targetLanguage}`);
    console.log('📋 Request details:', {
      phase,
      responseKeys: Object.keys(responses || {}),
      contentType: Array.isArray(content) ? 'array' : typeof content,
      contentLength: Array.isArray(content) ? content.length : 'N/A'
    });

    let score = 0;
    let feedback = {};

    if (phase === 'comprehension') {
      // Comprehension phase combines reading and listening
      // The client already calculates the combined score
      // This handles the case where we might evaluate reading/listening separately
      score = evaluateMultipleChoiceAnswers(content, responses);
      
      feedback = {
        grammar: `Comprehension assessment completed with ${score.toFixed(1)}% accuracy`,
        vocabulary: 'Reading and listening comprehension evaluated',
        coherence: 'Understanding of context and main ideas assessed across modalities',
        overall: `Your comprehension demonstrates ${score >= 70 ? 'strong' : score >= 46 ? 'developing' : 'foundational'} skills`
      };
      
    } else if (phase === 'reading' || phase === 'listening') {
      // Calculate multiple choice score
      score = evaluateMultipleChoiceAnswers(content, responses);
      
      feedback = {
        grammar: `Comprehension assessment completed with ${score.toFixed(1)}% accuracy`,
        vocabulary: phase === 'reading' ? 'Reading comprehension evaluated' : 'Listening comprehension evaluated',
        coherence: 'Understanding of context and main ideas assessed',
        overall: `Your ${phase} comprehension demonstrates ${score >= 70 ? 'strong' : score >= 46 ? 'developing' : 'foundational'} skills`
      };
      
    } else if (phase === 'writing' || phase === 'speaking' || phase === 'conversation') {
      const result = await evaluateWithAI(phase, responses, targetLanguage, openAIApiKey);
      score = result.score;
      feedback = result.feedback;
      
    } else if (phase === 'pronunciation') {
      const result = evaluatePronunciation(responses);
      score = result.score;
      feedback = result.feedback;
    }

    const levels = calculateLevel(score);

    const result = {
      score: Math.round(score),
      actfl_level: levels.actfl,
      cefr_level: levels.cefr,
      feedback,
      summary: `Your ${phase} performance demonstrates ${levels.actfl} (${levels.cefr}) proficiency in ${targetLanguage}.`
    };

    console.log('🎉 Final evaluation result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('💥 Error evaluating responses:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to evaluate responses. Please try again.',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
