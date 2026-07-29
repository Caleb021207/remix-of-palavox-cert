import { supabase } from '@/integrations/supabase/client';

/**
 * The single client-side gateway to the secure exam pipeline.
 *
 * Every score in this application is produced by an edge function running
 * with the service role and graded against server-held answer keys. The
 * browser only ever submits raw answers and renders what the server returns —
 * there is deliberately no scoring, weighting or recalculation in this file.
 */

export type ExamPhase =
  | 'comprehension'
  | 'reading'
  | 'listening'
  | 'writing'
  | 'speaking'
  | 'conversation';

export interface PhaseResultFromServer {
  score: number;
  cefr_level: string;
  actfl_level: string;
  feedback: Record<string, unknown>;
}

export interface OverallResultFromServer {
  overall_score: number;
  overall_cefr: string;
  functional_label: string;
  confidence_band: string | null;
  retake_recommended: boolean | null;
  strengths: string[] | null;
  next_steps: string[] | null;
  sections: Record<string, { score: number | null; cefr: string | null }>;
}

export interface ServerCertificate {
  id: string;
  verification_code: string;
  holder_name: string | null;
  cefr_level: string;
  functional_label: string | null;
  overall_score: number | null;
  issued_at: string;
  expires_at: string | null;
  revoked: boolean | null;
}

function unwrap<T>(data: T | null, error: { message: string } | null, fallback: string): T {
  if (error) throw new Error(error.message || fallback);
  if (!data) throw new Error(fallback);
  const maybe = data as unknown as { error?: string };
  if (maybe?.error) throw new Error(maybe.error);
  return data;
}

/** Creates the test session server-side. The browser cannot insert sessions. */
export async function startSession(params: {
  testType?: string;
  language?: string;
  singlePhase?: string | null;
}): Promise<{ sessionId: string; startedAt: string; expiresAt: string | null }> {
  const { data, error } = await supabase.functions.invoke('start-session', {
    body: {
      testType: params.testType ?? 'certification',
      language: params.language ?? 'english',
      singlePhase: params.singlePhase ?? null,
    },
  });
  return unwrap(data, error, 'Could not start your test session');
}

/** Submits raw answers for one phase. The returned score is authoritative. */
export async function submitPhase(params: {
  sessionId: string;
  phase: ExamPhase;
  responses: Record<string, unknown>;
  targetLanguage?: string;
}): Promise<PhaseResultFromServer> {
  const { data, error } = await supabase.functions.invoke('submit-phase', {
    body: {
      sessionId: params.sessionId,
      phase: params.phase,
      responses: params.responses,
      targetLanguage: params.targetLanguage ?? 'English',
    },
  });
  return unwrap(data, error, 'Could not score this section');
}

/**
 * Asks the server whether a single adaptive answer was correct so the
 * adaptive engine can pick the next difficulty. Returns only a boolean.
 */
export async function gradeAnswer(params: {
  sessionId: string;
  questionId: string;
  selectedOptionId: string;
  section?: string;
  responseTimeMs?: number;
}): Promise<{ isCorrect: boolean; level: string | null }> {
  const { data, error } = await supabase.functions.invoke('grade-answer', { body: params });
  return unwrap(data, error, 'Could not grade this answer');
}

/** Aggregates every section score server-side and finalizes the session. */
export async function finalizeTest(sessionId: string): Promise<OverallResultFromServer> {
  const { data, error } = await supabase.functions.invoke('finalize-test', {
    body: { session_id: sessionId },
  });
  const payload = unwrap(data, error, 'Could not finalize your test');
  return (payload as { result: OverallResultFromServer }).result;
}

/** Issues (or returns the existing) signed, server-stored certificate. */
export async function issueCertificate(sessionId: string): Promise<ServerCertificate> {
  const { data, error } = await supabase.functions.invoke('issue-certificate', {
    body: { sessionId },
  });
  const payload = unwrap(data, error, 'Could not issue your certificate');
  return (payload as { certificate: ServerCertificate }).certificate;
}

export interface VerificationResult {
  valid: boolean;
  reason?: string;
  error?: string;
  certificate?: {
    id: string;
    verificationCode: string;
    holderName: string | null;
    cefrLevel: string;
    functionalLabel: string | null;
    overallScore: number | null;
    issuedAt: string;
    expiresAt: string | null;
  };
  disclaimer?: string;
}

/** Public lookup used by /verify — no authentication required. */
export async function verifyCertificate(idOrCode: string): Promise<VerificationResult> {
  const { data, error } = await supabase.functions.invoke('verify-certificate', {
    body: idOrCode.startsWith('PVX-') ? { code: idOrCode } : { id: idOrCode },
  });
  if (error && !data) {
    return { valid: false, error: 'Verification service is unavailable. Please try again.' };
  }
  return (data ?? { valid: false, error: 'No response from verification service' }) as VerificationResult;
}

/**
 * Reads the finalized, server-written results for a session.
 * RLS only ever returns rows belonging to the signed-in student.
 */
export async function fetchSessionResults(sessionId: string) {
  const [{ data: overall }, { data: sections }, { data: session }] = await Promise.all([
    supabase.from('scores_overall').select('*').eq('session_id', sessionId).maybeSingle(),
    supabase
      .from('scores_section')
      .select('*, test_sections!inner(section_type, session_id)')
      .eq('test_sections.session_id', sessionId),
    supabase.from('test_sessions').select('*').eq('id', sessionId).maybeSingle(),
  ]);

  const { data: certificate } = await supabase
    .from('certificates')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  return { overall, sections: sections ?? [], session, certificate };
}
