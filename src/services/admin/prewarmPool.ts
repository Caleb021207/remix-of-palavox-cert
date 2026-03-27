// Legacy prewarm pool service — stubbed for new schema
// Will be replaced with Gemini-based item bank seeding

export interface PrewarmJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: any;
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

export async function startPrewarmJob(): Promise<StartPrewarmResult> {
  console.log('[stub] startPrewarmJob — will be replaced with Gemini item bank seeding');
  return { jobId: 'stub', success: false, message: 'Not implemented yet' };
}

export async function getJobStatus(jobId: string): Promise<PrewarmJob | null> {
  console.log('[stub] getJobStatus — not implemented');
  return null;
}

export async function getPoolStats() {
  return { total: 0, bySection: {} };
}
