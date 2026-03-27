
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface TestProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  timeRemaining?: number;
  totalTime?: number;
}

const TestProgress: React.FC<TestProgressProps> = ({
  currentQuestion,
  totalQuestions,
  timeRemaining,
  totalTime
}) => {
  const progress = (currentQuestion / totalQuestions) * 100;
  const timeProgress = totalTime && timeRemaining ? (timeRemaining / totalTime) * 100 : undefined;

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-sm text-palavox-slate">
        <span>Question {currentQuestion} of {totalQuestions}</span>
        {timeRemaining !== undefined && (
          <span>Time: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</span>
        )}
      </div>
      <Progress value={progress} className="h-2 bg-palavox-lavender">
        <div 
          className="h-full bg-palavox-purple rounded-full transition-all duration-300 ease-in-out" 
          style={{ width: `${progress}%` }}
        />
      </Progress>
      {timeProgress !== undefined && (
        <Progress value={timeProgress} className="h-1 bg-palavox-lavender">
          <div 
            className="h-full bg-palavox-gold rounded-full transition-all duration-300 ease-in-out" 
            style={{ width: `${timeProgress}%` }}
          />
        </Progress>
      )}
    </div>
  );
};

export default TestProgress;
