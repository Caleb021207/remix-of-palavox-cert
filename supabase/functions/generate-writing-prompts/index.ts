
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsFor, preflight } from '../_shared/cors.ts';
import { requireCaller } from '../_shared/auth.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CERT_CONTENT_VERSION = 'v1-gpt4o-mini';
const BYPASS_POOL = false; // Caching enabled with base_language support

// 100 diverse topics for writing prompt variety
const TOPIC_POOL = [
  'travel experiences', 'cultural festivals', 'family traditions', 'childhood memories', 'daily routines',
  'food and cuisine', 'hobbies and interests', 'education system', 'career aspirations', 'technology impact',
  'environmental issues', 'social media', 'health and fitness', 'sports events', 'music preferences',
  'art and creativity', 'literature and reading', 'movies and entertainment', 'fashion trends', 'home and living',
  'friendship stories', 'romantic relationships', 'workplace experiences', 'volunteering', 'community service',
  'natural disasters', 'climate change', 'sustainability', 'renewable energy', 'urban development',
  'public transportation', 'traffic and commuting', 'architecture', 'historical events', 'political opinions',
  'economic challenges', 'social justice', 'human rights', 'immigration', 'multiculturalism',
  'language learning', 'study abroad', 'online education', 'mentorship', 'lifelong learning',
  'retirement planning', 'aging parents', 'raising children', 'pet ownership', 'home renovation',
  'gardening', 'cooking techniques', 'restaurant reviews', 'local businesses', 'shopping habits',
  'financial planning', 'investments', 'entrepreneurship', 'startups', 'innovation',
  'scientific discoveries', 'space exploration', 'artificial intelligence', 'robotics', 'medical advances',
  'mental health', 'stress management', 'work-life balance', 'time management', 'productivity tips',
  'holiday celebrations', 'gift giving', 'party planning', 'wedding traditions', 'birthdays',
  'adventure sports', 'outdoor activities', 'camping trips', 'beach vacations', 'mountain hiking',
  'winter sports', 'water sports', 'team sports', 'individual sports', 'Olympic games',
  'photography', 'painting', 'sculpture', 'dance', 'theater',
  'poetry', 'journalism', 'blogging', 'podcasting', 'content creation',
  'video games', 'board games', 'puzzles', 'trivia', 'competitions',
  'charity events', 'fundraising', 'activism', 'protests', 'civic engagement',
  'religious practices', 'spirituality', 'meditation', 'mindfulness', 'personal growth'
];



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
    const { uiLanguage = 'english', baseLanguage = 'Spanish', sessionId } = await req.json();
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('✍️ Fetching English writing prompts with base language:', baseLanguage);

    // Content is ALWAYS in English for ESL tests
    const writingLanguage = 'english';

    // Only 3 prompts total - one per ACTFL level
    const levels = [
      { level: 'A2', actfl: 'Novice' },
      { level: 'B1', actfl: 'Intermediate' },
      { level: 'C1', actfl: 'Advanced' }
    ];
    const prompts = [];

    for (const levelConfig of levels) {
      // Try to get from cache with base_language filtering
      if (!BYPASS_POOL) {
        const { data: cached, error: cacheError } = await supabaseClient
          .rpc('claim_least_used_pool_item', {
            p_section: 'writing',
            p_level: levelConfig.level,
            p_language: 'english',
            p_version: CERT_CONTENT_VERSION,
            p_base_language: baseLanguage.toLowerCase(),
            p_exclude_hashes: []
          });

        if (cached && cached.length > 0) {
          const item = cached[0];
          console.log(`✅ Cache hit for writing/${levelConfig.level}/${writingLanguage} (base: ${baseLanguage})`);
          prompts.push(item.payload);
          
          // Track usage
          if (sessionId) {
            await supabaseClient.from('cert_item_usage').insert({
              test_session_id: sessionId,
              pool_id: item.id,
              section: 'writing',
              stem_hash: item.stem_hash ?? null
            });
          }
          
          await supabaseClient.from('cert_cache_events').insert({
            section: 'writing',
            level: levelConfig.level,
            language: writingLanguage.toLowerCase(),
            version: CERT_CONTENT_VERSION,
            cache_hit: true,
            test_session_id: sessionId
          });
          
          continue;
        }
      }

      // Cache miss or bypass - generate new English content
      const level = levelConfig.actfl;
      console.log(`❌ Cache miss (or bypass), generating English writing/${levelConfig.level} with baseLanguage: ${baseLanguage}`);
      
      const randomTopic = TOPIC_POOL[Math.floor(Math.random() * TOPIC_POOL.length)];
      console.log(`📝 Selected topic: ${randomTopic}`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an English language assessment expert creating bilingual writing prompts for ESL learners.

Generate a ${level} ACTFL level writing prompt in BOTH English AND ${baseLanguage}.

LEVEL GUIDELINES & WORD COUNT REQUIREMENTS:
- Novice: Personal information, basic descriptions, simple present/past tense. Target: 50-100 words.
- Intermediate: Narrate experiences, explain preferences, express opinions. Target: 100-200 words.
- Advanced: Complex ideas, hypothetical situations, abstract concepts. Target: 200-300 words.

CRITICAL INSTRUCTION REQUIREMENT:
- BOTH the English and ${baseLanguage} versions MUST explicitly state: "Write your response in English"
- The ${baseLanguage} version should say this in ${baseLanguage} (e.g., "Écrivez votre réponse en anglais" for French, "Escribe tu respuesta en inglés" for Spanish)

PROMPT REQUIREMENTS:
- Focus on the topic: ${randomTopic}
- Provide both English and ${baseLanguage} versions
- Include word count requirements in both languages
- Clear instructions in both languages stating to write in English
- End each prompt with "Write your response in English" (or the ${baseLanguage} equivalent)

Return JSON format:
{
  "prompt_english": "Full English prompt with word count and instruction to write in English",
  "prompt_native": "Full ${baseLanguage} prompt with word count and instruction to write in English (translated to ${baseLanguage})",
  "instructions_english": "Write your response in English. Target: [word count]",
  "instructions_native": "[Translation of 'Write your response in English' in ${baseLanguage}]. [Word count in ${baseLanguage}]"
}`
            },
            {
              role: 'user',
              content: `Create a bilingual ${level} level writing prompt about "${randomTopic}" for ESL learners. Provide both English and ${baseLanguage} versions with word count requirements. CRITICAL: Both versions must clearly instruct the student to write their response in English.`
            }
          ],
          max_completion_tokens: 800,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenAI API error for ${level}:`, response.status, errorText);
        continue;
      }

      const data = await response.json();
      let content = data.choices[0].message.content.trim();
      console.log(`🤖 OpenAI response for ${level} (${baseLanguage}):`, content.substring(0, 200));
      
      // Strip markdown code blocks if present (OpenAI sometimes wraps JSON in ```json...```)
      if (content.startsWith('```json')) {
        content = content.replace(/^```json\s*/g, '').replace(/```\s*$/g, '').trim();
      } else if (content.startsWith('```')) {
        content = content.replace(/^```\s*/g, '').replace(/```\s*$/g, '').trim();
      }
      
      let bilingualData;
      try {
        // Try to parse as JSON
        bilingualData = JSON.parse(content);
        console.log(`✅ Parsed JSON for ${level}:`, {
          hasEnglish: !!bilingualData.prompt_english,
          hasNative: !!bilingualData.prompt_native,
          baseLanguage
        });
      } catch (parseError) {
        console.error(`❌ Failed to parse OpenAI response for ${level}:`, parseError);
        console.error('Raw content:', content);
        throw new Error(`OpenAI returned invalid JSON for ${level} level (${baseLanguage}). Cannot generate bilingual prompt.`);
      }
      
      const promptData = {
        level: levelConfig.actfl,
        prompt: bilingualData.prompt_english,
        prompt_english: bilingualData.prompt_english,
        prompt_native: bilingualData.prompt_native,
        instructions_english: bilingualData.instructions_english,
        instructions_native: bilingualData.instructions_native
      };
      
      console.log(`✅ Generated ${level} prompt with native (${baseLanguage}):`, {
        hasEnglish: !!promptData.prompt_english,
        hasNative: !!promptData.prompt_native,
        nativePreview: promptData.prompt_native?.substring(0, 100)
      });
      
      prompts.push(promptData);
      
      // Track cache miss
      await supabaseClient.from('cert_cache_events').insert({
        section: 'writing',
        level: levelConfig.level,
        language: 'english',
        version: CERT_CONTENT_VERSION,
        cache_hit: false,
        test_session_id: sessionId
      });
      
      // Generate stem hash
      const stemText = bilingualData.prompt_english;
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(stemText));
      const stemHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Cache the result unless bypassing
      if (!BYPASS_POOL) {
        await supabaseClient.from('cert_content_pool').insert({
          section: 'writing',
          level: levelConfig.level,
          language: writingLanguage.toLowerCase(),
          version: CERT_CONTENT_VERSION,
          base_language: baseLanguage.toLowerCase(),
          payload: promptData,
          generation_cost_usd: 0.02,
          used_count: 0,
          usage_context: 'certification',
          stem_hash: stemHash
        });
      }
      
      console.log(`✅ Generated and cached ${levelConfig.level} writing prompt for base_language: ${baseLanguage}`);
    }

    if (prompts.length === 0) {
      throw new Error('Failed to generate any writing prompts');
    }

    return new Response(JSON.stringify({ prompts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating writing prompts:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
