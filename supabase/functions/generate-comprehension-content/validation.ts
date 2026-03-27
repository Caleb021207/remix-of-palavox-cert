
export function validateAnswerDistribution(questions: any[]): boolean {
  if (questions.length <= 1) return true;
  
  const correctPositions = questions.map(q => 
    q.options.findIndex((opt: any) => opt.isCorrect)
  );
  
  console.log('Reading content - Correct answer positions:', correctPositions);
  
  // Check if all answers are in the same position
  const allSamePosition = correctPositions.every(pos => pos === correctPositions[0]);
  
  if (allSamePosition && questions.length > 1) {
    console.log(`Warning: All reading questions have correct answers in position ${correctPositions[0]}`);
    return false;
  }
  
  return true;
}

export function shuffleAnswers(questions: any[]): any[] {
  return questions.map((question, qIndex) => {
    const options = [...question.options];
    
    // Reset all to false
    options.forEach(opt => opt.isCorrect = false);
    
    // Assign correct answer to a position based on question index to ensure distribution
    const targetPositions = [0, 2, 1, 3]; // a, c, b, d pattern
    const newCorrectIndex = targetPositions[qIndex % targetPositions.length];
    options[newCorrectIndex].isCorrect = true;
    
    console.log(`Reading Q${qIndex + 1}: Set correct answer to position ${newCorrectIndex} (${String.fromCharCode(97 + newCorrectIndex)})`);
    
    return {
      ...question,
      options
    };
  });
}
