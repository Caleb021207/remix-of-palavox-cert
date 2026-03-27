import { ACTFLLevel } from '@/types';

export const germanConfig = {
  name: 'German',
  code: 'de',
  targetLanguage: 'German',
  baseLanguage: 'English',
  flag: '🇩🇪',
  displayName: 'German',
  
  levelDescriptors: {
    [ACTFLLevel.NoviceLow]: {
      description: "Can communicate minimally with memorized German words and phrases.",
      examples: ["Basic greetings", "Simple numbers", "Common objects"]
    },
    [ACTFLLevel.NoviceMid]: {
      description: "Can communicate with German phrases in highly predictable settings.",
      examples: ["Simple personal information", "Basic needs", "Daily activities"]
    },
    [ACTFLLevel.NoviceHigh]: {
      description: "Can handle simple German conversations on familiar topics.",
      examples: ["Simple questions", "Basic preferences", "Everyday interactions"]
    },
    [ACTFLLevel.IntermediateLow]: {
      description: "Can create simple German sentences on familiar topics.",
      examples: ["Personal experiences", "Daily routines", "Simple descriptions"]
    },
    [ACTFLLevel.IntermediateMid]: {
      description: "Can handle uncomplicated German conversations on everyday topics.",
      examples: ["Personal interests", "Work discussions", "Travel needs"]
    },
    [ACTFLLevel.IntermediateHigh]: {
      description: "Can handle connected German discourse on a variety of familiar topics.",
      examples: ["Detailed descriptions", "Simple narration", "Express opinions"]
    },
    [ACTFLLevel.AdvancedLow]: {
      description: "Can handle German conversations about work, school, leisure, and some current events.",
      examples: ["Narrate in major timeframes", "Handle unexpected complications", "Support opinions"]
    },
    [ACTFLLevel.AdvancedMid]: {
      description: "Can participate fully in German conversations in most informal and some formal settings.",
      examples: ["Detailed narration", "Handle situations with complications", "Discuss abstract topics"]
    },
    [ACTFLLevel.AdvancedHigh]: {
      description: "Can participate in German conversations with ease and confidence on a wide range of topics.",
      examples: ["Extended discourse", "Professional discussions", "Persuasive arguments"]
    },
    [ACTFLLevel.Superior]: {
      description: "Can communicate in German with accuracy and fluency on a wide range of topics.",
      examples: ["Abstract topics", "Hypothetical situations", "Professional contexts"]
    },
    [ACTFLLevel.Distinguished]: {
      description: "Has exceptional German fluency and cultural understanding equivalent to a highly articulate native speaker.",
      examples: ["Sophisticated discourse", "Cultural nuances", "Complex negotiations"]
    },
  },

  commonErrors: [
    "Der, die, das articles",
    "Case system (Nominativ, Akkusativ, Dativ, Genitiv)",
    "Verb position in sentences",
    "Separable verbs",
    "Adjective endings",
    "Modal verbs",
    "Compound words",
    "Capitalization rules",
    "Umlauts pronunciation",
    "Formal vs. informal address (Sie vs. du)"
  ],

  specialCharacters: [
    { char: 'ä', description: 'a with umlaut' },
    { char: 'ö', description: 'o with umlaut' },
    { char: 'ü', description: 'u with umlaut' },
    { char: 'ß', description: 'sharp s (eszett)' }
  ],

  speechRecognitionCode: 'de-DE'
};
