import { ACTFLLevel } from '@/types';

export const portugueseConfig = {
  name: 'Portuguese',
  code: 'pt',
  targetLanguage: 'Portuguese',
  baseLanguage: 'English',
  flag: '🇵🇹',
  displayName: 'Portuguese',
  
  levelDescriptors: {
    [ACTFLLevel.NoviceLow]: {
      description: "Can communicate minimally with memorized Portuguese words and phrases.",
      examples: ["Basic greetings", "Simple numbers", "Common objects"]
    },
    [ACTFLLevel.NoviceMid]: {
      description: "Can communicate with Portuguese phrases in highly predictable settings.",
      examples: ["Simple personal information", "Basic needs", "Daily activities"]
    },
    [ACTFLLevel.NoviceHigh]: {
      description: "Can handle simple Portuguese conversations on familiar topics.",
      examples: ["Simple questions", "Basic preferences", "Everyday interactions"]
    },
    [ACTFLLevel.IntermediateLow]: {
      description: "Can create simple Portuguese sentences on familiar topics.",
      examples: ["Personal experiences", "Daily routines", "Simple descriptions"]
    },
    [ACTFLLevel.IntermediateMid]: {
      description: "Can handle uncomplicated Portuguese conversations on everyday topics.",
      examples: ["Personal interests", "Work discussions", "Travel needs"]
    },
    [ACTFLLevel.IntermediateHigh]: {
      description: "Can handle connected Portuguese discourse on a variety of familiar topics.",
      examples: ["Detailed descriptions", "Simple narration", "Express opinions"]
    },
    [ACTFLLevel.AdvancedLow]: {
      description: "Can handle Portuguese conversations about work, school, leisure, and some current events.",
      examples: ["Narrate in major timeframes", "Handle unexpected complications", "Support opinions"]
    },
    [ACTFLLevel.AdvancedMid]: {
      description: "Can participate fully in Portuguese conversations in most informal and some formal settings.",
      examples: ["Detailed narration", "Handle situations with complications", "Discuss abstract topics"]
    },
    [ACTFLLevel.AdvancedHigh]: {
      description: "Can participate in Portuguese conversations with ease and confidence on a wide range of topics.",
      examples: ["Extended discourse", "Professional discussions", "Persuasive arguments"]
    },
    [ACTFLLevel.Superior]: {
      description: "Can communicate in Portuguese with accuracy and fluency on a wide range of topics.",
      examples: ["Abstract topics", "Hypothetical situations", "Professional contexts"]
    },
    [ACTFLLevel.Distinguished]: {
      description: "Has exceptional Portuguese fluency and cultural understanding equivalent to a highly articulate native speaker.",
      examples: ["Sophisticated discourse", "Cultural nuances", "Complex negotiations"]
    },
  },

  commonErrors: [
    "Ser vs. estar usage",
    "Por vs. para distinction", 
    "Subjunctive mood",
    "Gender agreement",
    "False cognates with Spanish",
    "Verb tense selection",
    "Preterite vs. imperfect",
    "Object pronouns placement",
    "Irregular verbs",
    "Nasal vowels pronunciation"
  ],

  specialCharacters: [
    { char: 'á', description: 'a with acute accent' },
    { char: 'à', description: 'a with grave accent' },
    { char: 'â', description: 'a with circumflex' },
    { char: 'ã', description: 'a with tilde' },
    { char: 'é', description: 'e with acute accent' },
    { char: 'ê', description: 'e with circumflex' },
    { char: 'í', description: 'i with acute accent' },
    { char: 'ó', description: 'o with acute accent' },
    { char: 'ô', description: 'o with circumflex' },
    { char: 'õ', description: 'o with tilde' },
    { char: 'ú', description: 'u with acute accent' },
    { char: 'ç', description: 'c with cedilla' }
  ],

  speechRecognitionCode: 'pt-PT'
};
