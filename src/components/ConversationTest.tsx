
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { ACTFLLevel, EvaluationResult } from '@/types';
import { evaluateResponse } from '@/services/testService';

// Import our new modular components
import ConversationWelcome from './conversation/ConversationWelcome';
import ConversationSession from './conversation/ConversationSession';
import { useConversationConnection } from '@/hooks/useConversationConnection';
import { useConversationTimer } from '@/hooks/useConversationTimer';

interface ConversationTestProps {
  level?: ACTFLLevel;
  onComplete: (result: EvaluationResult, transcript: string) => void;
  onError: (error: Error) => void;
}

const ConversationTest: React.FC<ConversationTestProps> = ({ level, onComplete, onError }) => {
  // State for evaluation
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // Use our custom hooks
  const {
    isStarted,
    isConnecting,
    connectionError,
    messages,
    transcript,
    isRecording,
    isSpeaking,
    isMuted,
    startConversation,
    startRecording,
    stopRecording,
    toggleMute,
    retryConnection,
    cleanupResources
  } = useConversationConnection({ onError });
  
  const { assessmentTime, formatTime } = useConversationTimer(isStarted);
  
  // Clean up on component unmount
  useEffect(() => {
    return cleanupResources;
  }, []);
  
  // Auto-submit at 3 minutes
  useEffect(() => {
    if (assessmentTime >= 180 && isStarted && !isEvaluating) {
      finishConversation();
    }
  }, [assessmentTime, isStarted, isEvaluating]);
  
  // End conversation and evaluate results
  const finishConversation = async () => {
    // Check if there's enough conversation to evaluate
    if (messages.length < 6) {
      toast.warning('Please continue the conversation longer for a meaningful evaluation.');
      return;
    }
    
    try {
      setIsEvaluating(true);
      toast.info(`Evaluating your conversation...`);
      
      // Clean up resources
      cleanupResources();
      
      // Call evaluation service
      const result = await evaluateResponse('speaking', transcript, undefined, level);
      
      setIsEvaluating(false);
      onComplete(result, transcript);
      
    } catch (error) {
      console.error('Error completing conversation test:', error);
      setIsEvaluating(false);
      toast.error(`Error evaluating your conversation. Please try again.`);
      onError(error instanceof Error ? error : new Error('Unknown error during evaluation'));
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {!isStarted ? (
          // Welcome screen with connection UI
          <ConversationWelcome
            isConnecting={isConnecting}
            connectionError={connectionError}
            onStartConversation={connectionError ? retryConnection : startConversation}
          />
        ) : (
          // Active conversation UI
          <ConversationSession 
            messages={messages}
            isRecording={isRecording}
            isSpeaking={isSpeaking}
            isMuted={isMuted}
            isEvaluating={isEvaluating}
            formattedTime={formatTime(assessmentTime)}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onToggleMute={toggleMute}
            onFinish={finishConversation}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ConversationTest;
