import { supabase } from '@/integrations/supabase/client';
import { TestSession, TestType, CEFRLevel, ACTFLLevel } from '@/types';
import type { Json } from '@/integrations/supabase/types';

export async function saveTestSession(session: TestSession): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated');

    const { data, error } = await supabase
      .from('test_sessions')
      .insert({
        user_id: user.id,
        status: 'completed' as const,
        started_at: session.startTime.toISOString(),
        completed_at: session.endTime?.toISOString() || new Date().toISOString(),
        metadata: {
          test_type: session.testType,
          score: session.score,
          cefr_level: session.cefr,
          actfl_level: session.actfl,
          feedback: session.feedback,
          language: session.language,
        } as unknown as Json,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error in saveTestSession:', error);
    throw error;
  }
}

export async function getTestSession(sessionId: string): Promise<TestSession | null> {
  try {
    const { data, error } = await supabase
      .from('test_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    if (!data) return null;

    const meta = (data.metadata as Record<string, any>) || {};

    return {
      id: data.id,
      testType: (meta.test_type || 'certification') as TestType,
      startTime: new Date(data.started_at),
      endTime: data.completed_at ? new Date(data.completed_at) : undefined,
      score: meta.score,
      cefr: meta.cefr_level as CEFRLevel,
      actfl: meta.actfl_level as ACTFLLevel,
      feedback: meta.feedback,
      answers: {},
      language: meta.language,
    };
  } catch (error) {
    console.error('Error in getTestSession:', error);
    throw error;
  }
}
