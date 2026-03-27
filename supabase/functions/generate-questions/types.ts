
export interface GenerateQuestionsRequest {
  testType: string;
  level: string;
  count: number;
  targetLanguage?: string;
  baseLanguage?: string;
  language?: string;
  batchMode?: boolean;
  batchSize?: number;
}

export interface BatchTheme {
  topicCategory: string;
  grammarFocus: string;
  questionStructure: string;
  topics: string[];
  grammarPoints: string[];
  structures: string[];
  seed: string;
}

export interface GeneratedQuestion {
  id: string;
  type: string;
  text: string;
  options?: any;
  correct_answer?: string;
  level: string;
  language: string;
  generation_seed: string;
  topic_category: string;
  grammar_focus: string;
  question_structure: string;
  difficulty_sublevel?: string;
  cultural_context?: string;
  formality_level?: string;
  complexity_score?: number;
  created_at: string;
}
