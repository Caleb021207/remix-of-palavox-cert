import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// English Master Content Pool Only
const LANGUAGES = ['English'];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const SECTIONS = ['reading', 'listening', 'writing', 'speaking'];
const VARIATIONS = [1, 2, 3, 4, 5, 6, 7, 8];

async function generateAllContent() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  let generated = 0;
  let skipped = 0;
  
  console.log('🚀 Starting full content generation...');
  
  for (const language of LANGUAGES) {
    for (const section of SECTIONS) {
      for (const level of LEVELS) {
        for (const variation of VARIATIONS) {
          try {
            // Check if exists
            const { count } = await supabase
              .from('cert_content_pool')
              .select('*', { count: 'exact', head: true })
              .eq('section', section)
              .eq('level', level)
              .eq('language', language.toLowerCase())
              .eq('version', 'v1-gpt4o-mini')
              .eq('variation', variation);

            if (count && count > 0) {
              console.log(`✓ ${section}/${level}/${language}/v${variation} - exists`);
              skipped++;
              continue;
            }

            // Generate
            console.log(`📝 Generating ${section}/${level}/${language}/v${variation}...`);
            
            let functionName: string;
            let requestBody: any;
            
            if (section === 'reading') {
              functionName = 'generate-reading-content';
              requestBody = { targetLanguage: 'English', baseLanguage: language, level, variation };
            } else if (section === 'listening') {
              functionName = 'generate-listening-content';
              requestBody = { targetLanguage: 'English', baseLanguage: language, level, variation };
            } else if (section === 'writing') {
              functionName = 'generate-writing-prompts';
              requestBody = { targetLanguage: 'English', baseLanguage: language, level, variation };
            } else if (section === 'speaking') {
              functionName = 'generate-speaking-prompts';
              requestBody = { targetLanguage: 'English', baseLanguage: language, level, variation };
            } else {
              continue;
            }
            
            const { error: genError } = await supabase.functions.invoke(functionName, {
              body: requestBody
            });

            if (genError) {
              console.error(`❌ Error: ${section}/${level}/${language}/v${variation}:`, genError);
            } else {
              console.log(`✅ Generated ${section}/${level}/${language}/v${variation}`);
              generated++;
            }
            
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 200));
            
          } catch (error) {
            console.error(`❌ Exception for ${section}/${level}/${language}/v${variation}:`, error);
          }
        }
      }
    }
    console.log(`\n✅ Completed language: ${language} (${generated} generated, ${skipped} skipped)\n`);
  }
  
  console.log(`\n🎉 ALL DONE! Generated ${generated} items, skipped ${skipped} existing items.`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Start the generation in the background
    generateAllContent().catch(err => {
      console.error('Background generation failed:', err);
    });

    // Return immediately
    return new Response(JSON.stringify({
      success: true,
      message: 'Content generation started in background. Check logs for progress.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
