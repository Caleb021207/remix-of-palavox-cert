
export interface ReadingContent {
  level: string;
  passage: string;
  audioUrl?: string;
  questions: Array<{
    id: string;
    text: string;
    options: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
    }>;
  }>;
}

export interface LanguageConfig {
  contentLanguage: string;
  questionLanguage: string;
}

export interface LevelConfig {
  level: string;
  questionCount: number;
}
