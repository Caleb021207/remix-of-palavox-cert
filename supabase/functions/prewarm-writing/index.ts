import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGES = [
  'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Arabic', 'Russian', 'Chinese', 'Japanese', 'Korean',
  'Hindi', 'Vietnamese', 'Ukrainian', 'Indonesian',
  'Farsi', 'Urdu', 'Pashto', 'Swahili'
];

const LEVELS = ['A2', 'B1', 'C1'];
const VARIATIONS_PER_COMBO = 10;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 Starting writing prompts prewarm...');
    console.log(`📊 Target: ${LANGUAGES.length} languages × ${LEVELS.length} levels × ${VARIATIONS_PER_COMBO} variations = ${LANGUAGES.length * LEVELS.length * VARIATIONS_PER_COMBO} prompts`);

    let totalGenerated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const errors: string[] = [];

    for (const baseLanguage of LANGUAGES) {
      console.log(`📚 Processing base language: ${baseLanguage}`);

      for (const level of LEVELS) {
        console.log(`  Level ${level}:`);

        // Check existing count
        const { count: existingCount } = await supabase
          .from('cert_content_pool')
          .select('*', { count: 'exact', head: true })
          .eq('section', 'writing')
          .eq('level', level)
          .eq('language', 'english')
          .eq('version', 'v1-gpt4o-mini')
          .eq('base_language', baseLanguage.toLowerCase());

        const existing = existingCount || 0;
        const needed = VARIATIONS_PER_COMBO - existing;

        if (needed <= 0) {
          console.log(`  ✅ Already has ${existing}/${VARIATIONS_PER_COMBO} prompts - skipping`);
          totalSkipped += VARIATIONS_PER_COMBO;
          continue;
        }

        console.log(`  📝 Has ${existing}/${VARIATIONS_PER_COMBO}, generating ${needed} more...`);

        // Generate the needed prompts
        for (let i = 0; i < needed; i++) {
          try {
            const { data, error } = await supabase.functions.invoke('generate-writing-prompts', {
              body: {
                uiLanguage: 'en',
                baseLanguage: baseLanguage,
                sessionId: `prewarm-${Date.now()}-${Math.random()}`
              }
            });

            if (error) {
              console.error(`    ❌ Error generating prompt ${i + 1}/${needed}:`, error.message);
              errors.push(`${baseLanguage}/${level}: ${error.message}`);
              totalErrors++;
            } else {
              console.log(`    ✓ Generated prompt ${existing + i + 1}/${VARIATIONS_PER_COMBO}`);
              totalGenerated++;
            }

            // Rate limiting: wait 500ms between requests
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (err) {
            console.error(`    ❌ Exception generating prompt ${i + 1}/${needed}:`, err);
            errors.push(`${baseLanguage}/${level}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            totalErrors++;
          }
        }
      }
    }

    const summary = {
      totalGenerated,
      totalSkipped,
      totalErrors,
      estimatedCost: `$${(totalGenerated * 0.01).toFixed(2)} USD`,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('📊 PREWARM COMPLETE', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in prewarm-writing function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
