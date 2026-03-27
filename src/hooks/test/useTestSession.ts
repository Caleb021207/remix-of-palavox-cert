
import { useState, useEffect } from 'react';
import { TestType, TestSession } from '@/types';
import { LanguageCode } from '@/config/languages';
import { useTestTypes } from './useTestTypes';
import { useLevelSelection } from './useLevelSelection';
import { useTestTimer } from './useTestTimer';
import { useMultipleChoice } from './useMultipleChoice';
import { useTestEvaluation } from './useTestEvaluation';
import { useCertificationCode } from '@/hooks/useCertificationCode';

// Generate a proper UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const useTestSession = (languageCode?: LanguageCode) => {
  const [session, setSession] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [certificationCode, setCertificationCode] = useState<string | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<{ schoolId: string; studentId: string } | null>(null);

  const { trackUsage } = useCertificationCode();

  const {
    selectedTest,
    testStarted,
    useRealtime,
    handleStartTest,
    handleRealtimeTest,
  } = useTestTypes();

  const {
    selectedLevel,
    handleSelectLevel,
    handleConfirmLevel,
  } = useLevelSelection(setSession);

  const {
    handleTestComplete,
    handleSubmitTest
  } = useTestEvaluation(session, setLoading);

  const { timeRemaining } = useTestTimer(
    testStarted, 
    selectedTest, 
    session, 
    handleSubmitTest
  );

  const {
    questions,
    currentQuestionIndex,
    handleAnswer,
    handleNextQuestion,
  } = useMultipleChoice(selectedTest, session, setSession, setLoading);

  // Initialize test session when test type is selected
  useEffect(() => {
    if (selectedTest && !session) {
      setLoading(true);
      
      // Create a new session with proper UUID and language
      const testSession: TestSession = {
        id: generateUUID(),
        testType: selectedTest,
        answers: {},
        startTime: new Date(),
        language: languageCode || 'spanish',
      };
      
      setSession(testSession);
      setLoading(false);
    }
  }, [selectedTest, session, languageCode]);

  // Handle certification code verification
  const handleCertificationCode = (code: string, schoolId: string, studentId: string) => {
    setCertificationCode(code);
    setSchoolInfo({ schoolId, studentId });
  };

  // Track certification code usage when test completes
  const handleTestCompleteWithTracking = async (result: any, content: string, prompt?: string) => {
    if (certificationCode && session) {
      await trackUsage(certificationCode, session.id);
    }
    handleTestComplete(result, content, prompt);
  };

  // Wrapper for handleNextQuestion to bind handleSubmitTest
  const nextQuestion = () => handleNextQuestion(handleSubmitTest);

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
    languageCode,
    certificationCode,
    schoolInfo,
    handleStartTest,
    handleRealtimeTest,
    handleSelectLevel,
    handleAnswer,
    handleNextQuestion: nextQuestion,
    handleTestComplete: handleTestCompleteWithTracking,
    handleSubmitTest,
    handleConfirmLevel,
    handleCertificationCode,
    setSession
  };
};

export default useTestSession;
