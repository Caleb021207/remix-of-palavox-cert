
// Cognitive complexity framework for reading passages
export interface ReadingComplexityLevel {
  bloomLevel: string;
  description: string;
  textCharacteristics: string[];
  contentRequirements: string[];
  structuralFeatures: string[];
  vocabularyLevel: string;
  cognitiveLoad: string;
}

export const READING_COGNITIVE_COMPLEXITY: Record<string, ReadingComplexityLevel> = {
  'A1': {
    bloomLevel: 'Remember/Understand',
    description: 'Basic factual comprehension',
    textCharacteristics: [
      'Simple present tense dominates',
      'Concrete, familiar vocabulary',
      'Short, simple sentences (5-10 words)',
      'Linear chronological structure',
      'Explicit connections between ideas'
    ],
    contentRequirements: [
      'Familiar daily life topics',
      'Observable, concrete information',
      'No cultural assumptions required',
      'Direct cause-effect relationships',
      'Factual information only'
    ],
    structuralFeatures: [
      'Clear topic sentences',
      'Simple paragraph structure',
      'Repetitive language patterns',
      'Minimal use of pronouns',
      'Sequential organization'
    ],
    vocabularyLevel: 'High-frequency words (top 1000)',
    cognitiveLoad: 'Minimal - direct information processing'
  },
  
  'A2': {
    bloomLevel: 'Understand/Apply',
    description: 'Basic interpretation and simple connections',
    textCharacteristics: [
      'Mix of present, past, and future tenses',
      'Some descriptive language',
      'Compound sentences with basic connectors',
      'Simple narrative structure',
      'Some implicit information'
    ],
    contentRequirements: [
      'Extended personal experiences',
      'Simple cultural references',
      'Basic emotional content',
      'Simple problem-solution patterns',
      'Some inferential content'
    ],
    structuralFeatures: [
      'Clear paragraph breaks',
      'Basic transitional phrases',
      'Some pronoun references',
      'Simple comparative structures',
      'Predictable organization'
    ],
    vocabularyLevel: 'Common vocabulary (top 2000 words)',
    cognitiveLoad: 'Low - some simple inferences required'
  },
  
  'B1': {
    bloomLevel: 'Apply/Analyze',
    description: 'Analysis of relationships and implicit meanings',
    textCharacteristics: [
      'Complex sentence structures',
      'Mixed tenses with aspect',
      'Abstract and concrete concepts',
      'Non-linear organization',
      'Implicit cause-effect relationships'
    ],
    contentRequirements: [
      'Social and cultural topics',
      'Multiple perspectives presented',
      'Implied cultural knowledge',
      'Problem-analysis-solution structure',
      'Requires background knowledge activation'
    ],
    structuralFeatures: [
      'Complex paragraph development',
      'Sophisticated connectors',
      'Extensive pronoun use',
      'Embedded clauses',
      'Topic progression across paragraphs'
    ],
    vocabularyLevel: 'Academic and professional vocabulary',
    cognitiveLoad: 'Moderate - requires analysis and synthesis'
  },
  
  'B2': {
    bloomLevel: 'Analyze/Evaluate',
    description: 'Critical analysis and evaluation of complex ideas',
    textCharacteristics: [
      'Sophisticated syntax',
      'Nuanced vocabulary choices',
      'Abstract conceptual content',
      'Multiple embedded ideas',
      'Subtle logical relationships'
    ],
    contentRequirements: [
      'Complex social issues',
      'Multiple conflicting viewpoints',
      'Cultural and historical context',
      'Argumentation and evidence',
      'Requires critical evaluation'
    ],
    structuralFeatures: [
      'Multi-layered argumentation',
      'Sophisticated discourse markers',
      'Complex reference chains',
      'Rhetorical devices',
      'Non-obvious organization patterns'
    ],
    vocabularyLevel: 'Advanced academic vocabulary',
    cognitiveLoad: 'High - requires critical thinking and evaluation'
  },
  
  'C1': {
    bloomLevel: 'Evaluate',
    description: 'Advanced analysis with expert-level reasoning',
    textCharacteristics: [
      'Highly sophisticated syntax',
      'Precise vocabulary choices',
      'Abstract and theoretical content',
      'Complex layered ideas',
      'Implicit logical relationships'
    ],
    contentRequirements: [
      'Theoretical and philosophical topics',
      'Multiple complex viewpoints',
      'Deep cultural and historical context',
      'Sophisticated argumentation',
      'Requires synthesis and evaluation'
    ],
    structuralFeatures: [
      'Complex rhetorical organization',
      'Advanced discourse markers',
      'Sophisticated reference chains',
      'Literary and rhetorical devices',
      'Expert-level organization'
    ],
    vocabularyLevel: 'Advanced academic/specialized vocabulary',
    cognitiveLoad: 'Very high - requires expert analysis'
  },
  
  'C2': {
    bloomLevel: 'Evaluate/Create',
    description: 'Mastery-level synthesis and creative interpretation',
    textCharacteristics: [
      'Literary or academic register',
      'Sophisticated stylistic devices',
      'Multiple layers of meaning',
      'Complex intertextual references',
      'Subtle implications and nuances'
    ],
    contentRequirements: [
      'Complex theoretical/philosophical topics',
      'Meta-cognitive content',
      'Deep cultural and intellectual sophistication',
      'Multiple interpretive possibilities',
      'Requires creative synthesis'
    ],
    structuralFeatures: [
      'Advanced rhetorical organization',
      'Implicit logical connections',
      'Complex narrative techniques',
      'Sophisticated register variation',
      'Expert-level discourse patterns'
    ],
    vocabularyLevel: 'Specialized/Technical/Literary vocabulary',
    cognitiveLoad: 'Extremely high - requires mastery-level analysis and creativity'
  },
  
  'Advanced': {
    bloomLevel: 'Evaluate/Create',
    description: 'Expert-level synthesis and creative analysis',
    textCharacteristics: [
      'Literary or academic register',
      'Sophisticated stylistic devices',
      'Multiple layers of meaning',
      'Complex intertextual references',
      'Subtle implications and nuances'
    ],
    contentRequirements: [
      'Theoretical or philosophical topics',
      'Meta-cognitive content',
      'Cultural and intellectual sophistication',
      'Multiple interpretive possibilities',
      'Requires creative synthesis'
    ],
    structuralFeatures: [
      'Advanced rhetorical organization',
      'Implicit logical connections',
      'Complex narrative techniques',
      'Sophisticated register variation',
      'Expert-level discourse patterns'
    ],
    vocabularyLevel: 'Specialized/Technical vocabulary',
    cognitiveLoad: 'Very high - requires expert-level analysis and creativity'
  }
};

export function getCognitiveReadingPrompt(level: string): string {
  const complexity = READING_COGNITIVE_COMPLEXITY[level];
  if (!complexity) return '';
  
  return `
COGNITIVE READING COMPLEXITY FOR ${level.toUpperCase()} LEVEL:

Bloom's Taxonomy Level: ${complexity.bloomLevel}
Cognitive Load: ${complexity.cognitiveLoad}
Description: ${complexity.description}

TEXT CHARACTERISTICS REQUIREMENTS:
${complexity.textCharacteristics.map(char => `- ${char}`).join('\n')}

CONTENT REQUIREMENTS:
${complexity.contentRequirements.map(req => `- ${req}`).join('\n')}

STRUCTURAL FEATURES:
${complexity.structuralFeatures.map(feat => `- ${feat}`).join('\n')}

VOCABULARY LEVEL: ${complexity.vocabularyLevel}

CRITICAL: The reading passage must REQUIRE ${level}-level cognitive skills to fully comprehend.
- Text should NOT be understandable to lower-level readers
- Content must demand the specific cognitive processes for this level
- Vocabulary and structures should match the cognitive complexity
- Cultural and contextual knowledge should be appropriate for the level

The passage should be IMPOSSIBLE to fully understand without ${level}-level language skills and cognitive abilities.
`;
}
