
import { ACTFLLevel, CEFRLevel } from '@/types';

export const TARGET_LANGUAGE = 'Spanish';
export const BASE_LANGUAGE = 'English';

export const LEVEL_DESCRIPTORS = {
  [ACTFLLevel.NoviceLow]: {
    description: "Can communicate minimally with memorized Spanish words and phrases.",
    examples: ["Basic greetings", "Simple numbers", "Common objects"]
  },
  [ACTFLLevel.NoviceMid]: {
    description: "Can communicate with Spanish phrases in highly predictable settings.",
    examples: ["Simple personal information", "Basic needs", "Daily activities"]
  },
  [ACTFLLevel.NoviceHigh]: {
    description: "Can handle simple Spanish conversations on familiar topics.",
    examples: ["Simple questions", "Basic preferences", "Everyday interactions"]
  },
  [ACTFLLevel.IntermediateLow]: {
    description: "Can create simple Spanish sentences on familiar topics.",
    examples: ["Personal experiences", "Daily routines", "Simple descriptions"]
  },
  [ACTFLLevel.IntermediateMid]: {
    description: "Can handle uncomplicated Spanish conversations on everyday topics.",
    examples: ["Personal interests", "Work discussions", "Travel needs"]
  },
  [ACTFLLevel.IntermediateHigh]: {
    description: "Can handle connected Spanish discourse on a variety of familiar topics.",
    examples: ["Detailed descriptions", "Simple narration", "Express opinions"]
  },
  [ACTFLLevel.AdvancedLow]: {
    description: "Can handle Spanish conversations about work, school, leisure, and some current events.",
    examples: ["Narrate in major timeframes", "Handle unexpected complications", "Support opinions"]
  },
  [ACTFLLevel.AdvancedMid]: {
    description: "Can participate fully in Spanish conversations in most informal and some formal settings.",
    examples: ["Detailed narration", "Handle situations with complications", "Discuss abstract topics"]
  },
  [ACTFLLevel.AdvancedHigh]: {
    description: "Can participate in Spanish conversations with ease and confidence on a wide range of topics.",
    examples: ["Extended discourse", "Professional discussions", "Persuasive arguments"]
  },
  [ACTFLLevel.Superior]: {
    description: "Can communicate in Spanish with accuracy and fluency on a wide range of topics.",
    examples: ["Abstract topics", "Hypothetical situations", "Professional contexts"]
  },
  [ACTFLLevel.Distinguished]: {
    description: "Has exceptional Spanish fluency and cultural understanding equivalent to a highly articulate native speaker.",
    examples: ["Sophisticated discourse", "Cultural nuances", "Complex negotiations"]
  },
};

export const SPANISH_COMMON_ERRORS = [
  "Ser vs. estar usage",
  "Por vs. para distinction",
  "Subjunctive mood",
  "Gender agreement",
  "False cognates",
  "Verb tense selection",
  "Preterite vs. imperfect",
  "Object pronouns placement",
  "Irregular verbs",
  "Accent marks"
];

export const SPANISH_SPECIAL_CHARACTERS = [
  { char: 'á', description: 'a with acute accent' },
  { char: 'é', description: 'e with acute accent' },
  { char: 'í', description: 'i with acute accent' },
  { char: 'ó', description: 'o with acute accent' },
  { char: 'ú', description: 'u with acute accent' },
  { char: 'ü', description: 'u with diaeresis' },
  { char: 'ñ', description: 'n with tilde' },
  { char: '¿', description: 'inverted question mark' },
  { char: '¡', description: 'inverted exclamation mark' }
];
