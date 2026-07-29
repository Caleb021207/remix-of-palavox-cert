
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { text, voice, targetLanguage } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    // Determine the voice based on target language if not provided
    let voiceId = voice || 'Joanna'; // Default to Joanna (English)
    
    if (!voice && targetLanguage) {
      // Map language to an appropriate AWS Polly voice
      if (targetLanguage.toLowerCase().includes('spanish')) {
        voiceId = 'Lupe'; // Spanish (US) female
      } else if (targetLanguage.toLowerCase().includes('french')) {
        voiceId = 'Léa'; // French female
      } else if (targetLanguage.toLowerCase().includes('german')) {
        voiceId = 'Vicki'; // German female
      }
    }

    // Get AWS credentials from environment
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const region = Deno.env.get('AWS_REGION') || 'us-east-1';

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not configured');
    }

    // Create AWS Signature Version 4
    const endpoint = `https://polly.${region}.amazonaws.com/v1/speech`;
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    
    const payload = JSON.stringify({
      OutputFormat: 'mp3',
      Text: text,
      TextType: 'text',
      VoiceId: voiceId,
      Engine: 'neural' // Use neural for better quality if available for the voice
    });

    // AWS request headers
    const headers = new Headers();
    headers.set('Host', `polly.${region}.amazonaws.com`);
    headers.set('Content-Type', 'application/json');
    headers.set('X-Amz-Date', amzDate);
    
    // Make the direct request to AWS Polly
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: payload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AWS Polly error:', errorText);
      throw new Error(`AWS Polly error: ${response.status} ${response.statusText}`);
    }

    // Get the audio data
    const audioBuffer = await response.arrayBuffer();
    
    // Convert to base64 for easier transmission
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    
    console.log('Successfully generated speech');
    
    return new Response(
      JSON.stringify({ 
        audioUrl: `data:audio/mp3;base64,${base64Audio}` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Error in AWS Polly function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
