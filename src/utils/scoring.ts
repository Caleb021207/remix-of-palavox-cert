import { CEFRLevel, TestSession, ACTFLLevel, TestType } from '../types';
import { EnhancedScoring, ScoringDebugger } from './enhancedScoring';
import { determineSTAMPLevel, generateSTAMPFeedback, STAMP_LEVELS } from './stampScoring';

// Calculate adaptive score based on final level and performance
export function calculateAdaptiveScore(
  finalLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2',
  correctRate: number,
  questionCount: number
): number {
  const baseScores: Record<string, number> = {
    A1: 20,
    A2: 40,
    B1: 55,
    B2: 70,
    C1: 85,
    C2: 95
  };

  const baseScore = baseScores[finalLevel] || 50;
  
  // Adjustment based on performance within the level
  // correctRate of 0.5 (50%) = no adjustment
  // correctRate of 0.75 (75%) = +7.5 points
  // correctRate of 1.0 (100%) = +15 points
  const performanceAdjustment = (correctRate - 0.5) * 30;
  
  // Small penalty for very short tests (encourages full testing)
  const shortTestPenalty = questionCount < 8 ? (8 - questionCount) * 2 : 0;
  
  const finalScore = baseScore + performanceAdjustment - shortTestPenalty;
  
  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, Math.round(finalScore)));
}

export const calculateScore = (session: TestSession): number => {
  if (!session.questions) return 0;
  
  console.log('🎯 Starting STAMP-based score calculation for session:', session.id);
  ScoringDebugger.clearLogs();
  
  const result = EnhancedScoring.calculateSessionScore(session);
  
  console.log('📈 Final Score Result:', {
    sessionId: session.id,
    score: result.score.toFixed(1) + '%',
    correct: result.correctCount,
    total: result.totalCount
  });

  const report = ScoringDebugger.generateReport(session.id);
  console.log('📋 Detailed Scoring Report:\n', report);
  
  return result.score;
};

export const determineCEFRLevel = (score: number): CEFRLevel => {
  console.log('🎯 CEFR Level Determination via STAMP:', { score });
  
  const stampLevel = determineSTAMPLevel(score);
  const cefrLevel = stampLevel.cefrLevel;
  
  console.log('✅ Determined CEFR Level via STAMP:', { score, stampLevel: stampLevel.level, cefrLevel });
  return cefrLevel;
};

export const determineACTFLLevel = (score: number): ACTFLLevel => {
  console.log('🎯 ACTFL Level Determination via STAMP:', { score });
  
  const stampLevel = determineSTAMPLevel(score);
  const actflLevel = stampLevel.actflLevel;
  
  console.log('✅ Determined ACTFL Level via STAMP:', { score, stampLevel: stampLevel.level, actflLevel });
  return actflLevel;
};

export const generateFeedback = (
  score: number, 
  cefr: CEFRLevel,
  testType: string
): string => {
  const stampLevel = determineSTAMPLevel(score);
  return `You demonstrated ${stampLevel.name} (STAMP Level ${stampLevel.level}) proficiency. ${stampLevel.textType} level performance with ${stampLevel.accuracy} Your score: ${score.toFixed(1)}%`;
};

export const getCertificateTitle = (cefr: CEFRLevel): string => {
  // Find the STAMP level that corresponds to this CEFR level
  const stampLevel = STAMP_LEVELS.find(level => level.cefrLevel === cefr);
  
  if (stampLevel) {
    return `${stampLevel.name} Certificate (STAMP Level ${stampLevel.level})`;
  }
  
  // Fallback to original titles
  const titles: Record<CEFRLevel, string> = {
    [CEFRLevel.PreA1]: "Foundation Certificate",
    [CEFRLevel.A1]: "Beginner Certificate", 
    [CEFRLevel.A1Plus]: "Elementary Certificate",
    [CEFRLevel.A2]: "Pre-Intermediate Certificate",
    [CEFRLevel.A2Plus]: "Intermediate Foundation Certificate",
    [CEFRLevel.B1]: "Intermediate Certificate",
    [CEFRLevel.B1Plus]: "Upper Intermediate Certificate", 
    [CEFRLevel.B2]: "Advanced Intermediate Certificate",
    [CEFRLevel.C1]: "Advanced Certificate",
    [CEFRLevel.C1Plus]: "Proficiency Certificate",
    [CEFRLevel.C2]: "Mastery Certificate"
  };
  
  return titles[cefr] || "Language Proficiency Certificate";
};

// Helper function to get phase-specific feedback based on test type/phase
const getPhaseSpecificFeedback = (score: number, phase: string): { title: string; content: string }[] => {
  const stampLevel = determineSTAMPLevel(score);
  const phaseFeedback: { title: string; content: string }[] = [];

  switch (phase.toLowerCase()) {
    case 'reading':
      phaseFeedback.push({
        title: "Reading Comprehension Level",
        content: `${stampLevel.name} (CEFR ${stampLevel.cefrLevel}) - Score: ${score.toFixed(1)}%`
      });
      
      if (score >= 76) {
        phaseFeedback.push({
          title: "Comprehension Ability",
          content: "Demonstrates advanced reading comprehension with ability to understand complex texts, infer meaning, and grasp subtle nuances."
        });
        phaseFeedback.push({
          title: "Vocabulary Recognition",
          content: "Shows excellent command of advanced vocabulary, including idiomatic expressions and specialized terminology."
        });
      } else if (score >= 56) {
        phaseFeedback.push({
          title: "Comprehension Ability",
          content: "Shows solid reading comprehension with ability to understand main ideas and supporting details in moderately complex texts."
        });
        phaseFeedback.push({
          title: "Vocabulary Recognition",
          content: "Demonstrates good vocabulary range with ability to understand most common words and some specialized terms in context."
        });
      } else if (score >= 36) {
        phaseFeedback.push({
          title: "Comprehension Ability",
          content: "Can understand basic texts and extract key information, though complex passages may present challenges."
        });
        phaseFeedback.push({
          title: "Vocabulary Recognition",
          content: "Shows developing vocabulary with ability to recognize common words and phrases, may need support with less frequent terms."
        });
      } else {
        phaseFeedback.push({
          title: "Comprehension Ability",
          content: "Demonstrates foundational reading skills with ability to recognize familiar words and simple phrases."
        });
        phaseFeedback.push({
          title: "Vocabulary Recognition",
          content: "Shows basic vocabulary recognition limited to high-frequency words and common expressions."
        });
      }
      break;

    case 'listening':
      phaseFeedback.push({
        title: "Listening Comprehension Level",
        content: `${stampLevel.name} (CEFR ${stampLevel.cefrLevel}) - Score: ${score.toFixed(1)}%`
      });
      
      if (score >= 76) {
        phaseFeedback.push({
          title: "Auditory Comprehension",
          content: "Demonstrates excellent listening comprehension with ability to understand complex spoken language, including rapid speech and various accents."
        });
        phaseFeedback.push({
          title: "Detail Retention",
          content: "Shows strong ability to retain and recall specific details, implicit meanings, and nuanced information from audio content."
        });
      } else if (score >= 56) {
        phaseFeedback.push({
          title: "Auditory Comprehension",
          content: "Shows solid listening skills with ability to understand main ideas and important details in clear, well-structured speech."
        });
        phaseFeedback.push({
          title: "Detail Retention",
          content: "Demonstrates good retention of key information and supporting details from standard-paced audio content."
        });
      } else if (score >= 36) {
        phaseFeedback.push({
          title: "Auditory Comprehension",
          content: "Can understand basic spoken language on familiar topics, though may struggle with faster speech or unfamiliar accents."
        });
        phaseFeedback.push({
          title: "Detail Retention",
          content: "Shows developing ability to retain main points, though may miss some supporting details or implicit information."
        });
      } else {
        phaseFeedback.push({
          title: "Auditory Comprehension",
          content: "Demonstrates foundational listening skills with ability to recognize familiar words and simple phrases in clear, slow speech."
        });
        phaseFeedback.push({
          title: "Detail Retention",
          content: "Shows basic ability to identify key words and very simple information when speech is clear and slow."
        });
      }
      break;

    case 'speaking':
    case 'writing':
      // Use STAMP feedback for production skills
      const stampFeedback = generateSTAMPFeedback(score, stampLevel, phase);
      phaseFeedback.push({
        title: "STAMP Assessment Level",
        content: `${stampLevel.name} (Level ${stampLevel.level}) - ${stampLevel.textType}`
      });
      phaseFeedback.push({
        title: "Language Control",
        content: stampFeedback.detailed_assessment.language_control
      });
      phaseFeedback.push({
        title: "Vocabulary Usage",
        content: stampFeedback.detailed_assessment.vocabulary
      });
      phaseFeedback.push({
        title: "Accuracy & Comprehensibility",
        content: stampFeedback.detailed_assessment.accuracy
      });
      break;

    case 'comprehension':
      phaseFeedback.push({
        title: "Comprehension Level",
        content: `${stampLevel.name} (CEFR ${stampLevel.cefrLevel}) - Combined Reading + Listening Score: ${score.toFixed(1)}%`
      });
      
      if (score >= 76) {
        phaseFeedback.push({
          title: "Overall Comprehension",
          content: "Demonstrates excellent comprehension skills across both reading and listening modalities with strong ability to process information in multiple formats."
        });
      } else if (score >= 56) {
        phaseFeedback.push({
          title: "Overall Comprehension",
          content: "Shows solid comprehension abilities with good performance in both reading and listening contexts."
        });
      } else if (score >= 36) {
        phaseFeedback.push({
          title: "Overall Comprehension",
          content: "Can understand main ideas in basic texts and audio, with developing skills in both modalities."
        });
      } else {
        phaseFeedback.push({
          title: "Overall Comprehension",
          content: "Demonstrates foundational comprehension skills in both reading and listening."
        });
      }
      break;

    case 'conversationalfluency':
    case 'conversation':
      phaseFeedback.push({
        title: "Conversational Fluency Level",
        content: `${stampLevel.name} (CEFR ${stampLevel.cefrLevel}) - Score: ${score.toFixed(1)}%`
      });
      
      if (score >= 76) {
        phaseFeedback.push({
          title: "Interactive Communication",
          content: "Demonstrates excellent conversational ability with natural, spontaneous interaction and effective use of conversational strategies."
        });
        phaseFeedback.push({
          title: "Fluency & Naturalness",
          content: "Shows highly fluent speech with minimal hesitation, natural rhythm, and sophisticated use of discourse markers."
        });
      } else if (score >= 56) {
        phaseFeedback.push({
          title: "Interactive Communication",
          content: "Shows solid conversational skills with ability to maintain exchanges and respond appropriately in most situations."
        });
        phaseFeedback.push({
          title: "Fluency & Naturalness",
          content: "Demonstrates good fluency with some natural pauses, generally smooth delivery with occasional hesitations."
        });
      } else if (score >= 36) {
        phaseFeedback.push({
          title: "Interactive Communication",
          content: "Can participate in basic conversations on familiar topics, though may need support or clarification."
        });
        phaseFeedback.push({
          title: "Fluency & Naturalness",
          content: "Shows developing fluency with frequent pauses and hesitations, but can maintain simple exchanges."
        });
      } else {
        phaseFeedback.push({
          title: "Interactive Communication",
          content: "Demonstrates foundational conversational skills with ability to exchange very basic information in familiar contexts."
        });
        phaseFeedback.push({
          title: "Fluency & Naturalness",
          content: "Shows basic ability to produce simple responses with significant pauses and limited spontaneity."
        });
      }
      break;

    default:
      // Generic STAMP feedback for unknown types
      const defaultFeedback = generateSTAMPFeedback(score, stampLevel, phase);
      phaseFeedback.push({
        title: "Assessment Level",
        content: `${stampLevel.name} (CEFR ${stampLevel.cefrLevel}) - Score: ${score.toFixed(1)}%`
      });
      break;
  }

  return phaseFeedback;
};

export const formatTestFeedback = (session: TestSession): { title: string; content: string }[] => {
  const feedback = [];
  
  // Determine which phase/section to show feedback for
  const singlePhase = (session as any).singlePhase;
  const testPhase = singlePhase || session.testType;
  
  // Add phase-specific feedback if score is available
  if (session.score !== undefined && testPhase) {
    const phaseSpecificFeedback = getPhaseSpecificFeedback(session.score, testPhase);
    feedback.push(...phaseSpecificFeedback);
  }
  
  // Add custom feedback from session if available
  if (session.feedback?.summary) {
    feedback.push({
      title: "Overall Assessment",
      content: session.feedback.summary
    });
  }
  
  if (session.feedback?.strengths && session.feedback.strengths.length > 0) {
    feedback.push({
      title: "Strengths",
      content: session.feedback.strengths.join('\n')
    });
  }
  
  if (session.feedback?.areas_for_improvement && session.feedback.areas_for_improvement.length > 0) {
    feedback.push({
      title: "Areas for Improvement", 
      content: session.feedback.areas_for_improvement.join('\n')
    });
  }
  
  // Add test-type specific custom feedback
  switch (session.testType) {
    case TestType.Speaking:
      if (session.feedback?.fluency) {
        feedback.push({
          title: "Fluency Details",
          content: session.feedback.fluency
        });
      }
      if (session.feedback?.pronunciation) {
        feedback.push({
          title: "Pronunciation Details", 
          content: session.feedback.pronunciation
        });
      }
      if (session.feedback?.interaction) {
        feedback.push({
          title: "Interaction Details",
          content: session.feedback.interaction
        });
      }
      break;
      
    case TestType.Writing:
      if (session.feedback?.grammar) {
        feedback.push({
          title: "Grammar Details",
          content: session.feedback.grammar
        });
      }
      if (session.feedback?.vocabulary) {
        feedback.push({
          title: "Vocabulary Details",
          content: session.feedback.vocabulary
        });
      }
      if (session.feedback?.coherence) {
        feedback.push({
          title: "Organization Details",
          content: session.feedback.coherence
        });
      }
      break;
      
    default:
      break;
  }
  
  return feedback;
};
