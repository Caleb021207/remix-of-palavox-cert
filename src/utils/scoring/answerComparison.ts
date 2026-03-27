
import { Question } from '@/types';
import { AnswerComparisonResult } from './scoringTypes';

export class AnswerComparison {
  
  // Normalize text for comparison with enhanced cleaning
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, ''); // Remove Spanish articles
  }

  // Enhanced multiple choice comparison with comprehensive fallback strategies
  static compareMultipleChoice(
    userAnswer: any, 
    question: Question
  ): AnswerComparisonResult {
    const debugInfo = {
      questionId: question.id,
      userAnswer,
      questionOptions: question.options,
      attempts: []
    };

    if (!question.options) {
      debugInfo.attempts.push({ method: 'no-options', result: false, reason: 'Question has no options' });
      return { isCorrect: false, method: 'no-options', confidence: 0, debugInfo };
    }

    const correctOption = question.options.find(option => option.isCorrect);
    if (!correctOption) {
      debugInfo.attempts.push({ method: 'no-correct-option', result: false, reason: 'No correct option found' });
      return { isCorrect: false, method: 'no-correct-option', confidence: 0, debugInfo };
    }

    // Method 1: Direct ID comparison
    if (userAnswer === correctOption.id) {
      debugInfo.attempts.push({ method: 'id-match', result: true, confidence: 1.0 });
      return { isCorrect: true, method: 'id-match', confidence: 1.0, debugInfo };
    }
    debugInfo.attempts.push({ method: 'id-match', result: false, reason: `${userAnswer} !== ${correctOption.id}` });

    // Method 2: Text content comparison (enhanced)
    if (typeof userAnswer === 'string') {
      const normalizedUserAnswer = this.normalizeText(userAnswer);
      const normalizedCorrectText = this.normalizeText(correctOption.text);
      
      if (normalizedUserAnswer === normalizedCorrectText) {
        debugInfo.attempts.push({ method: 'text-match', result: true, confidence: 0.9 });
        return { isCorrect: true, method: 'text-match', confidence: 0.9, debugInfo };
      }
      debugInfo.attempts.push({ method: 'text-match', result: false, reason: `"${normalizedUserAnswer}" !== "${normalizedCorrectText}"` });

      // Method 3: Partial text match
      if (normalizedCorrectText.includes(normalizedUserAnswer) || 
          normalizedUserAnswer.includes(normalizedCorrectText)) {
        debugInfo.attempts.push({ method: 'partial-text-match', result: true, confidence: 0.7 });
        return { isCorrect: true, method: 'partial-text-match', confidence: 0.7, debugInfo };
      }
      debugInfo.attempts.push({ method: 'partial-text-match', result: false, reason: 'No partial matches found' });
    }

    // Method 4: Check all options for text matches
    for (const option of question.options) {
      if (typeof userAnswer === 'string') {
        const normalizedUserAnswer = this.normalizeText(userAnswer);
        const normalizedOptionText = this.normalizeText(option.text);
        
        if (normalizedUserAnswer === normalizedOptionText) {
          debugInfo.attempts.push({ 
            method: option.isCorrect ? 'option-text-match' : 'wrong-option-text-match', 
            result: option.isCorrect, 
            confidence: 0.8,
            matchedOption: option
          });
          return { 
            isCorrect: option.isCorrect, 
            method: option.isCorrect ? 'option-text-match' : 'wrong-option-text-match', 
            confidence: 0.8,
            debugInfo
          };
        }
      }
    }
    debugInfo.attempts.push({ method: 'option-text-scan', result: false, reason: 'No option text matches found' });

    // Method 5: Index-based matching (fallback for numeric answers)
    if (typeof userAnswer === 'number' && userAnswer >= 0 && userAnswer < question.options.length) {
      const selectedOption = question.options[userAnswer];
      debugInfo.attempts.push({ 
        method: selectedOption.isCorrect ? 'index-match' : 'wrong-index-match', 
        result: selectedOption.isCorrect, 
        confidence: 0.6,
        selectedOption
      });
      return { 
        isCorrect: selectedOption.isCorrect, 
        method: selectedOption.isCorrect ? 'index-match' : 'wrong-index-match', 
        confidence: 0.6,
        debugInfo
      };
    }

    debugInfo.attempts.push({ method: 'no-match', result: false, reason: 'All comparison methods failed' });
    return { isCorrect: false, method: 'no-match', confidence: 0, debugInfo };
  }

  // Enhanced fill-in-the-blank comparison
  static compareFillInBlank(
    userAnswer: any, 
    question: Question
  ): AnswerComparisonResult {
    const debugInfo = {
      questionId: question.id,
      userAnswer,
      correctAnswer: question.answer,
      attempts: []
    };

    if (!question.answer || typeof userAnswer !== 'string') {
      debugInfo.attempts.push({ method: 'invalid-data', result: false, reason: 'Missing answer or invalid user input' });
      return { isCorrect: false, method: 'invalid-data', confidence: 0, debugInfo };
    }

    const normalizedUser = this.normalizeText(userAnswer);
    const normalizedCorrect = this.normalizeText(question.answer);

    // Exact match
    if (normalizedUser === normalizedCorrect) {
      debugInfo.attempts.push({ method: 'exact-match', result: true, confidence: 1.0 });
      return { isCorrect: true, method: 'exact-match', confidence: 1.0, debugInfo };
    }
    debugInfo.attempts.push({ method: 'exact-match', result: false, reason: `"${normalizedUser}" !== "${normalizedCorrect}"` });

    // Check for common variations
    const variations = [
      normalizedCorrect.replace(/^(el|la|los|las)\s+/, ''), // Remove definite articles
      normalizedCorrect.replace(/^(un|una|unos|unas)\s+/, ''), // Remove indefinite articles
      normalizedCorrect.replace(/s$/, ''), // Remove plural
      normalizedCorrect + 's', // Add plural
    ];

    for (const variation of variations) {
      if (normalizedUser === variation) {
        debugInfo.attempts.push({ method: 'variation-match', result: true, confidence: 0.9, variation });
        return { isCorrect: true, method: 'variation-match', confidence: 0.9, debugInfo };
      }
    }
    debugInfo.attempts.push({ method: 'variation-check', result: false, reason: 'No variations matched' });

    debugInfo.attempts.push({ method: 'text-mismatch', result: false, reason: 'All text comparison methods failed' });
    return { isCorrect: false, method: 'text-mismatch', confidence: 0, debugInfo };
  }
}
