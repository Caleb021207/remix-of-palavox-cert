
import { BatchTheme } from './types.ts';
import { TOPIC_CATEGORIES, GRAMMAR_FOCUSES, QUESTION_STRUCTURES } from './constants.ts';

// Fisher-Yates shuffle algorithm
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Generate systematic batch themes for variety
export function generateBatchThemes(testType: string, level: string, batchSize: number): BatchTheme[] {
  const themes = [];
  const topicKeys = Object.keys(TOPIC_CATEGORIES);
  const grammarKeys = Object.keys(GRAMMAR_FOCUSES);
  const structureKeys = Object.keys(QUESTION_STRUCTURES);
  
  for (let i = 0; i < batchSize; i++) {
    const topicCategory = topicKeys[i % topicKeys.length];
    const grammarFocus = grammarKeys[i % grammarKeys.length];
    const questionStructure = structureKeys[i % structureKeys.length];
    
    themes.push({
      topicCategory,
      grammarFocus,
      questionStructure,
      topics: TOPIC_CATEGORIES[topicCategory],
      grammarPoints: GRAMMAR_FOCUSES[grammarFocus],
      structures: QUESTION_STRUCTURES[questionStructure],
      seed: Math.random().toString(36).substring(2, 15)
    });
  }
  
  return fisherYatesShuffle(themes);
}
