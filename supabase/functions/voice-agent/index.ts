
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsFor, preflight } from '../_shared/cors.ts';
import { requireCaller } from '../_shared/auth.ts';



serve(async (req) => {
  // Handle CORS preflight requests
  const pre = preflight(req);
  if (pre) return pre;

  const corsHeaders = corsFor(req);

  const caller = await requireCaller(req);
  if (!caller) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { agentId, userMessage, conversationId, audioData, targetLanguage = "Spanish", baseLanguage = "English" } = await req.json();

    if (!agentId) {
      throw new Error('Missing required parameter: agentId');
    }

    // Eleven Labs API key
    const elevenLabsApiKey = Deno.env.get('ELEVEN_LABS_API_KEY');
    if (!elevenLabsApiKey) {
      console.error('ELEVEN_LABS_API_KEY environment variable is not set');
      throw new Error('Language service API key not configured. Please set the ELEVEN_LABS_API_KEY secret in Supabase.');
    }

    console.log(`Voice agent request - Agent ID: ${agentId}, Conversation ID: ${conversationId || 'new'}`);
    
    let response;
    let result;
    
    // If we have audio data, we need to transcribe it first
    if (audioData) {
      // First, transcribe the audio using Whisper API
      const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openAIApiKey) {
        console.error('OPENAI_API_KEY environment variable is not set');
        throw new Error('OpenAI API key not configured. Please set the OPENAI_API_KEY secret in Supabase.');
      }
      
      console.log('Transcribing audio data');
      
      // Convert base64 to binary
      const binary = atob(audioData);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      // Create a blob from the bytes
      const blob = new Blob([bytes], { type: 'audio/webm' });
      
      // Create form data for the Whisper API
      const formData = new FormData();
      formData.append('file', blob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'es'); // Specify Spanish language for better transcription
      
      // Send to Whisper API
      const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
        },
        body: formData,
      });
      
      if (!whisperResponse.ok) {
        const errorText = await whisperResponse.text();
        console.error('OpenAI Whisper API error:', errorText);
        throw new Error(`OpenAI Whisper API error: ${whisperResponse.status} ${whisperResponse.statusText}`);
      }
      
      const whisperData = await whisperResponse.json();
      const transcribedText = whisperData.text;
      console.log('Transcribed text:', transcribedText);
      
      // Now, send the transcribed text to ElevenLabs
      if (conversationId) {
        // Continue conversation with transcribed text
        console.log('Sending transcribed text to ElevenLabs for conversation continuation');
        response = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/${conversationId}/message`, {
          method: 'POST',
          headers: {
            'xi-api-key': elevenLabsApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agent_id: agentId,
            message: transcribedText
          }),
        });
        
        // Return both the transcribed text and the agent's response
        result = {
          userMessage: transcribedText,
          ...(await response.json())
        };
      } else {
        // Just return the transcribed text
        result = { userMessage: transcribedText };
      }
    } else {
      // Determine the endpoint based on whether we're starting a conversation or continuing one
      const endpoint = conversationId
        ? `https://api.elevenlabs.io/v1/convai/conversation/${conversationId}/message`
        : `https://api.elevenlabs.io/v1/convai/conversation/start`;
      
      // Prepare the request body
      const body: Record<string, unknown> = { agent_id: agentId };
      
      // When starting a new conversation, include instructions for Spanish language test
      if (!conversationId) {
        console.log('Starting new conversation with ElevenLabs');
        body.initial_message = `Hi, I'm your ${targetLanguage} conversation partner for today's language assessment. I'll be speaking to you in ${targetLanguage}, and I'd like you to respond in ${targetLanguage} as well. Please introduce yourself and tell me a little about your experience learning ${targetLanguage}.`;
      } else {
        console.log('Continuing conversation with ElevenLabs');
      }
      
      if (userMessage !== undefined) {
        body.message = userMessage;
      }

      // Make request to Eleven Labs API
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Eleven Labs API error:', errorText);
        throw new Error(`Eleven Labs API error: ${response.status} ${response.statusText}`);
      }

      result = await response.json();
      console.log('ElevenLabs response received');
    }
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in voice-agent function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
