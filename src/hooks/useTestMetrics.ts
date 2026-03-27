// Legacy metrics hook — will be replaced with Gemini-based cost tracking
// Stubbed to prevent build errors

export interface TestMetrics {
  testSessionId: string;
  estimatedCostUsd: number;
}

export function useTestMetrics() {
  const trackTokens = async (testSessionId: string, model: string, tokensIn: number, tokensOut: number): Promise<void> => {
    console.log(`📊 [stub] Tracked ${tokensIn}/${tokensOut} tokens for ${model}`);
  };

  const trackTTS = async (testSessionId: string, characters: number): Promise<void> => {
    console.log(`🔊 [stub] Tracked ${characters} TTS characters`);
  };

  const trackSTT = async (testSessionId: string, seconds: number): Promise<void> => {
    console.log(`🎤 [stub] Tracked ${seconds}s STT`);
  };

  const trackRealtime = async (testSessionId: string, seconds: number): Promise<void> => {
    console.log(`💬 [stub] Tracked ${seconds}s realtime`);
  };

  const getTestCost = async (testSessionId: string): Promise<number> => 0;

  return { trackTokens, trackTTS, trackSTT, trackRealtime, getTestCost };
}
