
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple and reliable base64 conversion
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Validate audio data URL
function validateAudioDataUrl(dataUrl: string): boolean {
  if (!dataUrl.startsWith('data:audio/mp3;base64,')) {
    console.error('Invalid data URL format');
    return false;
  }
  
  const base64Part = dataUrl.split(',')[1];
  if (!base64Part || base64Part.length < 1000) {
    console.error('Base64 data too short:', base64Part?.length || 0);
    return false;
  }
  
  // Test if base64 is valid by trying to decode a small portion
  try {
    atob(base64Part.substring(0, 100));
    return true;
  } catch (error) {
    console.error('Invalid base64 data:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice, targetLanguage } = await req.json();
    console.log('Azure Speech request received:', { textLength: text?.length, voice, targetLanguage });

    if (!text) {
      throw new Error('Text is required');
    }

    // Get Azure Speech credentials from environment
    const speechKey = Deno.env.get('AZURE_SPEECH_KEY');
    const speechRegion = Deno.env.get('AZURE_SPEECH_REGION') || 'eastus';

    if (!speechKey) {
      console.error('Azure Speech key not configured');
      throw new Error('Azure Speech credentials not configured');
    }

    // Determine the voice based on target language if not provided
    let voiceName = voice || 'en-US-JennyNeural'; // Default to Jenny (English)
    
    if (!voice && targetLanguage) {
      // Map language to an appropriate Azure Speech voice
      const langLower = targetLanguage.toLowerCase();
      if (langLower.includes('spanish')) {
        voiceName = 'es-ES-ElviraNeural'; // Spanish (Spain) female
      } else if (langLower.includes('french')) {
        voiceName = 'fr-FR-DeniseNeural'; // French female
      } else if (langLower.includes('german')) {
        voiceName = 'de-DE-KatjaNeural'; // German female
      } else if (langLower.includes('italian')) {
        voiceName = 'it-IT-ElsaNeural'; // Italian female
      } else if (langLower.includes('portuguese')) {
        voiceName = 'pt-BR-FranciscaNeural'; // Portuguese (Brazil) female
      }
    }

    console.log('Using Azure Speech voice:', voiceName);

    // Create SSML content
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="${voiceName}">
          <prosody rate="medium" pitch="medium">
            ${text}
          </prosody>
        </voice>
      </speak>
    `;

    // Make request to Azure Speech Service
    const speechEndpoint = `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;
    
    console.log('Making request to Azure Speech API...');
    const response = await fetch(speechEndpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': speechKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        'User-Agent': 'Lovable-Language-Platform'
      },
      body: ssml,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure Speech API error:', response.status, errorText);
      throw new Error(`Azure Speech error: ${response.status} ${response.statusText}`);
    }

    console.log('Azure Speech API response successful');
    
    // Get the audio data
    const audioBuffer = await response.arrayBuffer();
    console.log('Audio buffer size:', audioBuffer.byteLength);
    
    // Validate buffer size
    if (audioBuffer.byteLength < 1000) {
      console.error('Audio buffer too small, likely invalid');
      throw new Error('Generated audio is too small');
    }
    
    // Convert to base64 using simplified method
    const base64Audio = arrayBufferToBase64(audioBuffer);
    console.log('Base64 conversion completed, length:', base64Audio.length);
    
    // Create data URL
    const audioDataUrl = `data:audio/mp3;base64,${base64Audio}`;
    
    // Validate the audio data URL
    if (!validateAudioDataUrl(audioDataUrl)) {
      throw new Error('Generated audio data is invalid');
    }
    
    console.log('Successfully generated speech with Azure, audio validation passed');
    
    return new Response(
      JSON.stringify({ 
        audioUrl: audioDataUrl 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Error in Azure Speech function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
