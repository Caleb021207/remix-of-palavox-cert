import { ACTFLLevel } from '@/types';

export const italianConfig = {
  name: 'Italian',
  code: 'it',
  targetLanguage: 'Italian',
  baseLanguage: 'English',
  flag: '🇮🇹',
  displayName: 'Italian',
  
  levelDescriptors: {
    [ACTFLLevel.NoviceLow]: {
      description: "Can communicate minimally with memorized Italian words and phrases.",
      examples: ["Basic greetings", "Simple numbers", "Common objects"]
    },
    [ACTFLLevel.NoviceMid]: {
      description: "Can communicate with Italian phrases in highly predictable settings.",
      examples: ["Simple personal information", "Basic needs", "Daily activities"]
    },
    [ACTFLLevel.NoviceHigh]: {
      description: "Can handle simple Italian conversations on familiar topics.",
      examples: ["Simple questions", "Basic preferences", "Everyday interactions"]
    },
    [ACTFLLevel.IntermediateLow]: {
      description: "Can create simple Italian sentences on familiar topics.",
      examples: ["Personal experiences", "Daily routines", "Simple descriptions"]
    },
    [ACTFLLevel.IntermediateMid]: {
      description: "Can handle uncomplicated Italian conversations on everyday topics.",
      examples: ["Personal interests", "Work discussions", "Travel needs"]
    },
    [ACTFLLevel.IntermediateHigh]: {
      description: "Can handle connected Italian discourse on a variety of familiar topics.",
      examples: ["Detailed descriptions", "Simple narration", "Express opinions"]
    },
    [ACTFLLevel.AdvancedLow]: {
      description: "Can handle Italian conversations about work, school, leisure, and some current events.",
      examples: ["Narrate in major timeframes", "Handle unexpected complications", "Support opinions"]
    },
    [ACTFLLevel.AdvancedMid]: {
      description: "Can participate fully in Italian conversations in most informal and some formal settings.",
      examples: ["Detailed narration", "Handle situations with complications", "Discuss abstract topics"]
    },
    [ACTFLLevel.AdvancedHigh]: {
      description: "Can participate in Italian conversations with ease and confidence on a wide range of topics.",
      examples: ["Extended discourse", "Professional discussions", "Persuasive arguments"]
    },
    [ACTFLLevel.Superior]: {
      description: "Can communicate in Italian with accuracy and fluency on a wide range of topics.",
      examples: ["Abstract topics", "Hypothetical situations", "Professional contexts"]
    },
    [ACTFLLevel.Distinguished]: {
      description: "Has exceptional Italian fluency and cultural understanding equivalent to a highly articulate native speaker.",
      examples: ["Sophisticated discourse", "Cultural nuances", "Complex negotiations"]
    },
  },

  commonErrors: [
    "Masculine vs. feminine articles",
    "Verb conjugations",
    "Double consonants",
    "Subjunctive mood",
    "Past tense selection",
    "Preposition usage",
    "Pronoun placement",
    "False friends with English",
    "Stressed syllables",
    "Formal vs. informal address"
  ],

  specialCharacters: [
    { char: 'à', description: 'a with grave accent' },
    { char: 'è', description: 'e with grave accent' },
    { char: 'é', description: 'e with acute accent' },
    { char: 'ì', description: 'i with grave accent' },
    { char: 'í', description: 'i with acute accent' },
    { char: 'ò', description: 'o with grave accent' },
    { char: 'ó', description: 'o with acute accent' },
    { char: 'ù', description: 'u with grave accent' },
    { char: 'ú', description: 'u with acute accent' }
  ],

  speechRecognitionCode: 'it-IT'
};
