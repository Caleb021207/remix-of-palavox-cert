
import { TestSession, Question } from '@/types';

export interface AnswerComparisonResult {
  isCorrect: boolean;
  method: string;
  confidence: number;
  debugInfo?: any;
}

export interface ScoringBreakdown {
  questionId: string;
  correct: boolean;
  method: string;
  confidence?: number;
}

export interface SessionScoreResult {
  score: number;
  correctCount: number;
  totalCount: number;
  breakdown: ScoringBreakdown[];
  validationInfo: any;
}
