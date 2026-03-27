
import { TARGET_LANGUAGE } from '@/config/languageConfig';

// Convert text to speech using Azure Cognitive Services Speech
export async function textToSpeech(text: string, voice?: string): Promise<string> {
  try {
    console.log('Calling Azure Speech service for text:', text.substring(0, 50) + '...');
    
    const response = await fetch(`https://jyvmhtterlpszklhgjwp.supabase.co/functions/v1/azure-speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dm1odHRlcmxwc3prbGhnandwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4Mzg3NDYsImV4cCI6MjA2MjQxNDc0Nn0.kDkcgjQ321V3Mi0CzvwUrKdIvClt51lQeKPDTCnj24E`
      },
      body: JSON.stringify({ 
        text, 
        voice,
        targetLanguage: TARGET_LANGUAGE
      }),
    });

    if (!response.ok) {
      console.error('Azure Speech service response error:', response.status, response.statusText);
      
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        console.error('Could not parse error response:', parseError);
      }
      
      throw new Error(`Error generating speech: ${errorMessage}`);
    }

    const data = await response.json();
    console.log('Azure Speech service response successful');
    
    if (!data.audioUrl) {
      throw new Error('No audio URL received from Azure Speech service');
    }
    
    return data.audioUrl;
  } catch (error) {
    console.error('Error in textToSpeech:', error);
    throw error;
  }
}
