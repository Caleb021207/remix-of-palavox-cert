
import { supabase } from '@/integrations/supabase/client';
import { TARGET_LANGUAGE, BASE_LANGUAGE } from '@/config/languageConfig';

// Get response from ChatGPT for conversation
export async function getChatResponse(
  transcript: string,
  conversationHistory: string,
  targetLanguage: string = TARGET_LANGUAGE,
  baseLanguage: string = BASE_LANGUAGE
): Promise<string> {
  try {
    const response = await fetch(`${window.location.origin}/functions/v1/chat-completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        transcript,
        conversationHistory,
        targetLanguage,
        baseLanguage
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error getting chat response: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error in getChatResponse:', error);
    throw error;
  }
}
