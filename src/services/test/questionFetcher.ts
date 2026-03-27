
import { Question, TestType, QuestionType } from '@/types';
import { LanguageCode } from '@/config/languages';
import { supabase } from '@/integrations/supabase/client';

// Helper function to convert TestType to QuestionType
function mapTestTypeToQuestionType(testType: string): QuestionType {
  switch (testType) {
    case 'multipleChoice':
      return QuestionType.MultipleChoice;
    case 'fillInBlank':
      return QuestionType.FillInBlank;
    case 'shortAnswer':
      return QuestionType.ShortAnswer;
    case 'audioResponse':
      return QuestionType.AudioResponse;
    case 'writing':
      return QuestionType.Writing;
    default:
      return QuestionType.MultipleChoice;
  }
}

// Format database question to application Question type
function formatQuestion(dbQuestion: any): Question {
  return {
    id: dbQuestion.id,
    type: mapTestTypeToQuestionType(dbQuestion.type),
    text: dbQuestion.text,
    options: dbQuestion.options as any,
    answer: dbQuestion.correct_answer || undefined,
    level: dbQuestion.level as any,
    topicCategory: dbQuestion.topic_category,
    grammarFocus: dbQuestion.grammar_focus,
    questionStructure: dbQuestion.question_structure,
    culturalContext: dbQuestion.cultural_context,
    formalityLevel: dbQuestion.formality_level,
    complexityScore: dbQuestion.complexity_score
  };
}

// Enhanced question fetching with intelligent selection and language support
export async function getQuestions(testType: TestType, level: string, count: number, languageCode?: LanguageCode): Promise<Question[]> {
  try {
    const language = languageCode || 'spanish';
    console.log(`🔍 Requesting ${count} questions for ${testType} - ${level} in language: ${language}`);
    
    // First, try the enhanced diverse selection function with language parameter
    const { data: selectedQuestions, error: selectError } = await supabase
      .rpc('select_diverse_questions_enhanced', {
        p_test_type: testType,
        p_level: level,
        p_count: count,
        p_language: language,
        p_avoid_recent_minutes: 30,
        p_max_same_topic: Math.max(1, Math.floor(count / 8)),
        p_max_same_grammar: Math.max(1, Math.floor(count / 6))
      });

    if (selectError) {
      console.error('❌ Enhanced selection error:', selectError);
      
      // Fallback to regular selection with language filter
      const { data: fallbackQuestions, error: fallbackError } = await supabase
        .from('questions')
        .select('*')
        .eq('type', testType)
        .eq('level', level)
        .eq('language', language)
        .order('usage_count', { ascending: true })
        .order('last_used_at', { ascending: true, nullsFirst: true })
        .limit(count * 2);
        
      if (fallbackError) throw fallbackError;
      
      if (fallbackQuestions && fallbackQuestions.length >= count) {
        console.log(`✅ Using ${fallbackQuestions.length} fallback questions from database`);
        const { shuffleAndSelectDiverse } = await import('./questionUtils');
        return shuffleAndSelectDiverse(fallbackQuestions, count).map(formatQuestion);
      }
    } else if (selectedQuestions && selectedQuestions.length >= count) {
      console.log(`✅ Using ${selectedQuestions.length} enhanced selected questions from database`);
      return selectedQuestions.slice(0, count).map(formatQuestion);
    }

    // Dynamic import to avoid circular dependencies
    const { checkAndTriggerGeneration } = await import('./questionGenerator');
    return await checkAndTriggerGeneration(testType, level, count, formatQuestion, languageCode);
    
  } catch (error) {
    console.error('❌ Error in enhanced getQuestions:', error);
    throw error;
  }
}
