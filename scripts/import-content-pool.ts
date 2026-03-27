import { supabase } from '../src/integrations/supabase/client';
import spanishContent from './populate-content-pool-spanish.json';
import frenchContent from './populate-content-pool-french.json';

interface ContentItem {
  section: string;
  level: string;
  language: string;
  version: string;
  variation: number;
  payload: any;
}

async function importContentPool() {
  console.log('🚀 Starting content pool import...\n');

  const allContent: ContentItem[] = [
    ...spanishContent as ContentItem[],
    ...frenchContent as ContentItem[]
  ];

  console.log(`📦 Total items to import: ${allContent.length}`);
  console.log(`   - Spanish: ${spanishContent.length} items`);
  console.log(`   - French: ${frenchContent.length} items\n`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of allContent) {
    const { section, level, language, version, variation, payload } = item;

    // Check if item already exists
    const { data: existing, error: checkError } = await supabase
      .from('cert_content_pool')
      .select('id')
      .eq('section', section)
      .eq('level', level)
      .eq('language', language)
      .eq('version', version)
      .eq('variation', variation)
      .maybeSingle();

    if (checkError) {
      console.error(`❌ Error checking ${language} ${section} ${level} v${variation}:`, checkError.message);
      errors++;
      continue;
    }

    if (existing) {
      console.log(`⏭️  Skipped ${language} ${section} ${level} v${variation} - already exists`);
      skipped++;
      continue;
    }

    // Insert new item
    const { error: insertError } = await supabase
      .from('cert_content_pool')
      .insert({
        section,
        level,
        language,
        version,
        variation,
        payload,
        used_count: 0,
        usage_context: 'certification'
      });

    if (insertError) {
      console.error(`❌ Error inserting ${language} ${section} ${level} v${variation}:`, insertError.message);
      errors++;
      continue;
    }

    console.log(`✅ Inserted ${language} ${section} ${level} v${variation}`);
    inserted++;
  }

  console.log('\n📊 Import Summary:');
  console.log(`   ✅ Inserted: ${inserted}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📦 Total: ${allContent.length}\n`);

  if (inserted > 0) {
    console.log('🎉 Content pool successfully populated!');
    console.log('💡 All future tests will now use this pre-generated content.\n');
  } else if (skipped === allContent.length) {
    console.log('ℹ️  All content already exists in the pool.\n');
  } else {
    console.log('⚠️  Import completed with some errors. Check the logs above.\n');
  }
}

// Run the import
importContentPool().catch(console.error);
