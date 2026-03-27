
import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface ConversationControlsProps {
  isRecording: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  isEvaluating: boolean;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => void;
  onToggleMute: () => void;
  onSubmit: () => Promise<void>;
}

const ConversationControls: React.FC<ConversationControlsProps> = ({
  isRecording,
  isSpeaking,
  isMuted,
  isEvaluating,
  onStartRecording,
  onStopRecording,
  onToggleMute,
  onSubmit
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between gap-4">
      <div className="flex justify-between gap-2">
        <Button
          variant={isRecording ? "destructive" : "default"}
          className="flex-1"
          onClick={isRecording ? onStopRecording : onStartRecording}
          disabled={isEvaluating || isSpeaking}
        >
          {isRecording ? (
            <>
              <MicOff className="mr-2 h-4 w-4" /> Stop Talking
            </>
          ) : (
            <>
              <Mic className="mr-2 h-4 w-4" /> Start Talking
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          className="flex-1"
          onClick={onToggleMute}
        >
          {isMuted ? (
            <>
              <VolumeX className="mr-2 h-4 w-4" /> Unmute
            </>
          ) : (
            <>
              <Volume2 className="mr-2 h-4 w-4" /> Mute
            </>
          )}
        </Button>
        
        <Button
          onClick={onSubmit}
          disabled={isEvaluating}
          className="flex-1"
        >
          {isEvaluating ? (
            <>
              <span className="animate-spin mr-2">⭘</span>
              Evaluating...
            </>
          ) : 'Submit'}
        </Button>
      </div>
      
      <div className="flex items-center justify-center sm:justify-end gap-2">
        {isSpeaking ? (
          <div className="flex items-center text-palavox-purple">
            <div className="w-4 h-4 relative mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-palavox-purple opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-palavox-purple"></span>
            </div>
            <span>AI speaking...</span>
          </div>
        ) : isRecording ? (
          <div className="flex items-center text-red-500">
            <div className="w-4 h-4 relative mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
            </div>
            <span>Recording...</span>
          </div>
        ) : (
          <div className="flex items-center text-palavox-slate">
            <div className="w-4 h-4 relative mr-2">
              <span className="relative inline-flex rounded-full h-4 w-4 bg-gray-300"></span>
            </div>
            <span>Ready</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationControls;
