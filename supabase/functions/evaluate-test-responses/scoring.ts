
// CEFR level weights for weighted MCQ scoring
const LEVEL_WEIGHTS: Record<string, number> = {
  'A1': 0.5,
  'A2': 0.75,
  'B1': 1.0,
  'B2': 1.25,
  'C1': 1.5,
  'C2': 2.0
};

export function evaluateMultipleChoiceAnswers(content: any[], responses: Record<string, any>): number {
  let totalWeightedCorrect = 0;
  let totalWeight = 0;
  
  console.log('📝 Evaluating multiple choice with WEIGHTED scoring...');
  
  content.forEach((levelContent: any, levelIndex: number) => {
    const level = levelContent.level || 'B1';
    const weight = LEVEL_WEIGHTS[level] || 1.0;
    
    console.log(`📖 Processing ${level} (weight: ${weight}) with ${levelContent.questions?.length || 0} questions`);
    
    if (levelContent.questions) {
      levelContent.questions.forEach((question: any, qIndex: number) => {
        totalWeight += weight;
        const userAnswer = responses[question.id];
        const correctOption = question.options?.find((opt: any) => opt.isCorrect);
        
        console.log(`❓ Question ${qIndex + 1} (${question.id}):`, {
          userAnswer,
          correctOptionId: correctOption?.id,
          level,
          weight
        });
        
        if (userAnswer === correctOption?.id) {
          totalWeightedCorrect += weight;
          console.log(`✅ Correct (Level ${level}, Weight ${weight})`);
        } else {
          console.log(`❌ Incorrect (Level ${level})`);
        }
      });
    }
  });
  
  const weightedScore = totalWeight > 0 
    ? (totalWeightedCorrect / totalWeight) * 100 
    : 0;
    
  console.log(`📊 Weighted score: ${totalWeightedCorrect.toFixed(2)}/${totalWeight.toFixed(2)} = ${weightedScore.toFixed(1)}%`);
  
  return weightedScore;
}

// Calculate CEFR and ACTFL levels from score
export function calculateLevel(score: number): { cefr: string; actfl: string } {
  if (score >= 83) return { cefr: 'C1', actfl: 'Advanced-Mid' };
  if (score >= 73) return { cefr: 'B2', actfl: 'Intermediate-High' };
  if (score >= 63) return { cefr: 'B1', actfl: 'Intermediate-Mid' };
  if (score >= 53) return { cefr: 'A2+', actfl: 'Intermediate-Low' };
  if (score >= 43) return { cefr: 'A2', actfl: 'Novice-High' };
  if (score >= 33) return { cefr: 'A1+', actfl: 'Novice-Mid' };
  if (score >= 19) return { cefr: 'A1', actfl: 'Novice-Low' };
  return { cefr: 'Pre-A1', actfl: 'Beginner' };
}
