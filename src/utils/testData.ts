
import { Question, QuestionType, CEFRLevel, TestType } from '../types';
import { getQuestions } from '../services/testService';

// Sample questions to use as fallback
export const sampleQuestions: Question[] = [
  {
    id: '1',
    type: QuestionType.MultipleChoice,
    text: 'What is the capital of France?',
    options: [
      { id: 'a', text: 'London', isCorrect: false },
      { id: 'b', text: 'Paris', isCorrect: true },
      { id: 'c', text: 'Madrid', isCorrect: false },
      { id: 'd', text: 'Berlin', isCorrect: false }
    ],
    level: CEFRLevel.A1
  },
  {
    id: '2',
    type: QuestionType.MultipleChoice,
    text: 'Which of these is a common greeting in Spanish?',
    options: [
      { id: 'a', text: 'Bonjour', isCorrect: false },
      { id: 'b', text: 'Ciao', isCorrect: false },
      { id: 'c', text: 'Hola', isCorrect: true },
      { id: 'd', text: 'Hello', isCorrect: false }
    ],
    level: CEFRLevel.A1
  },
  {
    id: '3',
    type: QuestionType.FillInBlank,
    text: 'She _____ to the store yesterday.',
    answer: 'went',
    level: CEFRLevel.A2
  },
  {
    id: '4',
    type: QuestionType.ShortAnswer,
    text: 'Describe your morning routine in 2-3 sentences.',
    level: CEFRLevel.B1
  },
  {
    id: '5',
    type: QuestionType.MultipleChoice,
    text: 'Which of these sentences contains the subjunctive mood?',
    options: [
      { id: 'a', text: 'I eat breakfast every day.', isCorrect: false },
      { id: 'b', text: 'I will go to the party tomorrow.', isCorrect: false },
      { id: 'c', text: 'I wish he were here.', isCorrect: true },
      { id: 'd', text: 'He has been working all day.', isCorrect: false }
    ],
    level: CEFRLevel.C1
  }
];

export const getTestQuestions = async (count: number = 10): Promise<Question[]> => {
  try {
    // Default to multiple choice test type and B1 level
    const questions = await getQuestions(
      TestType.MultipleChoice, 
      CEFRLevel.B1, 
      count
    );
    return questions;
  } catch (error) {
    console.error('Error fetching questions from API, using sample questions instead:', error);
    
    // If API call fails, fall back to sample questions
    const questions = [...sampleQuestions];
    
    // Duplicate sample questions if needed
    while (questions.length < count) {
      questions.push(...sampleQuestions.slice(0, count - questions.length));
    }
    
    return questions.slice(0, count);
  }
};
