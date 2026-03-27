
// Fisher-Yates shuffle
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Enhanced question shuffling with diversity constraints
export function shuffleAndSelectDiverse(questions: any[], count: number): any[] {
  if (questions.length <= count) {
    return fisherYatesShuffle(questions);
  }
  
  // Group by topic and grammar to ensure variety
  const topicGroups = new Map<string, any[]>();
  const grammarGroups = new Map<string, any[]>();
  
  questions.forEach(q => {
    const topic = q.topic_category || 'general';
    const grammar = q.grammar_focus || 'general';
    
    if (!topicGroups.has(topic)) topicGroups.set(topic, []);
    if (!grammarGroups.has(grammar)) grammarGroups.set(grammar, []);
    
    topicGroups.get(topic)!.push(q);
    grammarGroups.get(grammar)!.push(q);
  });
  
  // Select questions ensuring topic and grammar diversity
  const selected = [];
  const usedQuestions = new Set();
  const maxPerTopic = Math.max(1, Math.floor(count / topicGroups.size));
  
  // First pass: select from each topic group
  for (const [topic, topicQuestions] of topicGroups) {
    const shuffled = fisherYatesShuffle(topicQuestions);
    let added = 0;
    
    for (const q of shuffled) {
      if (selected.length >= count) break;
      if (usedQuestions.has(q.id)) continue;
      if (added >= maxPerTopic) break;
      
      selected.push(q);
      usedQuestions.add(q.id);
      added++;
    }
  }
  
  // Fill remaining slots with unused questions
  const remainingQuestions = questions.filter(q => !usedQuestions.has(q.id));
  const shuffledRemaining = fisherYatesShuffle(remainingQuestions);
  
  for (const q of shuffledRemaining) {
    if (selected.length >= count) break;
    selected.push(q);
  }
  
  return fisherYatesShuffle(selected);
}
