import { ReadingContent } from './types.ts';

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  score: number; // 0-100
}

export function validateReadingContent(content: ReadingContent, level: string): ValidationResult {
  const issues: string[] = [];
  let score = 100;

  // Validate text length
  const wordCount = content.passage.split(/\s+/).length;
  const expectedRanges = {
    'A1': { min: 50, max: 100 },
    'A2': { min: 80, max: 150 },
    'B1': { min: 120, max: 200 },
    'B2': { min: 180, max: 280 },
    'C1': { min: 250, max: 400 },
    'C2': { min: 300, max: 450 },
    'Advanced': { min: 250, max: 450 }
  };

  const range = expectedRanges[level as keyof typeof expectedRanges];
  if (range) {
    if (wordCount < range.min) {
      issues.push(`Text too short: ${wordCount} words (expected ${range.min}-${range.max})`);
      score -= 20;
    } else if (wordCount > range.max) {
      issues.push(`Text too long: ${wordCount} words (expected ${range.min}-${range.max})`);
      score -= 10;
    }
  }

  // Validate question count
  if (content.questions.length === 0) {
    issues.push('No questions generated');
    score -= 50;
  }

  // Validate answer distribution
  const correctPositions = content.questions.map(q => 
    q.options.findIndex(opt => opt.isCorrect)
  );
  
  const uniquePositions = new Set(correctPositions);
  if (uniquePositions.size === 1 && content.questions.length > 1) {
    issues.push('All correct answers in same position');
    score -= 30;
  }

  // Validate each question has exactly one correct answer
  content.questions.forEach((q, idx) => {
    const correctCount = q.options.filter(opt => opt.isCorrect).length;
    if (correctCount !== 1) {
      issues.push(`Question ${idx + 1} has ${correctCount} correct answers (should be 1)`);
      score -= 15;
    }
  });

  // Cognitive complexity check (basic)
  const cognitiveIndicators = {
    'A1': ['what', 'who', 'where', 'when', 'which'],
    'A2': ['why', 'how', 'describe', 'explain'],
    'B1': ['infer', 'imply', 'suggest', 'purpose', 'main idea'],
    'B2': ['analyze', 'attitude', 'tone', 'perspective', 'nuance'],
    'Advanced': ['evaluate', 'assumption', 'underlying', 'subtle', 'sophisticated']
  };

  const expectedIndicators = cognitiveIndicators[level as keyof typeof cognitiveIndicators] || [];
  const questionsText = content.questions.map(q => q.text.toLowerCase()).join(' ');
  const hasIndicators = expectedIndicators.some(indicator => 
    questionsText.includes(indicator.toLowerCase())
  );

  if (!hasIndicators && level !== 'A1') {
    issues.push(`Questions may not match ${level} cognitive complexity`);
    score -= 15;
  }

  return {
    isValid: score >= 60,
    issues,
    score: Math.max(0, score)
  };
}

export function validateVocabularyLevel(text: string, level: string): boolean {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const uniqueWords = new Set(words);
  const lexicalDiversity = uniqueWords.size / words.length;

  // Expected lexical diversity by level
  const expectedDiversity = {
    'A1': 0.4,
    'A2': 0.5,
    'B1': 0.6,
    'B2': 0.7,
    'Advanced': 0.75
  };

  const target = expectedDiversity[level as keyof typeof expectedDiversity] || 0.6;
  return lexicalDiversity >= target - 0.1; // Allow 10% tolerance
}
