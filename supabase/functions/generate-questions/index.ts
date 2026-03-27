
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from './utils.ts';
import { generateThemeVariations } from './utils.ts';
import { generateCognitivelyEnhancedPrompt } from './enhancedPromptGenerator.ts';
import { formatQuestions, cleanOpenAIResponse } from './questionProcessor.ts';
import { validateQuestionComplexity, generateValidationReport } from './questionValidation.ts';

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Lower limit for resource-intensive operations

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

// Input validation function
function validateGenerationRequest(data: any): { isValid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid request body' };
  }
  
  const { testType, level, count, targetLanguage, baseLanguage } = data;
  
  if (!testType || typeof testType !== 'string') {
    return { isValid: false, error: 'Missing or invalid testType' };
  }
  
  if (!level || typeof level !== 'string') {
    return { isValid: false, error: 'Missing or invalid level' };
  }
  
  if (!count || typeof count !== 'number' || count <= 0 || count > 50) {
    return { isValid: false, error: 'Invalid count (must be between 1 and 50)' };
  }
  
  const validTestTypes = ['reading', 'listening', 'speaking', 'writing', 'pronunciation'];
  if (!validTestTypes.includes(testType)) {
    return { isValid: false, error: 'Invalid test type' };
  }
  
  const validLevels = ['novice', 'intermediate', 'advanced'];
  if (!validLevels.includes(level)) {
    return { isValid: false, error: 'Invalid level' };
  }
  
  const validLanguages = ['spanish', 'english', 'french', 'german', 'italian', 'portuguese'];
  if (targetLanguage && !validLanguages.includes(targetLanguage)) {
    return { isValid: false, error: 'Invalid target language' };
  }
  
  if (baseLanguage && !validLanguages.includes(baseLanguage)) {
    return { isValid: false, error: 'Invalid base language' };
  }
  
  return { isValid: true };
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
    if (contentLength && parseInt(contentLength) > 1024 * 100) { // 100KB limit for generation requests
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
    const validation = validateGenerationRequest(requestData);
    if (!validation.isValid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { testType, level, count, targetLanguage, baseLanguage, language, batchMode } = requestData;
    
    console.log(`🎯 Generating ${count} cognitively enhanced ${testType} questions for ${level} in ${targetLanguage}`);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const themes = generateThemeVariations(testType, level);
    const allQuestions = [];
    
    for (const theme of themes.slice(0, Math.ceil(count / 5))) {
      const questionsPerTheme = Math.min(5, count - allQuestions.length);
      
      // Generate enhanced prompt with cognitive complexity
      const enhancedPrompt = generateCognitivelyEnhancedPrompt(
        testType, 
        level, 
        questionsPerTheme,
        targetLanguage, 
        baseLanguage, 
        theme
      );
      
      console.log(`🧠 Generating ${questionsPerTheme} questions with cognitive complexity for ${level}`);
      
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
              content: `You are an expert in cognitive assessment and ${targetLanguage} language testing. You create questions that accurately test specific cognitive levels using Bloom's Taxonomy. Your questions must be impossible to answer correctly without the required cognitive skills for the specified CEFR level.` 
            },
            { role: 'user', content: enhancedPrompt }
          ],
          temperature: 0.3, // Lower temperature for more consistent cognitive targeting
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const cleanedContent = cleanOpenAIResponse(content);
      
      let questions;
      try {
        questions = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('Failed to parse questions:', parseError);
        continue;
      }

      // Validate cognitive complexity
      const validationReport = generateValidationReport(questions, level, enhancedPrompt);
      console.log('📊 Cognitive Validation Report:\n', validationReport);
      
      // Filter questions that meet cognitive standards
      const validatedQuestions = questions.filter((q: any) => {
        const analysis = validateQuestionComplexity(q, level, enhancedPrompt);
        return analysis.meetsStandards;
      });

      if (validatedQuestions.length === 0) {
        console.log(`⚠️ No questions met cognitive standards for ${level}, retrying with adjusted prompt...`);
        continue;
      }

      console.log(`✅ ${validatedQuestions.length}/${questions.length} questions passed cognitive validation`);
      
      const formattedQuestions = formatQuestions(validatedQuestions, testType, level, language, theme);
      allQuestions.push(...formattedQuestions);
      
      if (allQuestions.length >= count) break;
    }

    // Save to database
    if (allQuestions.length > 0) {
      const { data: insertedQuestions, error: insertError } = await supabase
        .from('questions')
        .insert(allQuestions)
        .select();

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw insertError;
      }

      console.log(`✅ Successfully generated and saved ${insertedQuestions?.length || 0} cognitively enhanced questions`);
      
      return new Response(JSON.stringify({
        success: true,
        generated: insertedQuestions?.length || 0,
        questions: insertedQuestions?.slice(0, count) || [],
        cognitiveEnhancement: true,
        message: `Generated ${insertedQuestions?.length || 0} cognitively appropriate questions for ${level} level`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      throw new Error('No questions met cognitive complexity standards');
    }

  } catch (error) {
    console.error('Error in enhanced question generation:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      cognitiveEnhancement: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
