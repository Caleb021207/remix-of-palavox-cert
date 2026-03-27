import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContentItem {
  section: string;
  level: string;
  variation: number;
  payload: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { items } = await req.json();

    if (!Array.isArray(items)) {
      throw new Error('Items must be an array');
    }

    console.log(`Importing ${items.length} content items...`);

    const inserted = [];
    const skipped = [];

    for (const item of items) {
      const { section, level, variation, payload } = item as ContentItem;

      // Check if this exact item already exists
      const { data: existing } = await supabaseClient
        .from('cert_content_pool')
        .select('id')
        .eq('section', section)
        .eq('level', level)
        .eq('language', 'english')
        .eq('version', '1.0')
        .eq('variation', variation)
        .maybeSingle();

      if (existing) {
        console.log(`Skipping ${section} ${level} v${variation} - already exists`);
        skipped.push({ section, level, variation });
        continue;
      }

      // Insert new item
      const { error: insertError } = await supabaseClient
        .from('cert_content_pool')
        .insert({
          section,
          level,
          language: 'english',
          version: '1.0',
          variation,
          payload,
          used_count: 0,
          usage_context: 'certification',
        });

      if (insertError) {
        console.error(`Error inserting ${section} ${level} v${variation}:`, insertError);
        throw insertError;
      }

      inserted.push({ section, level, variation });
      console.log(`✓ Inserted ${section} ${level} v${variation}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted: inserted.length,
        skipped: skipped.length,
        total: items.length,
        details: { inserted, skipped },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
