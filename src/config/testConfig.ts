
import { ACTFLLevel, TestPhase } from '@/types';
import { TARGET_LANGUAGE } from './languageConfig';

// Use a default agent ID so the app can work without requiring immediate configuration
// Users should replace this with their own ElevenLabs agent ID
export const ELEVEN_LABS_AGENT_ID = 'default-agent';

export const TEST_DURATION = {
  multipleChoice: 1800, // 30 minutes for Multiple Choice (30 questions)
  writing: 1200,       // 20 minutes for Writing (1 prompt)
  speaking: 600        // 10 minutes for Speaking test
};

export const LEVEL_DISTRIBUTION = {
  novice: [ACTFLLevel.NoviceLow, ACTFLLevel.NoviceMid, ACTFLLevel.NoviceHigh],
  intermediate: [ACTFLLevel.IntermediateLow, ACTFLLevel.IntermediateMid, ACTFLLevel.IntermediateHigh],
  advanced: [ACTFLLevel.AdvancedLow, ACTFLLevel.AdvancedMid, ACTFLLevel.AdvancedHigh, ACTFLLevel.Superior, ACTFLLevel.Distinguished]
};

// Enhanced distribution for comprehensive testing
export const MULTIPLE_CHOICE_DISTRIBUTION = {
  novice: 15,      // 15 questions at Novice level
  intermediate: 10, // 10 questions at Intermediate level
  advanced: 5       // 5 questions at Advanced level (30 total)
};

// Database targets for question generation
export const QUESTION_DATABASE_TARGETS = {
  questionsPerCategory: 500,  // 500 questions per test type + level combination
  totalTargetQuestions: 6000, // 500 × 3 levels × 4 test types
  minimumBeforeGeneration: 50, // Generate more if below this threshold
  batchGenerationSize: 100,   // Generate this many at once in background
  diversityConstraints: {
    maxSameTopicPerTest: 2,   // Max questions with same topic in one test
    maxSameGrammarPerTest: 2, // Max questions with same grammar focus in one test
    topicVarietyTarget: 10,   // Target number of different topics
    grammarVarietyTarget: 5   // Target number of different grammar focuses
  }
};

// Question generation progress tracking
export const GENERATION_PROGRESS_CONFIG = {
  showProgressAfterMinutes: 2,  // Show progress indicator after 2 minutes
  backgroundGenerationDelay: 1000, // Delay between API calls (ms)
  retryAttempts: 3,            // Number of retry attempts for failed generations
  chunkSize: 20,               // Questions to generate per API call
};

export const DEFAULT_WRITING_LEVEL = ACTFLLevel.IntermediateMid;

// Error messages
export const ERROR_MESSAGES = {
  MICROPHONE_ACCESS: 'Could not access microphone. Please check permissions.',
  RECORDING_FAILED: 'Failed to record audio. Please try again.',
  VOICE_AGENT_CONNECTION: `Could not connect to the ${TARGET_LANGUAGE} voice agent. Please try again later.`,
  EVALUATION_FAILED: `Failed to evaluate your ${TARGET_LANGUAGE} response. Please try again.`,
  CERTIFICATE_GENERATION: 'Could not generate certificate. Please try again.',
  QUESTIONS_LOADING: `Failed to load ${TARGET_LANGUAGE} questions. Please try again.`,
  QUESTION_GENERATION: 'Questions are being generated in the background. You can continue using the app.',
};

// Spanish learning resources
export const LEARNING_RESOURCES = {
  grammar: [
    { title: "Spanish Verb Conjugation Practice", url: "https://conjuguemos.com/" },
    { title: "Spanish Grammar Guide", url: "https://studyspanish.com/grammar" }
  ],
  vocabulary: [
    { title: "Spanish Vocabulary Builder", url: "https://www.spanishdict.com/guide" },
    { title: "1000 Most Common Spanish Words", url: "https://1000mostcommonwords.com/1000-most-common-spanish-words/" }
  ],
  listening: [
    { title: "Spanish Podcasts for Learners", url: "https://www.spanishpod101.com/" },
    { title: "News in Slow Spanish", url: "https://www.newsinslowspanish.com/" }
  ],
  speaking: [
    { title: "Spanish Pronunciation Guide", url: "https://forvo.com/languages/es/" },
    { title: "Language Exchange Partners", url: "https://www.tandem.net/" }
  ]
};

// Performance monitoring thresholds
export const PERFORMANCE_THRESHOLDS = {
  questionLoadTime: 5000,      // Show warning if questions take longer than 5s to load
  generationTimeout: 30000,    // Timeout for individual question generation (30s)
  maxRetryDelay: 60000,        // Maximum delay between retries (1 minute)
  healthCheckInterval: 300000, // Check system health every 5 minutes
};

// Certificate Tiers - ALL phases must meet minimum
export const CERTIFICATE_TIERS = {
  functional: {
    name: 'Functional Fluency Certificate',
    description: 'Can communicate effectively in everyday situations',
    stampLevel: 5,
    actflLevel: 'Intermediate-Mid',
    cefrLevel: 'A2+/B1',
    minimumPhaseScores: {
      comprehension: 53,  // Intermediate-Mid threshold (STAMP 5)
      writing: 53,
      conversation: 53
    }
  },
  professional: {
    name: 'Professional Fluency Certificate',
    description: 'Can work professionally and handle complex communication',
    stampLevel: 7,
    actflLevel: 'Advanced-Low',
    cefrLevel: 'B2',
    minimumPhaseScores: {
      comprehension: 73,  // Advanced-Low threshold (STAMP 7)
      writing: 73,
      conversation: 73
    }
  }
} as const;

// Helper function to check certificate eligibility
export const checkCertificateEligibility = (phaseScores: {
  comprehension?: number;
  writing?: number;
  conversation?: number;
}) => {
  const scores = {
    comprehension: phaseScores.comprehension || 0,
    writing: phaseScores.writing || 0,
    conversation: phaseScores.conversation || 0
  };

  // Check Professional tier (highest)
  const meetsProfessional = 
    scores.comprehension >= CERTIFICATE_TIERS.professional.minimumPhaseScores.comprehension &&
    scores.writing >= CERTIFICATE_TIERS.professional.minimumPhaseScores.writing &&
    scores.conversation >= CERTIFICATE_TIERS.professional.minimumPhaseScores.conversation;

  if (meetsProfessional) {
    return { tier: 'professional' as const, qualified: true };
  }

  // Check Functional tier
  const meetsFunctional = 
    scores.comprehension >= CERTIFICATE_TIERS.functional.minimumPhaseScores.comprehension &&
    scores.writing >= CERTIFICATE_TIERS.functional.minimumPhaseScores.writing &&
    scores.conversation >= CERTIFICATE_TIERS.functional.minimumPhaseScores.conversation;

  if (meetsFunctional) {
    return { tier: 'functional' as const, qualified: true };
  }

  // Not qualified - check which phases need improvement
  const needsImprovement = {
    comprehension: scores.comprehension < CERTIFICATE_TIERS.functional.minimumPhaseScores.comprehension,
    writing: scores.writing < CERTIFICATE_TIERS.functional.minimumPhaseScores.writing,
    conversation: scores.conversation < CERTIFICATE_TIERS.functional.minimumPhaseScores.conversation
  };

  return { tier: 'none' as const, qualified: false, needsImprovement };
};

// Development mode configuration
export const DEV_MODE_CONFIG = {
  ADAPTIVE_TESTING: true,          // Enable adaptive testing
  MINIMUM_THRESHOLDS: true,        // Enable threshold enforcement
  SINGLE_TEST_MODE: true,          // Only show Certification test
  SKIP_PAYMENT_CHECK: false,       // Skip payment verification
  MOCK_CONTENT: false,             // Use real content pool
  FAST_FORWARD: false              // Skip some questions for testing
} as const;
