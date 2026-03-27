import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { response, targetLanguage = 'English' } = await req.json();
    
    console.log('🔍 Validating writing response...', { 
      length: response.length,
      targetLanguage 
    });
    
    // Fast, rule-based validation
    const words = response.trim().split(/\s+/).filter((w: string) => w.length > 0);
    const wordCount = words.length;
    
    // Simple language detection heuristic
    const englishPatterns = /\b(the|is|are|was|were|have|has|had|will|would|can|could|should|this|that|with|from)\b/gi;
    const spanishPatterns = /\b(el|la|los|las|es|son|era|fueron|tiene|tengo|puede|porque|cuando|donde|muy|más)\b/gi;
    const frenchPatterns = /\b(le|la|les|est|sont|était|ont|avons|peut|parce|quand|où|très|plus)\b/gi;
    
    const englishMatches = (response.match(englishPatterns) || []).length;
    const spanishMatches = (response.match(spanishPatterns) || []).length;
    const frenchMatches = (response.match(frenchPatterns) || []).length;
    
    let detectedLanguage = 'unknown';
    const totalMatches = englishMatches + spanishMatches + frenchMatches;
    
    if (totalMatches >= 5) {
      if (englishMatches > spanishMatches && englishMatches > frenchMatches) {
        detectedLanguage = 'English';
      } else if (spanishMatches > englishMatches && spanishMatches > frenchMatches) {
        detectedLanguage = 'Spanish';
      } else if (frenchMatches > englishMatches && frenchMatches > spanishMatches) {
        detectedLanguage = 'French';
      } else {
        detectedLanguage = 'mixed';
      }
    }
    
    const validation = {
      isValid: wordCount >= 20 && (detectedLanguage === targetLanguage || detectedLanguage === 'unknown'),
      language: detectedLanguage,
      languageMatch: detectedLanguage === targetLanguage || detectedLanguage === 'unknown',
      wordCount,
      flags: {
        tooShort: wordCount < 20,
        wrongLanguage: detectedLanguage !== targetLanguage && detectedLanguage !== 'unknown' && detectedLanguage !== 'mixed',
        mixed: detectedLanguage === 'mixed'
      }
    };

    console.log('✅ Validation complete:', validation);

    return new Response(JSON.stringify(validation), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Validation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
