
import { EvaluationResult } from '@/types';
import { TARGET_LANGUAGE, BASE_LANGUAGE } from '@/config/languageConfig';
import { PROFICIENCY_LEVELS } from '@/utils/proficiencyScoring';

// Evaluate writing or speaking response using Proficiency Level criteria
export async function evaluateResponse(
  responseType: 'writing' | 'speaking',
  content: string,
  prompt?: string,
  level?: string
): Promise<EvaluationResult> {
  try {
    // Generate Proficiency Level-informed prompt
    const proficiencyCriteria = generateProficiencyEvaluationPrompt(responseType);
    
    const response = await fetch(`${window.location.origin}/functions/v1/evaluate-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        responseType,
        content,
        prompt,
        level,
        targetLanguage: TARGET_LANGUAGE,
        baseLanguage: BASE_LANGUAGE,
        proficiencyCriteria // Include Proficiency Level criteria in the evaluation
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error evaluating ${TARGET_LANGUAGE} response: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error in evaluateResponse:`, error);
    throw error;
  }
}

function generateProficiencyEvaluationPrompt(responseType: 'writing' | 'speaking'): string {
  return `
Please evaluate this response using proficiency-level criteria:

Proficiencys (1-8):
${PROFICIENCY_LEVELS.map(level => 
  `Level ${level.level} - ${level.name}:
  - Text Type: ${level.textType}
  - Language Control: ${level.languageControl}
  - Vocabulary: ${level.vocabulary}
  - Accuracy: ${level.accuracy}
  - Score Range: ${level.scoreRange[0]}-${level.scoreRange[1]}%`
).join('\n\n')}

Evaluation Criteria:
1. Text Type: What type of language structures does the learner produce?
2. Language Control/Functions: How well can they manipulate grammatical structures?
3. Vocabulary: What range and sophistication of vocabulary do they demonstrate?
4. Accuracy/Comprehensibility: How accurate and understandable is their language?

${responseType === 'speaking' ? 
  'For speaking assessment, also consider pronunciation, intonation, and fluency as part of accuracy/comprehensibility.' :
  'For writing assessment, also consider spelling, punctuation, and text organization.'
}

Assign a Proficiency Level level (1-8) and corresponding percentage score based on these detailed criteria.
`;
}
