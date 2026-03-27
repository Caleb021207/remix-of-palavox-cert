import { BatchTheme } from './types.ts';

// Keep existing function for backward compatibility
export function generateEnhancedPrompt(
  testType: string, 
  level: string, 
  count: number,
  targetLanguage: string,
  baseLanguage: string,
  theme: BatchTheme
): string {
  // Import and use the new enhanced system
  const { generateCognitivelyEnhancedPrompt } = require('./enhancedPromptGenerator.ts');
  return generateCognitivelyEnhancedPrompt(testType, level, count, targetLanguage, baseLanguage, theme);
}
