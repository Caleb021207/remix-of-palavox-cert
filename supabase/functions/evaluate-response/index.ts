
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;

// Security headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Security-Policy': "default-src 'none'; script-src 'none';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
};

// Rate limiting function
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const clientData = rateLimitStore.get(ip);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  clientData.count++;
  return true;
}

// Input sanitization
function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 10000); // Limit input length
}

// Validation function
function validateRequestData(data: any): { isValid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid request body' };
  }
  
  const { responseType, content } = data;
  
  if (!responseType || typeof responseType !== 'string') {
    return { isValid: false, error: 'Missing or invalid responseType' };
  }
  
  if (!content || typeof content !== 'string') {
    return { isValid: false, error: 'Missing or invalid content' };
  }
  
  if (content.length > 10000) {
    return { isValid: false, error: 'Content too long (max 10000 characters)' };
  }
  
  const validResponseTypes = ['writing', 'speaking', 'conversation'];
  if (!validResponseTypes.includes(responseType)) {
    return { isValid: false, error: 'Invalid response type' };
  }
  
  return { isValid: true };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(clientIP)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check content length
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit
      return new Response(JSON.stringify({ error: 'Request too large' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let requestData;
    try {
      requestData = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate request data
    const validation = validateRequestData(requestData);
    if (!validation.isValid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      responseType, 
      content, 
      prompt, 
      level, 
      targetLanguage = "Spanish", 
      baseLanguage = "English" 
    } = requestData;

    // Sanitize inputs
    const sanitizedContent = sanitizeInput(content);
    const sanitizedPrompt = prompt ? sanitizeInput(prompt) : undefined;
    const sanitizedLevel = level ? sanitizeInput(level) : undefined;

    if (!responseType || !content) {
      throw new Error('Missing required parameters: responseType, content');
    }

    // OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    // Generate the prompt for evaluation based on the response type (using sanitized inputs)
    const evaluationPrompt = generateEvaluationPrompt(responseType, sanitizedContent, sanitizedPrompt, sanitizedLevel, targetLanguage, baseLanguage);

    // Make request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a specialized ${targetLanguage} language assessment expert who evaluates ${targetLanguage} proficiency according to ACTFL and CEFR standards. 
            You understand the unique challenges that ${baseLanguage} speakers face when learning ${targetLanguage}.
            Provide accurate, fair evaluations with specific feedback designed for ${baseLanguage} speakers learning ${targetLanguage}.`
          },
          {
            role: 'user',
            content: evaluationPrompt
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const evaluationContent = data.choices[0].message.content;
    
    // Parse the evaluation result
    let evaluation = {};
    try {
      evaluation = JSON.parse(evaluationContent);
    } catch (e) {
      console.error('Error parsing evaluation:', e);
      console.log('Raw evaluation content:', evaluationContent);
      throw new Error('Failed to parse evaluation result');
    }

    return new Response(
      JSON.stringify(evaluation),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in evaluate-response function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function generateEvaluationPrompt(
  responseType: string, 
  content: string, 
  prompt: string | undefined, 
  level: string | undefined,
  targetLanguage: string,
  baseLanguage: string
): string {
  switch (responseType) {
    case 'writing':
      return `Evaluate this written ${targetLanguage} language sample from a ${baseLanguage} speaker according to ACTFL and CEFR standards.
      
Original prompt: "${prompt || 'Not provided'}"
Intended level: ${level || 'Not specified'}

Written response: 
"""
${content}
"""

Provide a detailed evaluation in this exact JSON format:
{
  "score": 85, // A numerical score from 0-100
  "cefr_level": "B1", // One of: A1, A2, B1, B2, C1, C2
  "actfl_level": "Intermediate Mid", // One of: Novice Low, Novice Mid, Novice High, Intermediate Low, Intermediate Mid, Intermediate High, Advanced Low, Advanced Mid, Advanced High, Superior, Distinguished
  "feedback": {
    "strengths": ["...", "...", "..."], // 2-3 specific strengths
    "areas_for_improvement": ["...", "...", "..."], // 2-3 areas for improvement
    "vocabulary": "...", // Brief assessment of ${targetLanguage} vocabulary use
    "grammar": "...", // Brief assessment of grammatical accuracy in ${targetLanguage}
    "coherence": "...", // Brief assessment of logical flow and organization
    "spanish_specific": "..." // Specific feedback on ${targetLanguage} language features (verb conjugation, gender agreement, idiomatic expressions, etc.)
  },
  "summary": "..." // A 2-3 sentence overall evaluation
}

Make sure your evaluation is accurate, fair, and aligned with standard ACTFL and CEFR proficiency guidelines specifically for ${baseLanguage} speakers learning ${targetLanguage}.
Focus on common errors made by ${baseLanguage} speakers in ${targetLanguage} such as false cognates, gender agreement, use of ser/estar, subjunctive mood, etc.`;

    case 'speaking':
      return `Evaluate this ${targetLanguage} speaking/conversation sample from a ${baseLanguage} speaker according to ACTFL and CEFR standards.

Conversation transcript:
"""
${content}
"""

Intended level: ${level || 'Not specified'}

When evaluating the conversation, focus ONLY on the user's responses (not the agent's prompts). 
Analyze the user's ability to communicate in ${targetLanguage} by examining:
1. The linguistic complexity of their responses
2. Accuracy of grammar and vocabulary
3. Fluency and natural flow of speech
4. Ability to respond appropriately to different topics and questions
5. Overall communicative competence in ${targetLanguage}

Provide a detailed evaluation in this exact JSON format:
{
  "score": 85, // A numerical score from 0-100
  "cefr_level": "B1", // One of: A1, A2, B1, B2, C1, C2
  "actfl_level": "Intermediate Mid", // One of: Novice Low, Novice Mid, Novice High, Intermediate Low, Intermediate Mid, Intermediate High, Advanced Low, Advanced Mid, Advanced High, Superior, Distinguished
  "feedback": {
    "strengths": ["...", "...", "..."], // 2-3 specific strengths
    "areas_for_improvement": ["...", "...", "..."], // 2-3 areas for improvement
    "fluency": "...", // Brief assessment of speaking fluency in ${targetLanguage}
    "pronunciation": "...", // Brief assessment of ${targetLanguage} pronunciation accuracy, focusing on phonemes challenging for ${baseLanguage} speakers
    "vocabulary": "...", // Brief assessment of ${targetLanguage} vocabulary use
    "grammar": "...", // Brief assessment of grammatical accuracy in ${targetLanguage}
    "interaction": "...", // Brief assessment of conversational skills in ${targetLanguage}
    "spanish_specific": "..." // Specific feedback on ${targetLanguage} language features (verb conjugation, gender agreement, idiomatic expressions, etc.)
  },
  "summary": "..." // A 2-3 sentence overall evaluation
}

Make sure your evaluation is accurate, fair, and aligned with standard ACTFL and CEFR proficiency guidelines specifically for ${baseLanguage} speakers learning ${targetLanguage}.
Focus on common pronunciation challenges for ${baseLanguage} speakers such as rolled 'r', 'ñ', and vowel pronunciation.`;

    default:
      return `Evaluate this ${targetLanguage} language sample from a ${baseLanguage} speaker according to ACTFL and CEFR standards.

Content:
"""
${content}
"""

Provide a detailed evaluation in JSON format with score, proficiency level, strengths, areas for improvement, and overall summary.
Focus on issues specific to ${baseLanguage} speakers learning ${targetLanguage}.`;
  }
}
