import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGES = [
  'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Russian', 'Ukrainian', 'Chinese', 'Japanese', 'Korean',
  'Hindi', 'Vietnamese', 'Indonesian', 'Arabic', 'Persian',
  'Urdu', 'Pashto', 'Swahili'
];

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const SECTIONS = ['reading', 'listening', 'writing', 'speaking'];
const VARIATIONS = [1, 2, 3, 4];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batchSize = 3 } = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log(`🚀 Generating batch of ${batchSize} items...`);
    
    let generated = 0;
    const results = [];

    // Find items that need generation
    outerLoop: for (const language of LANGUAGES) {
      for (const section of SECTIONS) {
        for (const level of LEVELS) {
          for (const variation of VARIATIONS) {
            if (generated >= batchSize) break outerLoop;
            
            // Check if this combo already exists
            const { count } = await supabase
              .from('cert_content_pool')
              .select('*', { count: 'exact', head: true })
              .eq('section', section)
              .eq('level', level)
              .eq('language', language.toLowerCase())
              .eq('version', 'v1-gpt4o-mini')
              .eq('variation', variation);

            if (count && count > 0) {
              console.log(`✓ ${section}/${level}/${language}/v${variation} - already exists`);
              continue;
            }

            // Generate this item
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
              console.error(`❌ Error generating ${section}/${level}/${language}/v${variation}:`, genError);
              results.push({ language, section, level, variation, status: 'error', error: genError.message });
            } else {
              console.log(`✅ Generated ${section}/${level}/${language}/v${variation}`);
              results.push({ language, section, level, variation, status: 'success' });
              generated++;
            }
          }
        }
      }
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('cert_content_pool')
      .select('*', { count: 'exact', head: true })
      .eq('version', 'v1-gpt4o-mini');

    const remaining = 1728 - (totalCount || 0);

    return new Response(JSON.stringify({
      success: true,
      generated,
      totalInDb: totalCount || 0,
      remaining,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Batch generation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
