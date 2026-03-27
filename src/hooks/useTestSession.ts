import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { TestType, TestSession, Question, ACTFLLevel, EvaluationResult, CEFRLevel } from '@/types';
import { getQuestions, saveTestSession } from '@/services/testService';
import { determineCEFRLevel, determineACTFLLevel, calculateScore } from '@/utils/scoring';
import { LEVEL_DISTRIBUTION, MULTIPLE_CHOICE_DISTRIBUTION, TEST_DURATION } from '@/config/testConfig';

// Generate a proper UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const useTestSession = () => {
  const navigate = useNavigate();
  const [testStarted, setTestStarted] = useState(false);
  const [selectedTest, setSelectedTest] = useState<TestType | null>(null);
  const [session, setSession] = useState<TestSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(TEST_DURATION.multipleChoice);
  const [loading, setLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<ACTFLLevel>(ACTFLLevel.IntermediateMid);
  const [useRealtime, setUseRealtime] = useState(false);

  // Initialize test session when test type is selected
  useEffect(() => {
    if (selectedTest && !session) {
      setLoading(true);
      
      // Create a new session with proper UUID
      const testSession: TestSession = {
        id: generateUUID(),
        testType: selectedTest,
        answers: {},
        startTime: new Date(),
      };
      
      // Set time limit based on test type
      setTimeRemaining(TEST_DURATION[selectedTest] || TEST_DURATION.multipleChoice);
      
      if (selectedTest === TestType.MultipleChoice) {
        // For multiple choice, load questions from all levels
        const fetchQuestions = async () => {
          try {
            const noviceQuestions = await getQuestions(
              TestType.MultipleChoice, 
              LEVEL_DISTRIBUTION.novice.join(','), 
              MULTIPLE_CHOICE_DISTRIBUTION.novice
            );
            
            const intermediateQuestions = await getQuestions(
              TestType.MultipleChoice, 
              LEVEL_DISTRIBUTION.intermediate.join(','), 
              MULTIPLE_CHOICE_DISTRIBUTION.intermediate
            );
            
            const advancedQuestions = await getQuestions(
              TestType.MultipleChoice, 
              LEVEL_DISTRIBUTION.advanced.join(','), 
              MULTIPLE_CHOICE_DISTRIBUTION.advanced
            );
            
            // Combine all questions and shuffle them
            const allQuestions = [
              ...noviceQuestions,
              ...intermediateQuestions,
              ...advancedQuestions
            ].sort(() => Math.random() - 0.5);
            
            setQuestions(allQuestions);
            setSession(testSession);
            setLoading(false);
          } catch (error) {
            console.error('Error loading questions:', error);
            toast('Error loading questions. Please try again later', {
              duration: 5000,
            });
            setLoading(false);
          }
        };
        
        fetchQuestions();
      } else {
        // For other test types, we don't need to pre-load questions
        setSession(testSession);
        setLoading(false);
      }
    }
  }, [selectedTest, session]);

  // Timer countdown
  useEffect(() => {
    if (!testStarted || !session) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [testStarted, session]);

  const handleStartTest = (testType: TestType) => {
    setSelectedTest(testType);
    setTestStarted(true);
  };

  const handleRealtimeTest = () => {
    setUseRealtime(true);
    setSelectedTest(TestType.Speaking);
    setTestStarted(true);
  };

  const handleSelectLevel = (level: ACTFLLevel) => {
    setSelectedLevel(level);
  };

  const handleAnswer = (questionId: string, answer: string | string[]) => {
    if (!session) return;
    
    setSession({
      ...session,
      answers: {
        ...session.answers,
        [questionId]: answer
      }
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmitTest();
    }
  };

  const handleTestComplete = (result: EvaluationResult, content: string, prompt?: string) => {
    if (!session) return;
    
    // Complete the session with the evaluation
    const completedSession: TestSession = {
      ...session,
      endTime: new Date(),
      score: result.score,
      cefr: result.cefr_level,
      actfl: result.actfl_level,
      feedback: result.feedback,
      transcript: content
    };
    
    // Save the completed session and navigate to results
    saveSessionAndRedirect(completedSession);
  };

  const handleSubmitTest = async () => {
    if (!session) return;
    
    setLoading(true);
    console.log('📝 Submitting test for session:', session.id);
    
    try {
      // Complete the session
      const completedSession = {
        ...session,
        endTime: new Date(),
        questions
      };
      
      // Calculate score using the unified scoring system
      const score = calculateScore(completedSession);
      console.log('📊 Calculated score:', score);
      
      // Use unified CEFR and ACTFL determination from scoring.ts
      const cefr = determineCEFRLevel(score);
      const actfl = determineACTFLLevel(score);
      
      console.log('🎯 Unified level determination:', { score, cefr, actfl });

      const finalSession = {
        ...completedSession,
        score,
        cefr,
        actfl
      };
      
      console.log('✅ Final session prepared:', {
        sessionId: finalSession.id,
        score: finalSession.score,
        cefr: finalSession.cefr,
        actfl: finalSession.actfl
      });
      
      // Save the completed session and navigate to results
      saveSessionAndRedirect(finalSession);
    } catch (error) {
      console.error('❌ Error submitting test:', error);
      toast('Error submitting test. Please try again', {
        duration: 5000,
      });
      setLoading(false);
    }
  };
  
  const saveSessionAndRedirect = async (finalSession: TestSession) => {
    try {
      // Save to Supabase
      await saveTestSession(finalSession);
      
      // Store in localStorage for results page
      localStorage.setItem('testSession', JSON.stringify(finalSession));
      
      // Navigate to results page
      navigate('/results');
    } catch (error) {
      console.error('Error saving test session:', error);
      toast('Error saving your test results. Please try again.', {
        duration: 5000,
      });
      setLoading(false);
    }
  };

  const handleConfirmLevel = () => {
    setSession(prevSession => prevSession ? {...prevSession, level: selectedLevel} : null);
  };

  return {
    testStarted,
    selectedTest,
    session,
    currentQuestionIndex,
    questions,
    timeRemaining,
    loading,
    selectedLevel,
    useRealtime,
    handleStartTest,
    handleRealtimeTest,
    handleSelectLevel,
    handleAnswer,
    handleNextQuestion,
    handleTestComplete,
    handleSubmitTest,
    handleConfirmLevel,
    setSession
  };
};

export default useTestSession;
