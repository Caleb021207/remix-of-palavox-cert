
// Cognitive complexity framework for question generation
export interface CognitiveLevel {
  bloomLevel: string;
  description: string;
  questionStems: string[];
  complexityRequirements: string[];
  distractorStrategy: string;
}

export const COGNITIVE_COMPLEXITY_BY_LEVEL: Record<string, CognitiveLevel> = {
  'A1': {
    bloomLevel: 'Remember/Understand',
    description: 'Direct recall and basic comprehension',
    questionStems: [
      'What is...?',
      'Where does...?',
      'When did...?',
      'Who is...?',
      'Which one...?'
    ],
    complexityRequirements: [
      'Test literal comprehension only',
      'Information should be explicitly stated',
      'Single-step thinking required',
      'Focus on concrete, observable facts'
    ],
    distractorStrategy: 'Use clearly wrong options that beginners might confuse'
  },
  
  'A2': {
    bloomLevel: 'Understand/Apply',
    description: 'Basic interpretation and simple application',
    questionStems: [
      'What does this mean?',
      'Why did...?',
      'How would you...?',
      'What is the main idea of...?',
      'Which example shows...?'
    ],
    complexityRequirements: [
      'Require basic inference from context',
      'Test understanding of cause-effect relationships',
      'Include simple cultural knowledge',
      'May require connecting two related ideas'
    ],
    distractorStrategy: 'Include partially correct answers that require deeper understanding to eliminate'
  },
  
  'B1': {
    bloomLevel: 'Apply/Analyze',
    description: 'Interpretation and analysis of relationships',
    questionStems: [
      'What can be inferred about...?',
      'How does X relate to Y?',
      'What is the author\'s attitude toward...?',
      'Which factor most influences...?',
      'What would likely happen if...?'
    ],
    complexityRequirements: [
      'Require inference and deduction',
      'Test understanding of implicit meanings',
      'Include analysis of tone, mood, or attitude',
      'May require synthesizing multiple pieces of information'
    ],
    distractorStrategy: 'Use subtle distinctions and require elimination of tempting but incorrect options'
  },
  
  'B2': {
    bloomLevel: 'Analyze/Evaluate',
    description: 'Critical analysis and evaluation of ideas',
    questionStems: [
      'What is the most significant reason why...?',
      'How effectively does the author...?',
      'Which argument is most convincing because...?',
      'What assumption underlies...?',
      'How does this perspective compare to...?'
    ],
    complexityRequirements: [
      'Require critical thinking and evaluation',
      'Test ability to distinguish between facts and opinions',
      'Include analysis of argumentation and evidence',
      'May require understanding of implicit cultural assumptions'
    ],
    distractorStrategy: 'Create sophisticated distractors that test nuanced understanding'
  },
  
  'C1': {
    bloomLevel: 'Evaluate/Create',
    description: 'Critical evaluation and complex synthesis',
    questionStems: [
      'What is the underlying assumption behind...?',
      'How does this challenge conventional thinking about...?',
      'What would be the most effective counter-argument to...?',
      'Which interpretation best explains the complexity of...?',
      'How does this text contribute to the broader debate about...?'
    ],
    complexityRequirements: [
      'Require sophisticated critical analysis',
      'Test understanding of complex argumentation',
      'Include evaluation of multiple perspectives',
      'May require knowledge of broader cultural/academic contexts'
    ],
    distractorStrategy: 'Use advanced distractors that require expert-level discrimination'
  },
  
  'C2': {
    bloomLevel: 'Evaluate/Create',
    description: 'Expert-level analysis and creative synthesis',
    questionStems: [
      'What is the most sophisticated interpretation of...?',
      'How does this text deconstruct traditional notions of...?',
      'Which meta-cognitive strategy would be most effective for...?',
      'How does this work both challenge and reinforce...?',
      'What would be the implications if we reconceptualized...?'
    ],
    complexityRequirements: [
      'Require expert-level critical thinking',
      'Test meta-cognitive awareness',
      'Include analysis of complex theoretical frameworks',
      'May require creative synthesis of abstract concepts'
    ],
    distractorStrategy: 'Create expert-level distractors requiring native-like discrimination abilities'
  }
};

export function getCognitiveComplexityPrompt(level: string): string {
  const complexity = COGNITIVE_COMPLEXITY_BY_LEVEL[level];
  if (!complexity) return '';
  
  return `
COGNITIVE COMPLEXITY REQUIREMENTS FOR ${level.toUpperCase()} LEVEL:

Bloom's Taxonomy Level: ${complexity.bloomLevel}
Description: ${complexity.description}

QUESTION STEM REQUIREMENTS:
Use question starters like: ${complexity.questionStems.join(', ')}

COGNITIVE COMPLEXITY REQUIREMENTS:
${complexity.complexityRequirements.map(req => `- ${req}`).join('\n')}

DISTRACTOR STRATEGY:
${complexity.distractorStrategy}

CRITICAL: Questions must actually TEST the cognitive level, not just mention complex topics.
- A1/A2: Test what is literally stated or requires one simple inference
- B1/B2: Test what must be inferred, analyzed, or evaluated from multiple clues
- C1/C2: Test sophisticated analysis, synthesis, or expert-level discrimination

Each question must require the specified cognitive processes to answer correctly.
Wrong answers should be designed to trap learners who don't have the required cognitive skills.
`;
}
