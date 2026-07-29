import { supabase } from '@/integrations/supabase/client';
import { submitPhase } from './secureTestService';

/**
 * Client gateway to the persistent item bank.
 *
 * The browser receives items with option labels only — `is_correct` and the
 * option rationales never leave the server. Scoring happens in `submit-phase`.
 */

export type BankSkill = 'reading' | 'listening';

export interface BankOption {
  id: string;
  label: string;
  position: number;
}

export interface BankItem {
  id: string;
  position: number;
  stem: string;
  format: string;
  skill: BankSkill;
  cefrLevel: string | null;
  topic: string | null;
  audioUrl: string | null;
  passage: { id: string; title: string | null; body: string; audioStatus: string | null } | null;
  options: BankOption[];
}

export interface AssembledForm {
  formId: string;
  skill: BankSkill;
  totalItems: number;
  items: BankItem[];
}

export async function assembleForm(sessionId: string, skill: BankSkill): Promise<AssembledForm> {
  const { data, error } = await supabase.functions.invoke('assemble-form', {
    body: { sessionId, skill },
  });
  if (error) throw new Error(error.message || 'Could not load your practice form');
  if (!data || (data as { error?: string }).error) {
    throw new Error((data as { error?: string })?.error || 'Could not load your practice form');
  }
  return data as AssembledForm;
}

export interface BankPhaseResult {
  score: number;
  band: string | null;
  widaLevel: number | null;
  widaLow: number | null;
  widaHigh: number | null;
  cefrBand: string | null;
  sem: number | null;
}

/** Submits raw answers (itemId → optionId). The server returns the band. */
export async function submitBankForm(params: {
  sessionId: string;
  skill: BankSkill;
  formId: string;
  answers: Record<string, string>;
}): Promise<BankPhaseResult> {
  const result = await submitPhase({
    sessionId: params.sessionId,
    phase: params.skill,
    responses: { formId: params.formId, answers: params.answers },
  });
  const fb = (result.feedback ?? {}) as Record<string, unknown>;
  return {
    score: result.score,
    band: (fb.band as string) ?? null,
    widaLevel: (fb.widaLevel as number) ?? null,
    widaLow: (fb.widaLow as number) ?? null,
    widaHigh: (fb.widaHigh as number) ?? null,
    cefrBand: (fb.cefrBand as string) ?? null,
    sem: (fb.sem as number) ?? null,
  };
}

export interface ProficiencyResultRow {
  id: string;
  skill: string;
  scaled_score: number;
  sem: number | null;
  wida_level: number | null;
  wida_low: number | null;
  wida_high: number | null;
  cefr_band: string | null;
  n_scored: number;
  n_correct: number;
  test_window: string | null;
  created_at: string;
}

/** Reads the server-written practice results for a session (RLS: own rows only). */
export async function fetchProficiencyResults(sessionId: string): Promise<ProficiencyResultRow[]> {
  const { data, error } = await supabase
    .from('proficiency_results' as never)
    .select('*')
    .eq('session_id', sessionId);
  if (error) {
    console.warn('Could not load proficiency results:', error.message);
    return [];
  }
  return (data ?? []) as unknown as ProficiencyResultRow[];
}
