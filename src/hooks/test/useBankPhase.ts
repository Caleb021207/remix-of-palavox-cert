import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  assembleForm,
  submitBankForm,
  type AssembledForm,
  type BankItem,
  type BankSkill,
} from '@/services/test/itemBankService';

interface UseBankPhaseProps {
  sessionId: string;
  skill: BankSkill;
  onComplete: (score: number) => void;
}

/**
 * Drives a fixed, bank-assembled practice form.
 * No scoring happens here — answers are posted raw and the server replies
 * with the scaled score and level band.
 */
export const useBankPhase = ({ sessionId, skill, onComplete }: UseBankPhaseProps) => {
  const [form, setForm] = useState<AssembledForm | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const assembled = await assembleForm(sessionId, skill);
        if (cancelled) return;
        setForm(assembled);
      } catch (e) {
        if (cancelled) return;
        const message = (e as Error).message || 'Could not load your practice form';
        setError(message);
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, skill]);

  const items: BankItem[] = useMemo(() => form?.items ?? [], [form]);
  const currentItem = items[index] ?? null;
  const answeredCount = Object.keys(answers).length;

  const selectOption = useCallback((itemId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [itemId]: optionId }));
  }, []);

  const submit = useCallback(
    async (finalAnswers: Record<string, string>) => {
      if (!form) return;
      setSubmitting(true);
      try {
        const result = await submitBankForm({
          sessionId,
          skill,
          formId: form.formId,
          answers: finalAnswers,
        });
        if (result.band) {
          toast.success(`Practice result: ${result.band}`);
        }
        onComplete(result.score);
      } catch (e) {
        toast.error((e as Error).message || 'Could not submit your answers');
      } finally {
        setSubmitting(false);
      }
    },
    [form, sessionId, skill, onComplete],
  );

  const next = useCallback(() => {
    if (!currentItem) return;
    if (!answers[currentItem.id]) {
      toast.error('Please choose an answer first.');
      return;
    }
    if (index < items.length - 1) {
      setIndex((i) => i + 1);
    } else {
      void submit(answers);
    }
  }, [answers, currentItem, index, items.length, submit]);

  return {
    form,
    items,
    currentItem,
    index,
    answers,
    answeredCount,
    totalItems: items.length,
    loading,
    submitting,
    error,
    selectOption,
    next,
  };
};
