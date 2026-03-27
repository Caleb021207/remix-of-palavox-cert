
import { BatchTheme } from './types.ts';
import { getCognitiveComplexityPrompt } from './cognitiveComplexity.ts';
import { generateDistractorPrompt } from './distractorGenerator.ts';

export function generateCognitivelyEnhancedPrompt(
  testType: string,
  level: string,
  count: number,
  targetLanguage: string,
  baseLanguage: string,
  theme: BatchTheme
): string {
  const { topics, grammarPoints, structures, topicCategory, grammarFocus, questionStructure } = theme;
  
  // Get cognitive complexity requirements
  const cognitivePrompt = getCognitiveComplexityPrompt(level);
  const distractorPrompt = generateDistractorPrompt(level, testType);
  
  let prompt = `ENHANCED COGNITIVE QUESTION GENERATION
THEME: ${theme.seed}
FOCUS: ${topicCategory} + ${grammarFocus} + ${questionStructure}

${cognitivePrompt}

${distractorPrompt}

Create ${count} COGNITIVELY APPROPRIATE ${targetLanguage} ${testType} questions for ${level} level.

MANDATORY COGNITIVE REQUIREMENTS:
- Each question MUST require the specific cognitive skills for ${level} level
- Questions must test UNDERSTANDING, not just vocabulary recognition
- Wrong answers must trap learners who lack the required cognitive abilities
- NO simple factual recall for B1+ levels
- NO obvious wrong answers that any level could eliminate

CONTENT DIVERSITY REQUIREMENTS:
- Each question MUST cover different subtopics: ${topics.join(', ')}
- Each question MUST test different grammar: ${grammarPoints.join(', ')}
- Each question MUST use different structures: ${structures.join(', ')}
- Vary cultural contexts and formality levels
- Ensure authentic ${targetLanguage} language use

CRITICAL: Questions must be IMPOSSIBLE to answer correctly without the cognitive skills required for ${level}.
`;

  switch (testType) {
    case 'multipleChoice':
      prompt += `
Format as JSON array with cognitive metadata:
[
  {
    "text": "question requiring ${level}-level cognitive skills in ${targetLanguage}",
    "options": [
      {"id": "a", "text": "sophisticated distractor in ${targetLanguage}", "isCorrect": false},
      {"id": "b", "text": "another nuanced wrong answer in ${targetLanguage}", "isCorrect": false},
      {"id": "c", "text": "correct answer requiring ${level} reasoning in ${targetLanguage}", "isCorrect": true},
      {"id": "d", "text": "tempting but incorrect option in ${targetLanguage}", "isCorrect": false}
    ],
    "difficulty_sublevel": "${level}",
    "cognitive_level": "${getCognitiveLevel(level)}",
    "requires_inference": ${level !== 'A1'},
    "complexity_score": ${getComplexityScore(level)}
  }
]

DISTRACTOR REQUIREMENTS:
- Option A: ${getDistractorRequirement(level, 'A')}
- Option B: ${getDistractorRequirement(level, 'B')}  
- Option C: CORRECT - Must require ${level}-level cognitive skills
- Option D: ${getDistractorRequirement(level, 'D')}

Each wrong answer must be eliminated only through ${level}-level reasoning.`;
      break;
      
    case 'fillInBlank':
      prompt += `
Format as JSON array:
[
  {
    "text": "sentence requiring ${level}-level reasoning to complete with ____ blank",
    "correct_answer": "answer requiring cognitive understanding in ${targetLanguage}",
    "difficulty_sublevel": "${level}",
    "cognitive_level": "${getCognitiveLevel(level)}",
    "complexity_score": ${getComplexityScore(level)}
  }
]

Fill-in-blank MUST require understanding of context, inference, or analysis - not just vocabulary.`;
      break;
  }
  
  return prompt;
}

function getCognitiveLevel(level: string): string {
  const mapping = {
    'A1': 'Remember',
    'A2': 'Understand', 
    'B1': 'Apply/Analyze',
    'B2': 'Analyze/Evaluate',
    'C1': 'Evaluate',
    'C2': 'Create/Synthesize'
  };
  return mapping[level as keyof typeof mapping] || 'Remember';
}

function getComplexityScore(level: string): number {
  const scores = {
    'A1': 15,
    'A2': 30,
    'B1': 50,
    'B2': 70,
    'C1': 85,
    'C2': 95
  };
  return scores[level as keyof typeof scores] || 15;
}

function getDistractorRequirement(level: string, option: string): string {
  const requirements = {
    'A1-A2': {
      'A': 'Related but clearly wrong fact from text',
      'B': 'Common beginner confusion',
      'D': 'Logical but factually incorrect'
    },
    'B1-B2': {
      'A': 'Partially correct but missing key nuance',
      'B': 'Reasonable inference that goes too far', 
      'D': 'True statement that doesn\'t answer question'
    },
    'C1-C2': {
      'A': 'Sophisticated but contextually inappropriate',
      'B': 'Academically sound but misapplied theory',
      'D': 'Expert-level distractor requiring native discrimination'
    }
  };
  
  const levelRange = ['A1', 'A2'].includes(level) ? 'A1-A2' : 
                   ['B1', 'B2'].includes(level) ? 'B1-B2' : 'C1-C2';
  
  return requirements[levelRange][option as keyof typeof requirements[typeof levelRange]];
}
