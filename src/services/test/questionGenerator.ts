// Question generator — stubbed for new schema
// Will be replaced with Gemini-based item bank seeding

import { LanguageCode } from '@/config/languages';

export async function checkAndTriggerGeneration(
  testType: string, level: string, count: number,
  formatQuestion: (q: any) => any, languageCode?: LanguageCode
): Promise<any[]> {
  console.log(`[stub] checkAndTriggerGeneration for ${testType}/${level}`);
  return [];
}

export async function triggerBatchGeneration(
  testType: string, level: string, languageCode?: LanguageCode
): Promise<void> {
  console.log(`[stub] triggerBatchGeneration for ${testType}/${level}`);
}
