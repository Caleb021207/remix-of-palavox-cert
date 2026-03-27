
// Question difficulty validation system
interface QuestionAnalysis {
  cognitiveLevel: string;
  complexityScore: number;
  issues: string[];
  suggestions: string[];
  meetsStandards: boolean;
}

export function validateQuestionComplexity(
  question: any, 
  expectedLevel: string, 
  content: string
): QuestionAnalysis {
  const analysis: QuestionAnalysis = {
    cognitiveLevel: 'unknown',
    complexityScore: 0,
    issues: [],
    suggestions: [],
    meetsStandards: false
  };

  // Analyze question stem complexity
  const questionText = question.text.toLowerCase();
  
  // Check for appropriate cognitive verbs
  const cognitiveVerbs = {
    'A1-A2': ['what', 'where', 'when', 'who', 'which', 'is', 'are', 'does'],
    'B1-B2': ['why', 'how', 'infer', 'suggest', 'imply', 'conclude', 'compare'],
    'C1-C2': ['evaluate', 'analyze', 'synthesize', 'critique', 'assess', 'justify']
  };

  // Determine cognitive level based on question stems
  for (const [levelRange, verbs] of Object.entries(cognitiveVerbs)) {
    if (verbs.some(verb => questionText.includes(verb))) {
      analysis.cognitiveLevel = levelRange;
      break;
    }
  }

  // Check if question requires information synthesis
  const requiresSynthesis = questionText.includes('both') || 
                           questionText.includes('combine') || 
                           questionText.includes('relationship');

  // Check if answer is explicitly stated vs requires inference
  const answerInText = question.options?.some((opt: any) => 
    opt.isCorrect && content.toLowerCase().includes(opt.text.toLowerCase())
  );

  // Calculate complexity score
  let score = 0;
  
  // Question stem complexity
  if (questionText.includes('what') && questionText.includes('explicitly')) score += 10;
  if (questionText.includes('infer') || questionText.includes('suggest')) score += 30;
  if (questionText.includes('evaluate') || questionText.includes('analyze')) score += 50;
  if (questionText.includes('synthesize') || questionText.includes('compare')) score += 60;
  
  // Answer location complexity
  if (answerInText) score += 10;
  else score += 40;
  
  // Synthesis requirement
  if (requiresSynthesis) score += 20;
  
  // Distractor sophistication (basic check)
  const hasSimpleDistractors = question.options?.some((opt: any) => 
    !opt.isCorrect && (opt.text === 'yes' || opt.text === 'no' || opt.text.length < 5)
  );
  
  if (hasSimpleDistractors) score -= 20;

  analysis.complexityScore = Math.max(0, Math.min(100, score));

  // Validate against expected level
  const expectedRanges = {
    'A1': { min: 0, max: 25 },
    'A2': { min: 20, max: 40 },
    'B1': { min: 35, max: 60 },
    'B2': { min: 55, max: 80 },
    'C1': { min: 75, max: 95 },
    'C2': { min: 90, max: 100 }
  };

  const expectedRange = expectedRanges[expectedLevel as keyof typeof expectedRanges];
  if (expectedRange) {
    analysis.meetsStandards = analysis.complexityScore >= expectedRange.min && 
                             analysis.complexityScore <= expectedRange.max;
    
    if (analysis.complexityScore < expectedRange.min) {
      analysis.issues.push(`Question too simple for ${expectedLevel} level`);
      analysis.suggestions.push('Use more sophisticated question stems requiring inference');
      analysis.suggestions.push('Ensure answer requires cognitive skills appropriate for level');
    }
    
    if (analysis.complexityScore > expectedRange.max) {
      analysis.issues.push(`Question too complex for ${expectedLevel} level`);
      analysis.suggestions.push('Simplify question stem and reduce inference requirements');
    }
  }

  // Additional validation checks
  if (answerInText) {
    analysis.issues.push('Answer appears to be explicitly stated in text');
    analysis.suggestions.push('Require inference or analysis rather than direct lookup');
  }

  if (hasSimpleDistractors) {
    analysis.issues.push('Distractors appear too obvious');
    analysis.suggestions.push('Create more sophisticated wrong answers');
  }

  return analysis;
}

export function generateValidationReport(questions: any[], expectedLevel: string, content: string): string {
  const analyses = questions.map(q => validateQuestionComplexity(q, expectedLevel, content));
  
  const passedQuestions = analyses.filter(a => a.meetsStandards).length;
  const averageComplexity = analyses.reduce((sum, a) => sum + a.complexityScore, 0) / analyses.length;
  
  let report = `QUESTION VALIDATION REPORT FOR ${expectedLevel} LEVEL:\n\n`;
  report += `Questions meeting standards: ${passedQuestions}/${analyses.length}\n`;
  report += `Average complexity score: ${averageComplexity.toFixed(1)}/100\n\n`;
  
  analyses.forEach((analysis, index) => {
    report += `Question ${index + 1}:\n`;
    report += `- Cognitive Level: ${analysis.cognitiveLevel}\n`;
    report += `- Complexity Score: ${analysis.complexityScore}/100\n`;
    report += `- Meets Standards: ${analysis.meetsStandards ? 'YES' : 'NO'}\n`;
    
    if (analysis.issues.length > 0) {
      report += `- Issues: ${analysis.issues.join(', ')}\n`;
    }
    
    if (analysis.suggestions.length > 0) {
      report += `- Suggestions: ${analysis.suggestions.join(', ')}\n`;
    }
    report += '\n';
  });
  
  return report;
}
