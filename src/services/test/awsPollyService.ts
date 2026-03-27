
import { supabase } from '@/integrations/supabase/client';
import { TARGET_LANGUAGE, BASE_LANGUAGE } from '@/config/languageConfig';

// Convert text to speech using AWS Polly
export async function textToSpeech(text: string, voice?: string): Promise<string> {
  try {
    const response = await fetch(`${window.location.origin}/functions/v1/aws-polly`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        text, 
        voice,
        targetLanguage: TARGET_LANGUAGE
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error generating speech: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return data.audioUrl;
  } catch (error) {
    console.error('Error in textToSpeech:', error);
    throw error;
  }
}
