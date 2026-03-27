import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ReadingContent, LevelConfig } from './types.ts';
import { determineLanguages } from './languageUtils.ts';
import { generateReadingContent } from './contentGenerator.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
const azureSpeechKey = Deno.env.get('AZURE_SPEECH_KEY');
const azureSpeechRegion = Deno.env.get('AZURE_SPEECH_REGION');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CERT_CONTENT_VERSION = '1.0';
const BYPASS_POOL = false; // Use pool for session-level deduplication

console.log('🔑 API Keys available:', {
  hasOpenAI: !!openAIApiKey,
  hasLovable: !!lovableApiKey
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate audio using Azure TTS
async function generateAudioForPassage(text: string, level: string): Promise<string | null> {
  if (!azureSpeechKey || !azureSpeechRegion) {
    console.warn('Azure Speech credentials not configured, skipping audio generation');
    return null;
  }

  try {
    const voice = 'en-US-JennyNeural'; // Natural, clear voice for all levels
    const rate = level === 'A1' ? '0.9' : level === 'A2' ? '0.95' : '1.0';
    
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="${voice}">
          <prosody rate="${rate}">
            ${text}
          </prosody>
        </voice>
      </speak>
    `;

    const response = await fetch(
      `https://${azureSpeechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': azureSpeechKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
        },
        body: ssml,
      }
    );

    if (!response.ok) {
      throw new Error(`Azure TTS failed: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(audioBuffer);
    
    // Convert to base64 in chunks to avoid stack overflow
    let binaryString = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const base64Audio = btoa(binaryString);
    return `data:audio/mp3;base64,${base64Audio}`;
  } catch (error) {
    console.error('Audio generation failed:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      uiLanguage = 'english', 
      baseLanguage = 'Spanish', 
      sessionId, 
      section = 'reading',
      includeAudio = false,
      adaptiveMode = false,
      targetLevel = 'B1'
    } = await req.json();
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('🧠 Fetching comprehension content:', { 
      uiLanguage, 
      baseLanguage,
      sessionId,
      section,
      includeAudio,
      adaptiveMode,
      targetLevel
    });

    // Content is ALWAYS in English for ESL tests
    const contentLanguage = 'english';

    // Adaptive mode: generate single question at target level
    // Static mode: balanced distribution across all levels
    const levels: LevelConfig[] = adaptiveMode 
      ? [{ level: targetLevel as string, questionCount: 1 }]
      : [
          { level: 'A1', questionCount: 2 },
          { level: 'A2', questionCount: 2 },
          { level: 'B1', questionCount: 2 },
          { level: 'B2', questionCount: 2 },
          { level: 'C1', questionCount: 1 },
          { level: 'C2', questionCount: 1 }
        ];

    const allContent: ReadingContent[] = [];

    // Get already-used pool IDs for this session to prevent duplicates
    let excludePoolIds: string[] = [];
    if (sessionId) {
      const { data: usedItems } = await supabaseClient
        .from('cert_item_usage')
        .select('pool_id')
        .eq('test_session_id', sessionId);
      
      excludePoolIds = usedItems?.map(item => item.pool_id) || [];
      console.log(`🚫 Excluding ${excludePoolIds.length} already-used items for session ${sessionId}`);
    }

    for (const levelConfig of levels) {
      let cachedItem: any = null;
      
      // STEP 1: Try language-specific cached content first
      if (!BYPASS_POOL && baseLanguage !== 'English') {
        const languageKey = baseLanguage.toLowerCase();
        
        const { data: translatedCached } = await supabaseClient
          .rpc('claim_least_used_pool_item', {
            p_section: section,
            p_level: levelConfig.level,
            p_language: languageKey,
            p_version: CERT_CONTENT_VERSION,
            p_exclude_hashes: [],
            p_exclude_pool_ids: excludePoolIds
          });

        if (translatedCached && translatedCached.length > 0) {
          cachedItem = translatedCached[0];
          console.log(`✅ Found cached ${languageKey} translation for ${levelConfig.level}`);
          
          const cachedContent = cachedItem.payload;
          
          // Generate audio if requested and not already present
          if (includeAudio && !cachedContent.audioUrl) {
            try {
              const audioUrl = await generateAudioForPassage(cachedContent.passage, levelConfig.level);
              cachedContent.audioUrl = audioUrl;
              console.log(`🎧 Generated audio for cached ${levelConfig.level}`);
            } catch (audioError) {
              console.error(`Failed to generate audio for cached ${levelConfig.level}:`, audioError);
              cachedContent.audioUrl = null;
            }
          }
          
          allContent.push(cachedContent);
          
          // Track usage with topic hash and user_id for cross-session deduplication
          if (sessionId) {
            try {
              const { data: session } = await supabaseClient
                .from('test_sessions')
                .select('user_id')
                .eq('id', sessionId)
                .single();
              
              const usageData: any = {
                test_session_id: sessionId,
                pool_id: cachedItem.id,
                section: section,
                stem_hash: cachedItem.stem_hash ?? null,
                topic_hash: cachedContent?.topicHash || null
              };
              
              if (session?.user_id) {
                usageData.user_id = session.user_id;
              }
              
              await supabaseClient.from('cert_item_usage').insert(usageData);
              excludePoolIds.push(cachedItem.id);
            } catch (err) {
              console.warn('Could not track item usage:', err);
            }
          }
            
          await supabaseClient.from('cert_cache_events').insert({
            section: section,
            level: levelConfig.level,
            language: languageKey,
            version: CERT_CONTENT_VERSION,
            cache_hit: true,
            test_session_id: sessionId
          });
          
          continue;
        }
      }
      
      // STEP 2: If no native cache found, generate fresh content with native questions
      // Do NOT use English cache for non-English users (old cached items have English questions)

      // Get user's recently used topics to avoid repetition
      let excludeTopics: string[] = [];
      if (sessionId) {
        try {
          const { data: session } = await supabaseClient
            .from('test_sessions')
            .select('user_id')
            .eq('id', sessionId)
            .single();
          
          if (session?.user_id) {
            const { data: recentHashes } = await supabaseClient
              .rpc('get_recent_topic_hashes', {
                p_user_id: session.user_id,
                p_section: section,
                p_lookback_days: 30
              });
            
            if (recentHashes && Array.isArray(recentHashes)) {
              // Decode hashes back to topic names
              const { decodeTopicHash } = await import('./topicBanksCEFR.ts');
              excludeTopics = recentHashes
                .map(hash => decodeTopicHash(hash, levelConfig.level, section))
                .filter(Boolean) as string[];
              
              console.log(`🚫 Excluding ${excludeTopics.length} recently used topics for user`);
            }
          }
        } catch (err) {
          console.warn('Could not fetch recent topics:', err);
        }
      }
      
      // Cache miss or bypass - generate new content with questions in native language
      console.log(`❌ Cache miss, generating English reading/${levelConfig.level} with ${baseLanguage} questions`);
      
      if (!openAIApiKey) {
        throw new Error('OPENAI_API_KEY required for passage generation');
      }
      
      // Generate English content with questions in native language
      const content = await generateReadingContent(
        levelConfig,
        'english', // Content always in English
        baseLanguage, // Questions in native language
        openAIApiKey,
        excludeTopics // Pass excluded topics
      );
      
      allContent.push(content);
      
      // Generate audio inline if requested (for listening phase)
      if (includeAudio) {
        try {
          const audioUrl = await generateAudioForPassage(content.passage, levelConfig.level);
          content.audioUrl = audioUrl;
          console.log(`🎧 Generated audio for ${levelConfig.level}`);
        } catch (audioError) {
          console.error(`Failed to generate audio for ${levelConfig.level}:`, audioError);
          // Continue without audio - listening phase will handle gracefully
          content.audioUrl = null;
        }
      }
      
      // Track cache miss event for native language
      await supabaseClient.from('cert_cache_events').insert({
        section: section,
        level: levelConfig.level,
        language: baseLanguage.toLowerCase(),
        version: CERT_CONTENT_VERSION,
        cache_hit: false,
        test_session_id: sessionId
      });
      
      // Generate stem hash for deduplication
      const stemText = content.passage || '';
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(stemText));
      const stemHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Cache the result with native-language questions and topic metadata
      if (!BYPASS_POOL) {
        const languageKey = baseLanguage.toLowerCase();
        
        // Get user_id if available for tracking
        let userId = null;
        if (sessionId) {
          try {
            const { data: session } = await supabaseClient
              .from('test_sessions')
              .select('user_id')
              .eq('id', sessionId)
              .single();
            userId = session?.user_id;
          } catch (err) {
            console.warn('Could not get user_id:', err);
          }
        }
        
        await supabaseClient.from('cert_content_pool').insert({
          section: section,
          level: levelConfig.level,
          language: languageKey, // Store as native language
          version: CERT_CONTENT_VERSION,
          payload: content,
          generation_cost_usd: 0.03,
          used_count: 0,
          usage_context: 'certification',
          stem_hash: stemHash
        });
        
        // Track usage immediately
        if (sessionId) {
          const { data: insertedItem } = await supabaseClient
            .from('cert_content_pool')
            .select('id')
            .eq('stem_hash', stemHash)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (insertedItem) {
            await supabaseClient.from('cert_item_usage').insert({
              test_session_id: sessionId,
              pool_id: insertedItem.id,
              section: section,
              stem_hash: stemHash,
              topic_hash: content.topicHash,
              user_id: userId
            });
          }
        }
      }
      
      console.log(`✅ Completed and cached ${levelConfig.level} level content`);
    }

    console.log('🚀 All comprehension content ready (with audio if requested)');

    return new Response(JSON.stringify({ 
      content: allContent,
      cached: true,
      adaptiveMode,
      targetLevel: adaptiveMode ? targetLevel : undefined,
      message: `Comprehension content ready for ${uiLanguage} UI`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating reading content:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      cached: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

