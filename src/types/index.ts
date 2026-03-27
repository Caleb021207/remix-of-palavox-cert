
export enum QuestionType {
  MultipleChoice = "multipleChoice",
  FillInBlank = "fillInBlank",
  ShortAnswer = "shortAnswer",
  AudioResponse = "audioResponse",
  Writing = "writing"
}

export enum CEFRLevel {
  PreA1 = "Pre-A1",
  A1 = "A1",
  A1Plus = "A1+",
  A2 = "A2",
  A2Plus = "A2+",
  B1 = "B1",
  B1Plus = "B1+",
  B2 = "B2",
  C1 = "C1",
  C1Plus = "C1+",
  C2 = "C2"
}

export enum ACTFLLevel {
  NoviceLow = "Novice Low",
  NoviceMid = "Novice Mid",
  NoviceHigh = "Novice High",
  IntermediateLow = "Intermediate Low",
  IntermediateMid = "Intermediate Mid",
  IntermediateHigh = "Intermediate High",
  AdvancedLow = "Advanced Low",
  AdvancedMid = "Advanced Mid",
  AdvancedHigh = "Advanced High",
  Superior = "Superior",
  Distinguished = "Distinguished"
}

export enum TestPhase {
  // New 3-phase system
  Comprehension = "comprehension",
  Writing = "writing",
  Conversation = "conversation",
  
  // Deprecated (kept for backward compatibility)
  /** @deprecated Use Comprehension instead */
  Reading = "reading",
  /** @deprecated Use Comprehension instead */
  Listening = "listening",
  /** @deprecated Use Conversation instead */
  Speaking = "speaking",
  /** @deprecated Use Conversation instead */
  ConversationalFluency = "conversational-fluency"
}

export enum TestType {
  Certification = "certification",
  MultipleChoice = "multipleChoice",
  Speaking = "speaking",
  Writing = "writing",
  // Individual phase tests for development
  ReadingOnly = "reading-only",
  ListeningOnly = "listening-only",
  WritingOnly = "writing-only",
  SpeakingOnly = "speaking-only",
  PronunciationOnly = "pronunciation-only"
}

export type Option = {
  id: string;
  text: string;
  isCorrect: boolean;
};

export type Question = {
  id: string;
  type: QuestionType;
  text: string;
  options?: Option[];
  answer?: string;
  level: string;
  audioUrl?: string;
  topicCategory?: string;
  grammarFocus?: string;
  questionStructure?: string;
  culturalContext?: string;
  formalityLevel?: string;
  complexityScore?: number;
};

export type TestContent = {
  id: string;
  sessionId: string;
  phase: TestPhase;
  contentType: string;
  level: string;
  promptText?: string;
  questions?: Question[];
  audioUrl?: string;
};

export type PhaseResult = {
  id: string;
  sessionId: string;
  phase: TestPhase;
  score: number;
  responses: Record<string, any>;
  feedback?: any;
  completedAt: Date;
};

export interface TestFeedback {
  summary?: string;
  strengths?: string[];
  areas_for_improvement?: string[];
  
  // Test type specific feedback
  reading?: string;
  listening?: string;
  writing?: string;
  speaking?: string;
  pronunciation?: string;
  
  // Writing specific feedback
  vocabulary?: string;
  grammar?: string;
  coherence?: string;
  
  // Speaking specific feedback
  fluency?: string;
  pronunciation_accuracy?: string;
  interaction?: string;
  
  // Enhanced scoring breakdown
  scoring_breakdown?: {
    correct_answers?: number;
    total_questions?: number;
    percentage?: string;
    method_breakdown?: Array<{
      questionId: string;
      correct: boolean;
      method: string;
      confidence?: number;
    }>;
    cefr_level?: CEFRLevel;
    scoring_timestamp?: string;
  };
}

export type TestSession = {
  id: string;
  testType: TestType;
  answers: Record<string, string | string[]>;
  startTime: Date;
  endTime?: Date;
  score?: number;
  cefr?: CEFRLevel;
  actfl?: ACTFLLevel;
  feedback?: any;
  transcript?: string;
  questions?: Question[];
  level?: ACTFLLevel;
  subscriptionVerified?: boolean;
  paymentStatus?: string; // Changed from union type to string to be more flexible
  language?: string;
  englishVariant?: import('@/config/languages/englishVariants').EnglishTestVariant;
  // Multi-phase test properties
  currentPhase?: TestPhase;
  phaseScores?: Partial<Record<TestPhase, number>>; // Phase 1: Pronunciation deprecated, so partial
};

export type SpeakingResponse = {
  conversationId: string;
  userMessage?: string;
  agentResponse: string;
  audioUrl: string;
};

export interface EvaluationResult {
  score: number;
  cefr_level: CEFRLevel;
  actfl_level: ACTFLLevel;
  feedback: {
    strengths: string[];
    areas_for_improvement: string[];
    [key: string]: any;
  };
  summary: string;
}

export interface PronunciationAnalysis {
  overallScore: number;
  wordLevelFeedback: Array<{
    word: string;
    expected: string;
    actual: string;
    score: number;
  }>;
  improvementTips: string[];
}

// Scoring scale mapping
export const SCORE_TO_LEVELS = {
  96: { actfl: ACTFLLevel.Distinguished, cefr: CEFRLevel.C2 },
  90: { actfl: ACTFLLevel.Superior, cefr: CEFRLevel.C1Plus },
  80: { actfl: ACTFLLevel.AdvancedHigh, cefr: CEFRLevel.C1 },
  70: { actfl: ACTFLLevel.AdvancedMid, cefr: CEFRLevel.B2 },
  60: { actfl: ACTFLLevel.AdvancedLow, cefr: CEFRLevel.B1Plus },
  50: { actfl: ACTFLLevel.IntermediateHigh, cefr: CEFRLevel.B1 },
  40: { actfl: ACTFLLevel.IntermediateMid, cefr: CEFRLevel.A2Plus },
  30: { actfl: ACTFLLevel.IntermediateLow, cefr: CEFRLevel.A2 },
  20: { actfl: ACTFLLevel.NoviceHigh, cefr: CEFRLevel.A1Plus },
  10: { actfl: ACTFLLevel.NoviceMid, cefr: CEFRLevel.A1 },
  0: { actfl: ACTFLLevel.NoviceLow, cefr: CEFRLevel.PreA1 }
};

// Add EdgeRuntime to Deno for WebSocket environments
declare global {
  interface EdgeRuntime {
    waitUntil(promise: Promise<any>): void;
  }
}

// Re-export Json type from Supabase
export type { Json } from '@/integrations/supabase/types';
