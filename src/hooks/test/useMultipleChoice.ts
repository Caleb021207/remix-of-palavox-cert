
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { TestSession, TestType, Question } from '@/types';
import { getQuestions, updateQuestionAnalytics } from '@/services/test/questionsService';
import { MULTIPLE_CHOICE_DISTRIBUTION } from '@/config/testConfig';

export const useMultipleChoice = (
  selectedTest: TestType | null,
  session: TestSession | null,
  setSession: React.Dispatch<React.SetStateAction<TestSession | null>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  // Enhanced question loading with better variety and performance
  useEffect(() => {
    if (selectedTest === TestType.MultipleChoice && session && questions.length === 0) {
      const fetchQuestions = async () => {
        try {
          setLoading(true);
          
          console.log('Loading questions with enhanced diversity system...');
          
          // Load questions from all levels using enhanced service
          const [noviceQuestions, intermediateQuestions, advancedQuestions] = await Promise.all([
            getQuestions(TestType.MultipleChoice, 'novice', MULTIPLE_CHOICE_DISTRIBUTION.novice),
            getQuestions(TestType.MultipleChoice, 'intermediate', MULTIPLE_CHOICE_DISTRIBUTION.intermediate),
            getQuestions(TestType.MultipleChoice, 'advanced', MULTIPLE_CHOICE_DISTRIBUTION.advanced)
          ]);
          
          // Combine and ensure variety across levels
          const allQuestions = [
            ...noviceQuestions,
            ...intermediateQuestions,
            ...advancedQuestions
          ];
          
          // Log variety metrics
          const topicVariety = new Set(allQuestions.map(q => q.topicCategory)).size;
          const grammarVariety = new Set(allQuestions.map(q => q.grammarFocus)).size;
          const structureVariety = new Set(allQuestions.map(q => q.questionStructure)).size;
          
          console.log(`Loaded ${allQuestions.length} questions with:`);
          console.log(`- ${topicVariety} different topics`);
          console.log(`- ${grammarVariety} different grammar focuses`);
          console.log(`- ${structureVariety} different question structures`);
          
          setQuestions(allQuestions);
          setQuestionStartTime(Date.now());
          setLoading(false);
        } catch (error) {
          console.error('Error loading enhanced questions:', error);
          toast('Error loading questions. Using fallback system...', {
            duration: 5000,
          });
          setLoading(false);
        }
      };
      
      fetchQuestions();
    }
  }, [selectedTest, session, questions.length, setLoading]);

  const handleAnswer = (questionId: string, answer: string | string[]) => {
    if (!session) return;
    
    // Calculate response time
    const responseTime = Date.now() - questionStartTime;
    
    // Find the question to check if answer is correct
    const question = questions.find(q => q.id === questionId);
    let isCorrect = false;
    
    if (question?.type === 'multipleChoice' && question.options) {
      const selectedOption = question.options.find(opt => opt.id === answer);
      isCorrect = selectedOption?.isCorrect || false;
    }
    
    // Update question analytics in background
    updateQuestionAnalytics(questionId, isCorrect, responseTime).catch(err => 
      console.warn('Failed to update question analytics:', err)
    );
    
    setSession({
      ...session,
      answers: {
        ...session.answers,
        [questionId]: answer
      }
    });
  };

  const handleNextQuestion = (handleSubmitTest: () => void) => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setQuestionStartTime(Date.now()); // Reset timer for next question
    } else {
      handleSubmitTest();
    }
  };

  return {
    questions,
    currentQuestionIndex,
    handleAnswer,
    handleNextQuestion,
  };
};
