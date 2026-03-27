import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      targetItems = 10, 
      dryRun = false, 
      batchSize = 30,
      prioritySections 
    } = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('🚀 Creating prewarm job...');

    // Create a job record
    const { data: job, error: jobError } = await supabase
      .from('prewarm_jobs')
      .insert({
        status: 'pending',
        progress: {
          processed: 0,
          totalGenerated: 0,
          totalSkipped: 0
        }
      })
      .select()
      .single();

    if (jobError) {
      console.error('Failed to create job:', jobError);
      throw jobError;
    }

    console.log('✅ Job created:', job.id);

    // Start the background work asynchronously (don't await)
    supabase.functions.invoke('prewarm-pool', {
      body: {
        jobId: job.id,
        targetItemsPerLevel: targetItems,
        batchSize,
        prioritySections,
        dryRun
      }
    }).catch(err => {
      console.error('Background job invocation error:', err);
    });

    // Return immediately with job ID
    return new Response(JSON.stringify({
      success: true,
      jobId: job.id,
      message: 'Content generation started in background'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Start prewarm error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
