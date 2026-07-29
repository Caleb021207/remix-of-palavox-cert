
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsFor, preflight } from '../_shared/cors.ts';
import { requireCaller } from '../_shared/auth.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CERT_CONTENT_VERSION = 'v1-gpt4o-mini';
const BYPASS_POOL = true; // Always generate fresh content



interface SpeakingPrompt {
  level: string;
  prompt: string;
  expectedDuration: string;
  instructions: string;
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
    const { targetLanguage = "Spanish", baseLanguage = "English", sessionId } = await req.json();
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log(`Generating speaking prompts for: ${targetLanguage} with base language: ${baseLanguage}`);
    
    const isNativeTest = targetLanguage === 'English' && baseLanguage === 'English';
    const promptLanguage = isNativeTest ? 'English' : baseLanguage;
    
    console.log(`Speaking test type: ${isNativeTest ? 'Native speaker' : 'ESL'} - prompts in: ${promptLanguage}`);

    const prompts: SpeakingPrompt[] = [];
    const levels = [
      { level: 'A1', actfl: 'Novice' },
      { level: 'A2', actfl: 'Novice' },
      { level: 'B1', actfl: 'Intermediate' },
      { level: 'B2', actfl: 'Intermediate' },
      { level: 'C1', actfl: 'Advanced' },
      { level: 'C2', actfl: 'Advanced' }
    ];

    for (const levelConfig of levels) {
      // Check bypass flag
      if (!BYPASS_POOL) {
        // Try atomic claim from pool
        const { data: cached, error: cacheError } = await supabaseClient
          .rpc('claim_least_used_pool_item', {
            p_section: 'speaking',
            p_level: levelConfig.level,
            p_language: targetLanguage.toLowerCase(),
            p_version: CERT_CONTENT_VERSION,
            p_exclude_hashes: []
          });

        if (cached && cached.length > 0) {
        const item = cached[0];
        console.log(`✅ Cache hit for speaking/${levelConfig.level}/${targetLanguage}`);
        prompts.push(item.payload);
        
        // Track usage
        if (sessionId) {
          await supabaseClient.from('cert_item_usage').insert({
            test_session_id: sessionId,
            pool_id: item.id,
            section: 'speaking',
            stem_hash: item.stem_hash ?? null
          });
        }
        
        await supabaseClient.from('cert_cache_events').insert({
          section: 'speaking',
          level: levelConfig.level,
          language: targetLanguage.toLowerCase(),
          version: CERT_CONTENT_VERSION,
          cache_hit: true,
          test_session_id: sessionId
        });
        
          continue;
        }
      }

      // Cache miss or bypass - generate new content
      console.log(`❌ Cache miss, generating speaking/${levelConfig.level}/${targetLanguage}`);
      const prompt = await generateSpeakingPrompt(levelConfig.actfl, targetLanguage, promptLanguage, isNativeTest, supabaseClient, sessionId, levelConfig.level, BYPASS_POOL);
      prompts.push(prompt);
    }

    return new Response(JSON.stringify({ prompts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating speaking prompts:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      prompts: getFallbackSpeakingPrompts()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateSpeakingPrompt(
  level: string, 
  targetLanguage: string, 
  promptLanguage: string,
  isNativeTest: boolean,
  supabaseClient?: any,
  sessionId?: string,
  cefrLevel?: string,
  bypassPool: boolean = false
): Promise<SpeakingPrompt> {
  const systemPrompt = `Generate a bilingual conversational speaking prompt for ${level} level ${targetLanguage} assessment. 

${isNativeTest ? 
  'This is for a NATIVE speaker, so focus on fluency, naturalness, and communication effectiveness rather than basic grammar.' :
  'This is for a language learner.'
}

Requirements:
- Provide prompts in BOTH ${promptLanguage} AND English
- Target 30-60 seconds of natural speech
- Conversational and engaging
- No word count requirements
- Allow for natural pauses and corrections
- ${level === 'Novice' ? 'Simple, personal topics' : level === 'Intermediate' ? 'Everyday situations and experiences' : 'Complex topics requiring explanation and opinion'}

Return JSON format:
{
  "prompt": "prompt in ${promptLanguage}",
  "prompt_english": "prompt in English",
  "expectedDuration": "30-60 seconds",
  "instructions": "instructions in ${promptLanguage}",
  "instructions_english": "instructions in English",
  "initial_cta_native": "Call to action in ${promptLanguage}",
  "initial_cta_english": "Call to action in English"
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a ${level} level speaking prompt for ${targetLanguage}` }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  let result;
  try {
    result = JSON.parse(data.choices[0].message.content);
  } catch {
    // Fallback if parsing fails
    result = {
      prompt: data.choices[0].message.content,
      prompt_english: data.choices[0].message.content,
      expectedDuration: "30-60 seconds",
      instructions: "Speak naturally",
      instructions_english: "Speak naturally",
      initial_cta_native: "Press the button to start",
      initial_cta_english: "Press the button to start"
    };
  }
  
  const promptData = {
    level,
    prompt: result.prompt,
    prompt_english: result.prompt_english || result.prompt,
    expectedDuration: result.expectedDuration,
    instructions: result.instructions,
    instructions_english: result.instructions_english || result.instructions,
    initial_cta_native: result.initial_cta_native || result.instructions,
    initial_cta_english: result.initial_cta_english || result.instructions
  };
  
  // Cache the result if we have supabase client and not bypassing
  if (supabaseClient && cefrLevel && !bypassPool) {
    // Track cache miss
    await supabaseClient.from('cert_cache_events').insert({
      section: 'speaking',
      level: cefrLevel,
      language: targetLanguage.toLowerCase(),
      version: CERT_CONTENT_VERSION,
      cache_hit: false,
      test_session_id: sessionId
    });
    
    // Generate stem hash
    const stemText = result.prompt;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(stemText));
    const stemHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Cache it
    await supabaseClient.from('cert_content_pool').insert({
      section: 'speaking',
      level: cefrLevel,
      language: targetLanguage.toLowerCase(),
      version: CERT_CONTENT_VERSION,
      payload: promptData,
      generation_cost_usd: 0.02,
      used_count: 0,
      usage_context: 'certification',
      stem_hash: stemHash
    });
    
    console.log(`✅ Generated and cached ${cefrLevel} speaking prompt`);
  }
  
  return promptData;
}

function getFallbackSpeakingPrompts(): SpeakingPrompt[] {
  return [
    {
      level: 'Novice',
      prompt: 'Tell me about your typical day. What do you usually do in the morning?',
      expectedDuration: '30-45 seconds',
      instructions: 'Speak naturally about your daily routine. Take your time and don\'t worry about perfect grammar.'
    },
    {
      level: 'Intermediate', 
      prompt: 'Describe a place you\'d like to visit and explain why it interests you.',
      expectedDuration: '45-60 seconds',
      instructions: 'Share your thoughts naturally. It\'s okay to pause and think - that\'s normal in conversation.'
    },
    {
      level: 'Advanced',
      prompt: 'What\'s your opinion on how technology has changed communication between people?',
      expectedDuration: '60-90 seconds', 
      instructions: 'Express your views and reasoning. Natural speech patterns and corrections are expected.'
    }
  ];
}
