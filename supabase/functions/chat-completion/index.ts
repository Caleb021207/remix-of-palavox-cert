
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, conversationHistory, targetLanguage, baseLanguage } = await req.json();

    if (!transcript) {
      throw new Error('Transcript is required');
    }

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Build the messages array for the ChatGPT request
    let messages = [
      {
        role: "system",
        content: `You are a helpful assistant for language assessment. 
        You should respond in ${targetLanguage || 'Spanish'} to help the user practice their language skills.
        Keep responses conversational, natural, and appropriate for the user's apparent language level.
        Ask follow-up questions to encourage them to speak more.
        Your responses should be 1-3 sentences long to keep the conversation flowing.`
      }
    ];

    // Add conversation history if available
    if (conversationHistory) {
      const historyLines = conversationHistory.split('\n');
      for (const line of historyLines) {
        if (line.startsWith('User:')) {
          messages.push({
            role: "user",
            content: line.substring(5).trim() // Remove "User: " prefix
          });
        } else if (line.startsWith('Agent:')) {
          messages.push({
            role: "assistant",
            content: line.substring(6).trim() // Remove "Agent: " prefix
          });
        }
      }
    }

    // Add the current transcript as the user message
    messages.push({
      role: "user",
      content: transcript
    });

    // Make the request to OpenAI API
    console.log('Sending request to OpenAI with messages:', JSON.stringify(messages));
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Modern model with good performance and reasonable cost
        messages: messages,
        temperature: 0.7, // Slightly creative responses
        max_tokens: 200, // Limit response length
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const chatResponse = data.choices[0].message.content;
    
    console.log('Chat response received:', chatResponse);

    return new Response(
      JSON.stringify({ response: chatResponse }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Error in chat completion function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
