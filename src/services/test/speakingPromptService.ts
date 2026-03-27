
import { LanguageCode } from '@/config/languages';
import { EnglishTestVariant } from '@/config/languages/englishVariants';
import { supabase } from '@/integrations/supabase/client';

interface SpeakingPrompt {
  level: string;
  prompt: string;
  expectedDuration: string;
  instructions: string;
}

export async function generateSpeakingPrompts(
  languageCode?: LanguageCode,
  englishVariant?: EnglishTestVariant
): Promise<{ prompts: SpeakingPrompt[] }> {
  try {
    // All tests are English proficiency tests now
    let targetLanguage = 'English';
    let baseLanguage = 'English';
    
    if (languageCode) {
      // Extract target language from language config
      const { languages } = await import('@/config/languages');
      if (languages[languageCode]) {
        targetLanguage = languages[languageCode].targetLanguage;
      }
    }

    console.log('🎤 Generating speaking prompts:', { targetLanguage, baseLanguage });

    const { data, error } = await supabase.functions.invoke('generate-speaking-prompts', {
      body: {
        targetLanguage,
        baseLanguage,
      },
    });

    if (error) {
      console.warn('Edge function error for speaking prompts:', error);
      // Use any prompts returned alongside the error if available
      const errorAny: any = error as any;
      const promptsFromError = errorAny?.context?.response?.prompts;
      if (Array.isArray(promptsFromError) && promptsFromError.length) {
        return { prompts: promptsFromError as SpeakingPrompt[] };
      }
      // Local fallback
      return { prompts: getLocalFallbackSpeakingPrompts() };
    }

    if (!data || !Array.isArray((data as any).prompts)) {
      console.warn('Unexpected response from speaking prompts function, using local fallback');
      return { prompts: getLocalFallbackSpeakingPrompts() };
    }

    return data as { prompts: SpeakingPrompt[] };
  } catch (error) {
    console.error('Error in generateSpeakingPrompts:', error);
    // Final local fallback to ensure the UI always has prompts
    return { prompts: getLocalFallbackSpeakingPrompts() };
  }
}

function getLocalFallbackSpeakingPrompts(): SpeakingPrompt[] {
  return [
    {
      level: 'Novice',
      prompt: 'Tell me about your typical day. What do you usually do in the morning?',
      expectedDuration: '30-45 seconds',
      instructions: "Speak naturally about your daily routine. Take your time and don't worry about perfect grammar.",
    },
    {
      level: 'Intermediate',
      prompt: "Describe a place you'd like to visit and explain why it interests you.",
      expectedDuration: '45-60 seconds',
      instructions: "Share your thoughts naturally. It's okay to pause and think - that's normal in conversation.",
    },
    {
      level: 'Advanced',
      prompt: "What's your opinion on how technology has changed communication between people?",
      expectedDuration: '60-90 seconds',
      instructions: 'Express your views and reasoning. Natural speech patterns and corrections are expected.',
    },
  ];
}