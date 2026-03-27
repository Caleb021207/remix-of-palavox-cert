import { Question, TestType, QuestionType } from '@/types';
import { LanguageCode } from '@/config/languages';
import { supabase } from '@/integrations/supabase/client';

function formatItemBankQuestion(item: any): Question {
  return {
    id: item.id,
    type: QuestionType.MultipleChoice,
    text: item.question_text,
    options: item.options as any,
    answer: item.correct_answer,
    level: item.cefr_target,
    topicCategory: item.topic,
    grammarFocus: item.grammar_target,
    complexityScore: item.difficulty_score ? Number(item.difficulty_score) : undefined,
  };
}

export async function getQuestions(
  testType: TestType,
  level: string,
  count: number,
  languageCode?: LanguageCode
): Promise<Question[]> {
  try {
    const sectionType = testType === TestType.MultipleChoice ? 'reading' : 'reading';
    
    const { data, error } = await supabase
      .from('item_bank')
      .select('*')
      .eq('section_type', sectionType)
      .eq('active', true)
      .order('usage_count', { ascending: true })
      .limit(count * 2);

    if (error) throw error;

    if (data && data.length > 0) {
      const { fisherYatesShuffle } = await import('./questionUtils');
      const shuffled = fisherYatesShuffle([...data]);
      return shuffled.slice(0, count).map(formatItemBankQuestion);
    }

    console.warn('No items found in item_bank');
    return [];
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }
}
