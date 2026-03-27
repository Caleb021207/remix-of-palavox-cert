
import React from 'react';
import { Button } from '@/components/ui/button';
import ConversationMessages from './ConversationMessages';
import ConversationControls from './ConversationControls';
import { ConversationMessage } from '@/hooks/useConversationConnection';

interface ConversationSessionProps {
  messages: ConversationMessage[];
  isRecording: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  isEvaluating: boolean;
  formattedTime: string;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => void;
  onToggleMute: () => void;
  onFinish: () => Promise<void>;
}

const ConversationSession: React.FC<ConversationSessionProps> = ({
  messages,
  isRecording,
  isSpeaking,
  isMuted,
  isEvaluating,
  formattedTime,
  onStartRecording,
  onStopRecording,
  onToggleMute,
  onFinish
}) => {
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Conversation</h2>
        <span className="text-sm text-palavox-slate">{formattedTime}</span>
      </div>
      
      <ConversationMessages messages={messages} />
      
      <ConversationControls 
        isRecording={isRecording}
        isSpeaking={isSpeaking}
        isMuted={isMuted}
        isEvaluating={isEvaluating}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
        onToggleMute={onToggleMute}
        onSubmit={onFinish}
      />
    </>
  );
};

export default ConversationSession;
