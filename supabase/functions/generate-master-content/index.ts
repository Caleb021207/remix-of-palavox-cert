import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CERT_CONTENT_VERSION = 'v1-english-master';

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const VARIATIONS = 8;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateReadingPassage(level: string, variation: number): Promise<string> {
  console.log(`📖 Generating Reading ${level} variation ${variation}...`);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
          content: `You are an English language assessment expert creating reading passages for ESL learners.
Create a ${level} CEFR level reading passage in English.

LEVEL GUIDELINES:
- A1: 50-75 words, simple present tense, basic vocabulary
- A2: 75-125 words, present/past tense, everyday topics
- B1: 125-200 words, various tenses, familiar topics with some complexity
- B2: 200-300 words, complex structures, abstract topics
- C1: 300-400 words, sophisticated language, nuanced ideas
- C2: 400-500 words, native-like complexity, specialized topics

Return ONLY the passage text, no extra formatting.`
        },
        {
          role: 'user',
          content: `Create variation ${variation} of an English reading passage for ${level} level learners.`
        }
      ],
      max_completion_tokens: 600,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function generateReadingQuestions(passage: string, level: string): Promise<any[]> {
  const questionCount = level === 'A1' || level === 'A2' ? 2 : level === 'C1' || level === 'C2' ? 1 : 2;
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `Generate ${questionCount} multiple-choice comprehension questions in English for this passage.
Each question must have 4 options with randomized correct answer position.
Return as JSON array: [{"id": "q1", "text": "question", "options": [{"id": "a", "text": "...", "isCorrect": true/false}]}]`
        },
        {
          role: 'user',
          content: `Passage:\n${passage}`
        }
      ],
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function generateListeningScript(level: string, variation: number): Promise<string> {
  console.log(`🎧 Generating Listening ${level} variation ${variation}...`);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
          content: `Create a ${level} CEFR level listening script in English.
Return ONLY the dialogue/narrative text for text-to-speech conversion.`
        },
        {
          role: 'user',
          content: `Create variation ${variation} of an English listening script for ${level} level learners.`
        }
      ],
      max_completion_tokens: 400,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function generateWritingPrompt(level: string, variation: number): Promise<string> {
  console.log(`✍️ Generating Writing ${level} variation ${variation}...`);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
          content: `Create a ${level} CEFR level writing prompt in English for ESL learners.
Return ONLY the prompt text with word count requirement.`
        },
        {
          role: 'user',
          content: `Create variation ${variation} of an English writing prompt for ${level} level learners.`
        }
      ],
      max_completion_tokens: 200,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    console.log('🚀 Starting Master English Content Pool Generation');
    console.log(`📊 Total items to generate: ${CEFR_LEVELS.length * VARIATIONS * 3} = 192 items`);

    const sections: ('reading' | 'listening' | 'writing')[] = ['reading', 'listening', 'writing'];
    let totalGenerated = 0;
    let totalErrors = 0;
    const results: any[] = [];

    for (const section of sections) {
      console.log(`\n📝 Generating ${section.toUpperCase()} content...`);
      
      for (const level of CEFR_LEVELS) {
        for (let variation = 1; variation <= VARIATIONS; variation++) {
          try {
            let payload: any;
            
            if (section === 'reading') {
              const passage = await generateReadingPassage(level, variation);
              const questions = await generateReadingQuestions(passage, level);
              payload = { level, passage, questions };
            } else if (section === 'listening') {
              const script = await generateListeningScript(level, variation);
              payload = { level, script, audioUrl: null, questions: [] };
            } else if (section === 'writing') {
              const prompt = await generateWritingPrompt(level, variation);
              payload = { level, prompt };
            }

            // Store in pool
            const { error } = await supabase.from('cert_content_pool').insert({
              section,
              level,
              language: 'english',
              version: CERT_CONTENT_VERSION,
              payload,
              variation,
              generation_cost_usd: 0.03,
              used_count: 0,
              usage_context: 'certification',
            });

            if (error) throw error;
            
            console.log(`✅ Stored ${section}/${level}/variation-${variation}`);
            totalGenerated++;
            results.push({ section, level, variation, status: 'success' });
            
            // Rate limiting: wait 1 second between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } catch (error) {
            totalErrors++;
            console.error(`❌ Error: ${section}/${level}/variation-${variation}`, error);
            results.push({ section, level, variation, status: 'error', error: String(error) });
          }
        }
      }
    }

    console.log('\n✨ Generation Complete!');
    console.log(`✅ Successfully generated: ${totalGenerated} items`);
    console.log(`❌ Errors: ${totalErrors} items`);

    return new Response(JSON.stringify({ 
      success: true,
      totalGenerated,
      totalErrors,
      results,
      message: 'Master English content pool generation complete!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(JSON.stringify({ 
      error: String(error),
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
