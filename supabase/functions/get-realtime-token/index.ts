import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsFor, preflight } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";

serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const corsHeaders = corsFor(req);

  // Never hand an OpenAI realtime token to an unauthenticated caller.
  const user = await getUser(req);
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  console.log('🔍 Checking API key configuration...', OPENAI_API_KEY ? 'configured' : 'MISSING');

  if (!OPENAI_API_KEY || OPENAI_API_KEY.trim() === '') {
    console.error('❌ OPENAI_API_KEY is not set or empty');
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured in Supabase secrets' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log(`🔑 Creating realtime session...`);
    
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-realtime-2025-08-28",
        voice: "alloy",
        instructions: "You are a friendly AI interviewer conducting an ENGLISH language fluency assessment. You MUST respond ONLY in English at all times, regardless of what language the user speaks or requests. If the user speaks another language or asks you to respond in another language, politely redirect them in English by saying: 'I can only speak English during this assessment. Let's continue in English!' Ask engaging questions about daily life, interests, and experiences. Keep the conversation natural and engaging, but always in English. Be encouraging and keep responses concise.",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1000
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ OpenAI error:", error);
      throw new Error(`OpenAI error: ${error}`);
    }

    const data = await response.json();
    console.log("✅ Session created");
    console.log('🔑 Token path check:', {
      hasClientSecret: !!data.client_secret,
      hasValue: !!data.client_secret?.value,
      tokenPreview: data.client_secret?.value?.substring(0, 15) + '...'
    });

    if (!data.client_secret?.value) {
      console.error('❌ Missing token in response:', JSON.stringify(data, null, 2));
      throw new Error('No ephemeral token in OpenAI response');
    }

    return new Response(
      JSON.stringify({ 
        token: data.client_secret.value,
        expires_at: data.client_secret.expires_at 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
