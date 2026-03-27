
// Sophisticated distractor generation strategies
export interface DistractorStrategy {
  strategy: string;
  techniques: string[];
  examples: string[];
}

export const DISTRACTOR_STRATEGIES: Record<string, DistractorStrategy> = {
  'A1-A2': {
    strategy: 'Surface-level confusion and obvious errors',
    techniques: [
      'Use words that sound similar but have different meanings',
      'Include information from elsewhere in the text',
      'Use logical but factually incorrect statements',
      'Include common beginner mistakes'
    ],
    examples: [
      'If answer is "Monday", include "Sunday" (similar day)',
      'If answer is "happy", include "sad" (opposite emotion)',
      'Mix up basic facts that are clearly stated'
    ]
  },
  
  'B1-B2': {
    strategy: 'Partial truths and inference traps',
    techniques: [
      'Create partially correct statements that miss key nuances',
      'Use information that is true but doesn\'t answer the question',
      'Include reasonable inferences that go too far',
      'Create answers that would be correct in different contexts'
    ],
    examples: [
      'If the author implies criticism, include "strongly condemns" (too extreme)',
      'If text suggests possibility, include definitive statements',
      'Use supporting details as if they were main ideas'
    ]
  },
  
  'C1-C2': {
    strategy: 'Sophisticated academic and cultural traps',
    techniques: [
      'Create theoretically sound but contextually inappropriate answers',
      'Use advanced vocabulary to mask incorrect reasoning',
      'Include answers that would be correct for expert readers in different fields',
      'Create subtle logical fallacies that seem sophisticated'
    ],
    examples: [
      'Include academically rigorous but off-topic analysis',
      'Use correct theoretical frameworks applied incorrectly',
      'Create answers that sound authoritative but miss subtle distinctions'
    ]
  }
};

export function generateDistractorPrompt(level: string, questionType: string): string {
  const levelRange = ['A1', 'A2'].includes(level) ? 'A1-A2' : 
                   ['B1', 'B2'].includes(level) ? 'B1-B2' : 'C1-C2';
  
  const strategy = DISTRACTOR_STRATEGIES[levelRange];
  
  return `
DISTRACTOR GENERATION FOR ${level} LEVEL:

Strategy: ${strategy.strategy}

TECHNIQUES TO USE:
${strategy.techniques.map(tech => `- ${tech}`).join('\n')}

EXAMPLES:
${strategy.examples.map(example => `- ${example}`).join('\n')}

CRITICAL DISTRACTOR RULES:
1. Each wrong answer should be tempting to someone at a LOWER cognitive level
2. Correct answer should require the EXACT cognitive skills for this level
3. Distractors should test common misconceptions at this proficiency level
4. Advanced level distractors should require sophisticated discrimination
5. Never use obviously wrong answers that any level could eliminate
`;
}
