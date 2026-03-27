/**
 * Prewarm Content Pool Script
 * Generates cache of test items for all languages
 * Run: bun run scripts/prewarm-content-pool.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function prewarmPool() {
  console.log('🚀 Starting content pool prewarm via edge function...');
  console.log('');

  const { data, error } = await supabase.functions.invoke('prewarm-pool', {
    body: {
      targetItems: 10,
      variationsPerTopic: 5, // Generate 5 variations per topic
      dryRun: false
    }
  });

  if (error) {
    console.error('❌ Prewarm failed:', error);
    process.exit(1);
  }

  console.log('');
  console.log('═'.repeat(50));
  console.log('📊 PREWARM COMPLETE');
  console.log('═'.repeat(50));
  console.log(`✅ Total combinations: ${data.totalCombinations}`);
  console.log(`📝 Items generated: ${data.totalGenerated}`);
  console.log(`⏭️  Combinations skipped: ${data.totalSkipped}`);
  console.log('');

  // Show any errors
  const errors = data.results.filter((r: any) => r.status === 'error');
  if (errors.length > 0) {
    console.log('⚠️  Errors encountered:');
    errors.forEach((r: any) => {
      console.log(`   ${r.section}/${r.level}/${r.language}: ${r.error}`);
    });
  }

  console.log('🎉 Prewarm complete! Cache is ready.');
}

// Run the prewarm
prewarmPool().catch(console.error);
