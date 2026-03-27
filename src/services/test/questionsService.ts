
import { Question, TestType } from '@/types';

// Re-export all functions from the modular files
export { getQuestions } from './questionFetcher';
export { triggerBatchGeneration } from './questionGenerator';
export { getQuestionAnalytics, updateQuestionAnalytics } from './questionAnalytics';
export { populateQuestionDatabase } from './databasePopulation';
export { fisherYatesShuffle, shuffleAndSelectDiverse } from './questionUtils';
