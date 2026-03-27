import { supabase } from '@/integrations/supabase/client';

export interface PrewarmOptions {
  targetItems?: number;
  dryRun?: boolean;
}

export interface PrewarmJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    processed: number;
    totalGenerated: number;
    totalSkipped: number;
    remaining: number;
  };
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface StartPrewarmResult {
  jobId: string;
  success: boolean;
  message: string;
}

/**
 * Start prewarm job (returns immediately)
 */
export async function startPrewarmJob(options: PrewarmOptions = {}): Promise<StartPrewarmResult> {
  const { targetItems = 1, dryRun = false } = options;
  
  console.log('🚀 startPrewarmJob called with:', { targetItems, dryRun });
  
  try {
    const { data, error } = await supabase.functions.invoke('start-prewarm', {
      body: {
        targetItems,
        variationsPerTopic: 5, // Generate 5 variations per topic for even distribution
        dryRun
      }
    });

    console.log('📦 Function response:', { data, error });

    if (error) {
      console.error('❌ Function invocation error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from start-prewarm function');
    }

    console.log('✅ Prewarm job started:', data);
    return data;
  } catch (err) {
    console.error('❌ startPrewarmJob caught error:', err);
    throw err;
  }
}

/**
 * Get job status by ID
 */
export async function getJobStatus(jobId: string): Promise<PrewarmJob | null> {
  try {
    const { data, error } = await supabase
      .from('prewarm_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) throw error;
    return data as PrewarmJob;
  } catch (err) {
    console.error('❌ getJobStatus error:', err);
    return null;
  }
}

/**
 * Gets statistics about the current content pool
 */
export async function getPoolStats() {
  const { data, error } = await supabase
    .from('cert_content_pool')
    .select('section, level, language, version')
    .eq('version', 'v1-gpt4o-mini');

  if (error) {
    console.error('Error fetching pool stats:', error);
    throw error;
  }

  // Group by section/level/language
  const stats: Record<string, Record<string, Record<string, number>>> = {};
  
  data.forEach(item => {
    if (!stats[item.section]) stats[item.section] = {};
    if (!stats[item.section][item.level]) stats[item.section][item.level] = {};
    if (!stats[item.section][item.level][item.language]) {
      stats[item.section][item.level][item.language] = 0;
    }
    stats[item.section][item.level][item.language]++;
  });

  return {
    total: data.length,
    bySection: stats
  };
}
