// Question analytics — stubbed for new schema

export async function getQuestionAnalytics(questionId: string) {
  console.log('[stub] getQuestionAnalytics');
  return null;
}

export async function updateQuestionAnalytics(
  questionId: string,
  isCorrect: boolean,
  responseTime?: number
): Promise<void> {
  console.log(`[stub] updateQuestionAnalytics for ${questionId}`);
}
