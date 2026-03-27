
export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

export function validateResponse(content: string, phase: string): ValidationResult {
  // Basic validation
  if (!content || typeof content !== 'string') {
    return { isValid: false, reason: 'No content provided' };
  }

  const trimmedContent = content.trim();
  const wordCount = trimmedContent.split(/\s+/).filter(word => word.length > 0).length;
  
  // Minimum word requirements by phase
  const minWords = phase === 'writing' ? 15 : 5; // Writing needs more words
  
  if (wordCount < minWords) {
    return { isValid: false, reason: `Response too short (${wordCount} words, minimum ${minWords})` };
  }

  // Check for repetitive single-word responses
  const words = trimmedContent.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  if (uniqueWords.size === 1 && wordCount > 1) {
    return { isValid: false, reason: 'Repetitive single-word response' };
  }

  // Check for common non-responses
  const nonResponses = ['yes', 'no', 'ok', 'okay', 'good', 'bad', 'nice', 'fine'];
  if (wordCount <= 3 && words.every(word => nonResponses.includes(word.toLowerCase()))) {
    return { isValid: false, reason: 'Non-substantive response' };
  }

  return { isValid: true };
}

export function cleanJsonResponse(content: string): string {
  let cleaned = content.trim();
  
  // Remove markdown code block markers
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/, '');
  cleaned = cleaned.replace(/\s*```$/, '');
  
  return cleaned.trim();
}

export function validateEvaluationResult(evaluation: any): { score: number; feedback: any } {
  console.log('🔍 Validating evaluation result:', evaluation);
  
  if (!evaluation || typeof evaluation !== 'object') {
    console.error('❌ Invalid evaluation object:', evaluation);
    throw new Error('Invalid evaluation object');
  }
  
  // Extract and validate score
  let score = 0;
  if (typeof evaluation.score === 'number') {
    score = evaluation.score;
  } else if (typeof evaluation.score === 'string') {
    score = parseFloat(evaluation.score);
    if (isNaN(score)) {
      console.warn('⚠️ Could not parse score from string, using default');
      score = 5; // Conservative default for failed parsing
    }
  } else {
    console.warn('⚠️ No valid score found, using default score of 5');
    score = 5; // Conservative default
  }
  
  // Ensure score is within valid range
  score = Math.max(0, Math.min(100, score));
  console.log('✅ Validated score:', score);
  
  // Extract and validate feedback
  const feedback = evaluation.feedback || evaluation.comments || evaluation.analysis || {
    grammar: 'Assessment completed',
    vocabulary: 'Assessment completed',
    coherence: 'Assessment completed',
    overall: 'Assessment completed'
  };
  
  // Ensure feedback is an object with string values
  if (typeof feedback === 'object') {
    Object.keys(feedback).forEach(key => {
      if (typeof feedback[key] !== 'string') {
        feedback[key] = 'Assessment completed';
      }
    });
  }
  
  console.log('✅ Validated feedback keys:', Object.keys(feedback));
  
  return { score, feedback };
}
