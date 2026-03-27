
import { useState, useEffect, useRef } from 'react';

export function useConversationTimer(isStarted: boolean) {
  const [assessmentTime, setAssessmentTime] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isStarted && !timerRef.current) {
      timerRef.current = window.setInterval(() => {
        setAssessmentTime(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isStarted]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return {
    assessmentTime,
    formatTime
  };
}
