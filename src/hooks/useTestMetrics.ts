import { supabase } from '@/integrations/supabase/client';

export const OPENAI_PRICING = {
  'gpt-4o-mini': {
    input: 0.00015,  // per 1K tokens
    output: 0.0006   // per 1K tokens
  },
  'gpt-5': {
    input: 0.003,    // per 1K tokens
    output: 0.015    // per 1K tokens
  },
  'tts-1': 0.000015,      // per character
  'tts-1-hd': 0.000030,   // per character
  'whisper-1': 0.0001,    // per second
  'gpt-4o-transcribe': 0.0001,  // per second
  'gpt-realtime': 0.001   // per second
};

export interface TestMetrics {
  testSessionId: string;
  modelGen: string;
  modelGrade: string;
  llmTokensIn: number;
  llmTokensOut: number;
  ttsCharacters: number;
  sttSeconds: number;
  realtimeSeconds: number;
  estimatedCostUsd: number;
}

export function useTestMetrics() {
  const getOrCreateMetrics = async (testSessionId: string): Promise<any> => {
    const { data: existing } = await supabase
      .from('cert_metrics')
      .select('*')
      .eq('test_session_id', testSessionId)
      .maybeSingle();

    return existing;
  };

  const trackTokens = async (
    testSessionId: string,
    model: string,
    tokensIn: number,
    tokensOut: number
  ): Promise<void> => {
    try {
      const existing = await getOrCreateMetrics(testSessionId);
      const cost = calculateTokenCost(model, tokensIn, tokensOut);

      if (existing) {
        await supabase
          .from('cert_metrics')
          .update({
            llm_tokens_in: existing.llm_tokens_in + tokensIn,
            llm_tokens_out: existing.llm_tokens_out + tokensOut,
            estimated_cost_usd: existing.estimated_cost_usd + cost
          })
          .eq('test_session_id', testSessionId);
      } else {
        await supabase.from('cert_metrics').insert({
          test_session_id: testSessionId,
          model_gen: model,
          model_grade: model,
          llm_tokens_in: tokensIn,
          llm_tokens_out: tokensOut,
          estimated_cost_usd: cost
        });
      }

      console.log(`📊 Tracked ${tokensIn} in / ${tokensOut} out tokens for ${model} ($${cost.toFixed(4)})`);
    } catch (error) {
      console.error('Error tracking tokens:', error);
    }
  };

  const trackTTS = async (
    testSessionId: string, 
    characters: number, 
    model: 'tts-1' | 'tts-1-hd' = 'tts-1'
  ): Promise<void> => {
    try {
      const existing = await getOrCreateMetrics(testSessionId);
      const cost = characters * OPENAI_PRICING[model];

      if (existing) {
        await supabase
          .from('cert_metrics')
          .update({
            tts_characters: existing.tts_characters + characters,
            estimated_cost_usd: existing.estimated_cost_usd + cost
          })
          .eq('test_session_id', testSessionId);
      } else {
        await supabase.from('cert_metrics').insert({
          test_session_id: testSessionId,
          tts_characters: characters,
          estimated_cost_usd: cost
        });
      }

      console.log(`🔊 Tracked ${characters} TTS characters for ${model} ($${cost.toFixed(4)})`);
    } catch (error) {
      console.error('Error tracking TTS:', error);
    }
  };

  const trackSTT = async (
    testSessionId: string, 
    seconds: number,
    model: 'whisper-1' | 'gpt-4o-transcribe' = 'whisper-1'
  ): Promise<void> => {
    try {
      const existing = await getOrCreateMetrics(testSessionId);
      const cost = seconds * OPENAI_PRICING[model];

      if (existing) {
        await supabase
          .from('cert_metrics')
          .update({
            stt_seconds: existing.stt_seconds + seconds,
            estimated_cost_usd: existing.estimated_cost_usd + cost
          })
          .eq('test_session_id', testSessionId);
      } else {
        await supabase.from('cert_metrics').insert({
          test_session_id: testSessionId,
          stt_seconds: seconds,
          estimated_cost_usd: cost
        });
      }

      console.log(`🎤 Tracked ${seconds}s STT for ${model} ($${cost.toFixed(4)})`);
    } catch (error) {
      console.error('Error tracking STT:', error);
    }
  };

  const trackRealtime = async (
    testSessionId: string,
    seconds: number
  ): Promise<void> => {
    try {
      const existing = await getOrCreateMetrics(testSessionId);
      const cost = seconds * OPENAI_PRICING['gpt-realtime'];

      if (existing) {
        await supabase
          .from('cert_metrics')
          .update({
            realtime_seconds: existing.realtime_seconds + seconds,
            estimated_cost_usd: existing.estimated_cost_usd + cost
          })
          .eq('test_session_id', testSessionId);
      } else {
        await supabase.from('cert_metrics').insert({
          test_session_id: testSessionId,
          realtime_seconds: seconds,
          estimated_cost_usd: cost
        });
      }

      console.log(`💬 Tracked ${seconds}s realtime for gpt-realtime ($${cost.toFixed(4)})`);
    } catch (error) {
      console.error('Error tracking realtime:', error);
    }
  };

  const getTestCost = async (testSessionId: string): Promise<number> => {
    try {
      const { data } = await supabase
        .from('cert_metrics')
        .select('estimated_cost_usd')
        .eq('test_session_id', testSessionId)
        .maybeSingle();

      return data?.estimated_cost_usd || 0;
    } catch (error) {
      console.error('Error getting test cost:', error);
      return 0;
    }
  };

  return { 
    trackTokens, 
    trackTTS, 
    trackSTT, 
    trackRealtime,
    getTestCost 
  };
}

function calculateTokenCost(model: string, tokensIn: number, tokensOut: number): number {
  const pricing = OPENAI_PRICING[model as keyof typeof OPENAI_PRICING];
  if (!pricing || typeof pricing === 'number') return 0;
  
  return ((tokensIn / 1000) * pricing.input) + ((tokensOut / 1000) * pricing.output);
}
