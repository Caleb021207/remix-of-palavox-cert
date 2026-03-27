/**
 * Prewarm Writing Prompts Pool Script
 * Generates bilingual writing prompts for all languages and caches them
 * Run: bun run scripts/prewarm-writing-prompts.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Languages to pre-populate (17 languages)
const LANGUAGES = [
  'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Arabic', 'Russian', 'Chinese', 'Japanese', 'Korean',
  'Hindi', 'Vietnamese', 'Ukrainian', 'Indonesian',
  'Farsi', 'Urdu', 'Pashto', 'Swahili'
];

// ACTFL Levels
const LEVELS = ['A2', 'B1', 'C1'];

// Number of variations per language/level
const VARIATIONS_PER_COMBO = 10;

async function prewarmWritingPrompts() {
  console.log('🚀 Starting writing prompts prewarm...');
  console.log(`📊 Target: ${LANGUAGES.length} languages × ${LEVELS.length} levels × ${VARIATIONS_PER_COMBO} variations = ${LANGUAGES.length * LEVELS.length * VARIATIONS_PER_COMBO} prompts`);
  console.log('');

  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const errors: string[] = [];

  for (const baseLanguage of LANGUAGES) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📚 Processing base language: ${baseLanguage}`);
    console.log('═'.repeat(60));

    for (const level of LEVELS) {
      console.log(`\n  Level ${level}:`);

      // Check existing count for this combo
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

  console.log('\n' + '═'.repeat(60));
  console.log('📊 PREWARM COMPLETE');
  console.log('═'.repeat(60));
  console.log(`✅ Total generated: ${totalGenerated}`);
  console.log(`⏭️  Total skipped: ${totalSkipped}`);
  console.log(`❌ Total errors: ${totalErrors}`);
  console.log(`💰 Estimated cost: $${(totalGenerated * 0.01).toFixed(2)} USD`);
  
  if (errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    errors.forEach(err => console.log(`   ${err}`));
  }

  console.log('\n🎉 Writing prompts cache is ready!');

  // Show final cache statistics
  const { data: stats } = await supabase
    .from('cert_content_pool')
    .select('base_language, level')
    .eq('section', 'writing')
    .eq('language', 'english')
    .eq('version', 'v1-gpt4o-mini');

  if (stats) {
    const grouped = stats.reduce((acc, item) => {
      const key = item.base_language || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📈 Cache distribution:');
    Object.entries(grouped).forEach(([lang, count]) => {
      console.log(`   ${lang}: ${count} prompts`);
    });
  }
}

// Run the prewarm
prewarmWritingPrompts().catch(console.error);
