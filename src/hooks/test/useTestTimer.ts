
import { useState, useEffect } from 'react';
import { TestType, TestSession } from '@/types';
import { TEST_DURATION } from '@/config/testConfig';

export const useTestTimer = (testStarted: boolean, selectedTest: TestType | null, session: TestSession | null, handleSubmitTest: () => void) => {
  const [timeRemaining, setTimeRemaining] = useState(TEST_DURATION.multipleChoice);
  
  // Initialize timer based on selected test
  useEffect(() => {
    if (selectedTest) {
      setTimeRemaining(TEST_DURATION[selectedTest] || TEST_DURATION.multipleChoice);
    }
  }, [selectedTest]);

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
  }, [testStarted, session, handleSubmitTest]);

  return { timeRemaining };
};
