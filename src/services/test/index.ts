
import { TestType, TestSession, Question, SpeakingResponse, EvaluationResult, ACTFLLevel, CEFRLevel } from '@/types';

// Re-export all services
export { getQuestions, updateQuestionAnalytics, populateQuestionDatabase } from './questionsService';
export { startVoiceConversation, sendMessageToVoiceAgent } from './voiceAgentService';
export { evaluateResponse } from './evaluationService';
export { saveTestSession, getTestSession } from './sessionService';
export { getChatResponse } from './openAIService';
export { textToSpeech } from './azureSpeechService';

// Re-export new multi-phase test services
export {
  generateReadingContent,
  generateListeningContent,
  generateWritingPrompts,
  generatePronunciationPhrases,
  evaluatePhaseResponses,
  savePhaseResult,
  updateTestSession
} from './multiPhaseTestService';

// Re-export speaking prompt service
export { generateSpeakingPrompts } from './speakingPromptService';
