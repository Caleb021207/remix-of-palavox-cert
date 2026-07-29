
import { TestSession, CEFRLevel, ACTFLLevel } from '@/types';

// Proficiency Level Level definitions with detailed criteria
export interface ProficiencyLevel {
  level: number;
  name: string;
  actflLevel: ACTFLLevel;
  cefrLevel: CEFRLevel;
  textType: string;
  languageControl: string;
  vocabulary: string;
  accuracy: string;
  scoreRange: [number, number]; // min and max percentage scores
}

export const PROFICIENCY_LEVELS: ProficiencyLevel[] = [
  {
    level: 1,
    name: 'Novice-Low',
    actflLevel: ACTFLLevel.NoviceLow,
    cefrLevel: CEFRLevel.PreA1,
    textType: 'Words',
    languageControl: 'Use of isolated words that deal with the prompt/task, shows inability to connect words in order to create meaning.',
    vocabulary: 'Limited vocabulary which deals with the prompt or situation.',
    accuracy: 'Errors in spelling, word order, word choice and usage limit communication.',
    scoreRange: [0, 18]  // DOWN from [0, 20] - adjusted for weighted MCQ
  },
  {
    level: 2,
    name: 'Novice-Mid',
    actflLevel: ACTFLLevel.NoviceMid,
    cefrLevel: CEFRLevel.A1,
    textType: 'Phrases',
    languageControl: 'Single, isolated connections to verbs. May be inconsistent at connecting words grammatically.',
    vocabulary: 'Typically limited in their vocabulary to Novice level topics that they experience in every-day life.',
    accuracy: 'Errors in grammar, word order and word choice are prevalent and limit communication.',
    scoreRange: [19, 32]  // DOWN from [21, 35]
  },
  {
    level: 3,
    name: 'Novice-High',
    actflLevel: ACTFLLevel.NoviceHigh,
    cefrLevel: CEFRLevel.A1Plus,
    textType: 'Simple Sentences',
    languageControl: 'Shows ability to create simple sentences with very basic grammatical control.',
    vocabulary: 'Generally, sentences that are created use basic vocabulary words with limited ability to elaborate.',
    accuracy: 'Errors in grammar, usage, word order, and word choice sometimes limit communication.',
    scoreRange: [33, 42]  // DOWN from [36, 45]
  },
  {
    level: 4,
    name: 'Intermediate-Low',
    actflLevel: ACTFLLevel.IntermediateLow,
    cefrLevel: CEFRLevel.A2,
    textType: 'Strings of Sentences',
    languageControl: 'Shows ability to create simple sentences with some added detail.',
    vocabulary: 'Vocabulary is beginning to expand beyond the most frequent words.',
    accuracy: 'Errors continue to be common, but generally do not hinder communication.',
    scoreRange: [43, 52]  // DOWN from [46, 55]
  },
  {
    level: 5,
    name: 'Intermediate-Mid',
    actflLevel: ACTFLLevel.IntermediateMid,
    cefrLevel: CEFRLevel.A2Plus,
    textType: 'Connected Sentences',
    languageControl: 'Demonstrates the ability to create enough language that shows the beginning of connectedness.',
    vocabulary: 'Vocabulary use is expanding, and language used is more than just the usual, high frequency vocabulary.',
    accuracy: 'Shows ability to use more than just simple present tense, however errors occur when trying to use other tenses.',
    scoreRange: [53, 62]  // DOWN from [56, 65]
  },
  {
    level: 6,
    name: 'Intermediate-High',
    actflLevel: ACTFLLevel.IntermediateHigh,
    cefrLevel: CEFRLevel.B1,
    textType: 'Pre-Paragraph Language',
    languageControl: 'Shows ability to create language with a more natural flow using different time frames.',
    vocabulary: 'Use of transition words and concepts with more ease. Circumlocution is used more effectively.',
    accuracy: 'Good control of the language with occasional errors that do not hinder communication.',
    scoreRange: [63, 72]  // DOWN from [66, 75] ⚠️ B1 THRESHOLD ADJUSTED
  },
  {
    level: 7,
    name: 'Advanced-Low',
    actflLevel: ACTFLLevel.AdvancedLow,
    cefrLevel: CEFRLevel.B2,
    textType: 'Paragraph/Advanced Language',
    languageControl: 'Shows ability to create a smooth and natural flow using advanced structures and descriptive language.',
    vocabulary: 'Use of advanced vocabulary (less frequent and specialized), advanced structures and/or terms evident.',
    accuracy: 'Majority of language is error-free, creating a smooth and natural flow.',
    scoreRange: [73, 82]  // DOWN from [76, 85] ⚠️ B2 THRESHOLD ADJUSTED
  },
  {
    level: 8,
    name: 'Advanced-Mid',
    actflLevel: ACTFLLevel.AdvancedMid,
    cefrLevel: CEFRLevel.C1,
    textType: 'Extended Paragraph and Language',
    languageControl: 'Shows ability to confidently address each aspect with clear organization and native-like flow.',
    vocabulary: 'Effective use of concise language across a wide variety of topics with deeper cultural understanding.',
    accuracy: 'Language is almost entirely error free, creating a smooth and natural flow.',
    scoreRange: [83, 100]  // DOWN from [86, 100] ⚠️ C1 THRESHOLD ADJUSTED
  }
];

export const determineProficiencyLevel = (score: number): ProficiencyLevel => {
  console.log('🎯 Proficiency Level Level Determination:', { score });
  
  const level = PROFICIENCY_LEVELS.find(level => 
    score >= level.scoreRange[0] && score <= level.scoreRange[1]
  ) || PROFICIENCY_LEVELS[0]; // Default to Novice-Low if no match
  
  console.log('✅ Determined Proficiency Level Level:', { 
    score, 
    stampLevel: level.level, 
    name: level.name, 
    actfl: level.actflLevel, 
    cefr: level.cefrLevel 
  });
  
  return level;
};

export const generateProficiencyFeedback = (
  score: number, 
  stampLevel: ProficiencyLevel,
  testType: string
): any => {
  const feedback: any = {
    summary: `You demonstrated ${stampLevel.name} (Proficiency Level Level ${stampLevel.level}) proficiency with a score of ${score.toFixed(1)}%.`,
    stamp_level: stampLevel.level,
    stamp_name: stampLevel.name,
    text_type: stampLevel.textType,
    strengths: [],
    areas_for_improvement: [],
    detailed_assessment: {
      language_control: stampLevel.languageControl,
      vocabulary: stampLevel.vocabulary,
      accuracy: stampLevel.accuracy
    }
  };

  // Generate specific feedback based on Proficiency Level level
  if (stampLevel.level <= 2) {
    feedback.strengths.push("Shows basic understanding of individual words and simple phrases");
    feedback.strengths.push("Demonstrates effort in attempting to communicate");
    feedback.areas_for_improvement.push("Focus on connecting words to create basic meaning");
    feedback.areas_for_improvement.push("Practice basic sentence structures and common vocabulary");
    feedback.areas_for_improvement.push("Work on spelling and word order accuracy");
  } else if (stampLevel.level <= 4) {
    feedback.strengths.push("Can create simple sentences with basic grammatical control");
    feedback.strengths.push("Shows expanding vocabulary beyond most basic words");
    feedback.areas_for_improvement.push("Practice connecting sentences to create coherent paragraphs");
    feedback.areas_for_improvement.push("Work on consistency in grammatical structures");
    feedback.areas_for_improvement.push("Expand vocabulary for more varied expression");
  } else if (stampLevel.level <= 6) {
    feedback.strengths.push("Demonstrates connected language with natural flow");
    feedback.strengths.push("Shows good control of multiple time frames");
    feedback.strengths.push("Uses transition words and linking strategies effectively");
    feedback.areas_for_improvement.push("Practice creating more complex paragraph structures");
    feedback.areas_for_improvement.push("Work on advanced vocabulary and circumlocution");
    feedback.areas_for_improvement.push("Refine accuracy in complex grammatical structures");
  } else {
    feedback.strengths.push("Demonstrates advanced language control with native-like flow");
    feedback.strengths.push("Uses sophisticated vocabulary and complex structures");
    feedback.strengths.push("Shows cultural understanding and linguistic sophistication");
    feedback.areas_for_improvement.push("Continue practicing advanced discourse patterns");
    feedback.areas_for_improvement.push("Maintain consistency across all language skills");
  }

  return feedback;
};
