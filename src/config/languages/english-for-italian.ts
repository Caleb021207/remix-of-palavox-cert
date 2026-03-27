
import { ACTFLLevel } from '@/types';

export const englishForItalianConfig = {
  name: 'English',
  code: 'en-it',
  targetLanguage: 'English',
  baseLanguage: 'Italian',
  flag: '🇮🇹',
  displayName: 'English (for Italian speakers)',
  
  levelDescriptors: {
    [ACTFLLevel.NoviceLow]: {
      description: "Can communicate minimally with memorized English words and phrases.",
      examples: ["Basic greetings", "Simple numbers", "Common objects"]
    },
    [ACTFLLevel.NoviceMid]: {
      description: "Can communicate with English phrases in highly predictable settings.",
      examples: ["Simple personal information", "Basic needs", "Daily activities"]
    },
    [ACTFLLevel.NoviceHigh]: {
      description: "Can handle simple English conversations on familiar topics.",
      examples: ["Simple questions", "Basic preferences", "Everyday interactions"]
    },
    [ACTFLLevel.IntermediateLow]: {
      description: "Can create simple English sentences on familiar topics.",
      examples: ["Personal experiences", "Daily routines", "Simple descriptions"]
    },
    [ACTFLLevel.IntermediateMid]: {
      description: "Can handle uncomplicated English conversations on everyday topics.",
      examples: ["Personal interests", "Work discussions", "Travel needs"]
    },
    [ACTFLLevel.IntermediateHigh]: {
      description: "Can handle connected English discourse on a variety of familiar topics.",
      examples: ["Detailed descriptions", "Simple narration", "Express opinions"]
    },
    [ACTFLLevel.AdvancedLow]: {
      description: "Can handle English conversations about work, school, leisure, and some current events.",
      examples: ["Narrate in major timeframes", "Handle unexpected complications", "Support opinions"]
    },
    [ACTFLLevel.AdvancedMid]: {
      description: "Can participate fully in English conversations in most informal and some formal settings.",
      examples: ["Detailed narration", "Handle situations with complications", "Discuss abstract topics"]
    },
    [ACTFLLevel.AdvancedHigh]: {
      description: "Can participate in English conversations with ease and confidence on a wide range of topics.",
      examples: ["Extended discourse", "Professional discussions", "Persuasive arguments"]
    },
    [ACTFLLevel.Superior]: {
      description: "Can communicate in English with accuracy and fluency on a wide range of topics.",
      examples: ["Abstract topics", "Hypothetical situations", "Professional contexts"]
    },
    [ACTFLLevel.Distinguished]: {
      description: "Has exceptional English fluency and cultural understanding equivalent to a highly articulate native speaker.",
      examples: ["Sophisticated discourse", "Cultural nuances", "Complex negotiations"]
    },
  },

  commonErrors: [
    "False friends with Italian",
    "Double consonants",
    "Articles (a, an, the)",
    "Present perfect vs. simple past",
    "Prepositions usage",
    "H pronunciation (silent)",
    "Stress patterns",
    "Gerunds vs. infinitives",
    "Word order differences",
    "Th sounds"
  ],

  specialCharacters: [
    { char: "'", description: 'apostrophe for contractions' },
    { char: '"', description: 'quotation marks' },
    { char: '-', description: 'hyphen for compound words' }
  ],

  speechRecognitionCode: 'en-US'
};
