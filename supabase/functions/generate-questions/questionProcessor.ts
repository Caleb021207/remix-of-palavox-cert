
import { GeneratedQuestion } from './types.ts';

export function formatQuestions(
  rawQuestions: any[], 
  testType: string, 
  level: string, 
  language: string, 
  theme: any
): GeneratedQuestion[] {
  return rawQuestions.map(q => ({
    id: crypto.randomUUID(),
    type: testType,
    text: q.text || 'Generated question',
    options: q.options || null,
    correct_answer: q.correct_answer || q.answer || null,
    level: level,
    language: language,
    generation_seed: theme.seed,
    topic_category: theme.topicCategory,
    grammar_focus: theme.grammarFocus,
    question_structure: theme.questionStructure,
    difficulty_sublevel: q.difficulty_sublevel || level,
    cultural_context: q.cultural_context || 'neutral',
    formality_level: q.formality_level || 'neutral',
    complexity_score: q.complexity_score || 50,
    created_at: new Date().toISOString()
  }));
}

export function cleanOpenAIResponse(content: string): string {
  let cleanContent = content.trim();
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.replace(/```json\s*/, '').replace(/```\s*$/, '');
  }
  if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/```\s*/, '').replace(/```\s*$/, '');
  }
  return cleanContent;
}
