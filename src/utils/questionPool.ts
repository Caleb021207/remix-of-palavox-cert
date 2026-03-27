import { Question } from '@/types';

// Fisher-Yates shuffle algorithm for proper randomization
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Select random questions from a pool, ensuring diversity
export function selectDiverseQuestions(questions: Question[], count: number): Question[] {
  if (questions.length <= count) {
    return fisherYatesShuffle(questions);
  }
  
  // Group questions by similarity patterns to ensure diversity
  const questionGroups = new Map<string, Question[]>();
  
  questions.forEach(question => {
    // Create a simple key based on question characteristics
    const key = getQuestionKey(question);
    if (!questionGroups.has(key)) {
      questionGroups.set(key, []);
    }
    questionGroups.get(key)!.push(question);
  });
  
  // Select from different groups to maximize diversity
  const selectedQuestions: Question[] = [];
  const groupKeys = Array.from(questionGroups.keys());
  const shuffledGroups = fisherYatesShuffle(groupKeys);
  
  let groupIndex = 0;
  while (selectedQuestions.length < count && selectedQuestions.length < questions.length) {
    const currentGroup = questionGroups.get(shuffledGroups[groupIndex % shuffledGroups.length])!;
    
    if (currentGroup.length > 0) {
      // Remove a random question from this group
      const randomIndex = Math.floor(Math.random() * currentGroup.length);
      const selectedQuestion = currentGroup.splice(randomIndex, 1)[0];
      selectedQuestions.push(selectedQuestion);
    }
    
    groupIndex++;
  }
  
  return fisherYatesShuffle(selectedQuestions);
}

// Generate a key to group similar questions
function getQuestionKey(question: Question): string {
  // Simple heuristic to group questions by type and content similarity
  const text = question.text.toLowerCase();
  
  // Categorize by question patterns
  if (text.includes('what') || text.includes('qué')) return 'what-questions';
  if (text.includes('where') || text.includes('dónde')) return 'where-questions';
  if (text.includes('when') || text.includes('cuándo')) return 'when-questions';
  if (text.includes('how') || text.includes('cómo')) return 'how-questions';
  if (text.includes('why') || text.includes('por qué')) return 'why-questions';
  
  // Categorize by topic keywords
  if (text.includes('food') || text.includes('comida') || text.includes('eat')) return 'food-topic';
  if (text.includes('family') || text.includes('familia')) return 'family-topic';
  if (text.includes('work') || text.includes('trabajo')) return 'work-topic';
  if (text.includes('travel') || text.includes('viaje')) return 'travel-topic';
  
  // Categorize by grammar focus
  if (text.includes('verb') || text.includes('verbo')) return 'verb-grammar';
  if (text.includes('adjective') || text.includes('adjetivo')) return 'adjective-grammar';
  
  // Default grouping by first few words
  return text.split(' ').slice(0, 2).join('-');
}

// Track question usage to prevent immediate repetition
class QuestionUsageTracker {
  private recentlyUsed = new Set<string>();
  private maxRecentQuestions = 50; // Track last 50 questions used
  
  markAsUsed(questionId: string): void {
    this.recentlyUsed.add(questionId);
    
    // Keep only the most recent questions
    if (this.recentlyUsed.size > this.maxRecentQuestions) {
      const oldestQuestions = Array.from(this.recentlyUsed).slice(0, this.recentlyUsed.size - this.maxRecentQuestions);
      oldestQuestions.forEach(id => this.recentlyUsed.delete(id));
    }
  }
  
  filterUnused(questions: Question[]): Question[] {
    return questions.filter(q => !this.recentlyUsed.has(q.id));
  }
  
  hasUnusedQuestions(questions: Question[]): boolean {
    return questions.some(q => !this.recentlyUsed.has(q.id));
  }
}

// Global tracker instance
export const questionTracker = new QuestionUsageTracker();

// Enhanced question selection with usage tracking
export function selectFreshQuestions(questions: Question[], count: number): Question[] {
  // First try to get unused questions
  const unusedQuestions = questionTracker.filterUnused(questions);
  
  let selectedQuestions: Question[];
  
  if (unusedQuestions.length >= count) {
    // We have enough unused questions
    selectedQuestions = selectDiverseQuestions(unusedQuestions, count);
  } else if (unusedQuestions.length > 0) {
    // Mix unused with some used questions
    const usedQuestions = questions.filter(q => !unusedQuestions.includes(q));
    const neededFromUsed = count - unusedQuestions.length;
    const selectedUsed = selectDiverseQuestions(usedQuestions, neededFromUsed);
    selectedQuestions = fisherYatesShuffle([...unusedQuestions, ...selectedUsed]);
  } else {
    // All questions have been used recently, select diverse set
    selectedQuestions = selectDiverseQuestions(questions, count);
  }
  
  // Mark selected questions as used
  selectedQuestions.forEach(q => questionTracker.markAsUsed(q.id));
  
  return selectedQuestions;
}
