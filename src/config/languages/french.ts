import { ACTFLLevel } from '@/types';

export const frenchConfig = {
  name: 'French',
  code: 'fr',
  targetLanguage: 'French',
  baseLanguage: 'English',
  flag: '🇫🇷',
  displayName: 'French',
  
  levelDescriptors: {
    [ACTFLLevel.NoviceLow]: {
      description: "Can communicate minimally with memorized French words and phrases.",
      examples: ["Basic greetings", "Simple numbers", "Common objects"]
    },
    [ACTFLLevel.NoviceMid]: {
      description: "Can communicate with French phrases in highly predictable settings.",
      examples: ["Simple personal information", "Basic needs", "Daily activities"]
    },
    [ACTFLLevel.NoviceHigh]: {
      description: "Can handle simple French conversations on familiar topics.",
      examples: ["Simple questions", "Basic preferences", "Everyday interactions"]
    },
    [ACTFLLevel.IntermediateLow]: {
      description: "Can create simple French sentences on familiar topics.",
      examples: ["Personal experiences", "Daily routines", "Simple descriptions"]
    },
    [ACTFLLevel.IntermediateMid]: {
      description: "Can handle uncomplicated French conversations on everyday topics.",
      examples: ["Personal interests", "Work discussions", "Travel needs"]
    },
    [ACTFLLevel.IntermediateHigh]: {
      description: "Can handle connected French discourse on a variety of familiar topics.",
      examples: ["Detailed descriptions", "Simple narration", "Express opinions"]
    },
    [ACTFLLevel.AdvancedLow]: {
      description: "Can handle French conversations about work, school, leisure, and some current events.",
      examples: ["Narrate in major timeframes", "Handle unexpected complications", "Support opinions"]
    },
    [ACTFLLevel.AdvancedMid]: {
      description: "Can participate fully in French conversations in most informal and some formal settings.",
      examples: ["Detailed narration", "Handle situations with complications", "Discuss abstract topics"]
    },
    [ACTFLLevel.AdvancedHigh]: {
      description: "Can participate in French conversations with ease and confidence on a wide range of topics.",
      examples: ["Extended discourse", "Professional discussions", "Persuasive arguments"]
    },
    [ACTFLLevel.Superior]: {
      description: "Can communicate in French with accuracy and fluency on a wide range of topics.",
      examples: ["Abstract topics", "Hypothetical situations", "Professional contexts"]
    },
    [ACTFLLevel.Distinguished]: {
      description: "Has exceptional French fluency and cultural understanding equivalent to a highly articulate native speaker.",
      examples: ["Sophisticated discourse", "Cultural nuances", "Complex negotiations"]
    },
  },

  commonErrors: [
    "Masculine vs. feminine articles",
    "Verb conjugations",
    "Silent letters",
    "Liaison rules",
    "Subjunctive mood",
    "Past tense selection",
    "Pronoun placement",
    "False friends with English",
    "Accents and pronunciation",
    "Formal vs. informal address"
  ],

  specialCharacters: [
    { char: 'à', description: 'a with grave accent' },
    { char: 'â', description: 'a with circumflex' },
    { char: 'ç', description: 'c with cedilla' },
    { char: 'é', description: 'e with acute accent' },
    { char: 'è', description: 'e with grave accent' },
    { char: 'ê', description: 'e with circumflex' },
    { char: 'ë', description: 'e with diaeresis' },
    { char: 'î', description: 'i with circumflex' },
    { char: 'ï', description: 'i with diaeresis' },
    { char: 'ô', description: 'o with circumflex' },
    { char: 'ù', description: 'u with grave accent' },
    { char: 'û', description: 'u with circumflex' },
    { char: 'ü', description: 'u with diaeresis' },
    { char: 'ÿ', description: 'y with diaeresis' }
  ],

  speechRecognitionCode: 'fr-FR'
};
