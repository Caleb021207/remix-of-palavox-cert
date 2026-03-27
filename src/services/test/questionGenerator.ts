
import { languages, LanguageCode } from '@/config/languages';
import { supabase } from '@/integrations/supabase/client';

// Check generation needs and trigger if necessary
export async function checkAndTriggerGeneration(testType: string, level: string, count: number, formatQuestion: (dbQuestion: any) => any, languageCode?: LanguageCode): Promise<any[]> {
  const language = languageCode || 'spanish';
  const config = languageCode ? languages[languageCode] : null;
  const targetLanguage = config?.targetLanguage || 'Spanish';
  const baseLanguage = config?.baseLanguage || 'English';
  
  // Check if we need to trigger batch generation with language parameter
  const { data: currentStats } = await supabase
    .rpc('trigger_question_generation', {
      p_test_type: testType,
      p_level: level,
      p_language: language,
      p_target_count: 500
    });

  const needsGeneration = currentStats?.[0]?.needs_generation;
  const currentCount = currentStats?.[0]?.current_count || 0;

  console.log(`📊 Current count for ${testType}-${level} in ${language}: ${currentCount}/500`);

  if (needsGeneration && currentCount < 50) {
    console.log(`🚀 Triggering batch generation for ${testType} - ${level} in ${targetLanguage}`);
    await triggerBatchGeneration(testType, level, languageCode);
  }

  // Generate immediate questions if we don't have enough
  if (currentCount < count) {
    console.log(`⚡ Generating ${Math.max(count * 2, 50)} new questions immediately for ${targetLanguage}`);
    
    const questionsToGenerate = Math.max(count * 2, 50);
    
    const response = await fetch(`/functions/v1/generate-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        testType, 
        level, 
        count: questionsToGenerate,
        targetLanguage,
        baseLanguage,
        language,
        batchMode: false
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error generating questions:', error);
      throw new Error(`Error generating questions: ${error.error || response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Generated ${data.generated} questions successfully for ${targetLanguage}`);
    return data.questions.slice(0, count);
  }

  // Return what we have if generation failed
  const { data: selectedQuestions } = await supabase
    .rpc('select_diverse_questions_enhanced', {
      p_test_type: testType,
      p_level: level,
      p_count: count,
      p_language: language,
      p_avoid_recent_minutes: 30,
      p_max_same_topic: Math.max(1, Math.floor(count / 8)),
      p_max_same_grammar: Math.max(1, Math.floor(count / 6))
    });

  const fallbackResult = selectedQuestions?.slice(0, count).map(formatQuestion) || [];
  console.log(`⚠️ Returning ${fallbackResult.length} questions as fallback for ${language}`);
  return fallbackResult;
}

// Trigger background batch generation to build up question database
export async function triggerBatchGeneration(testType: string, level: string, languageCode?: LanguageCode): Promise<void> {
  try {
    const language = languageCode || 'spanish';
    const config = languageCode ? languages[languageCode] : null;
    const targetLanguage = config?.targetLanguage || 'Spanish';
    const baseLanguage = config?.baseLanguage || 'English';
    
    console.log(`🔄 Starting background batch generation for ${testType} - ${level} in ${targetLanguage}`);
    
    const response = await fetch(`/functions/v1/generate-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        testType, 
        level, 
        count: 100,
        targetLanguage,
        baseLanguage,
        language,
        batchMode: true,
        batchSize: 20
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Background batch generation started for ${testType} - ${level} in ${targetLanguage}: ${result.generated} questions`);
    } else {
      const error = await response.json();
      console.error(`❌ Background batch generation failed:`, error);
    }
  } catch (error) {
    console.error('❌ Error triggering batch generation:', error);
  }
}
