
import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';

interface RecordingControlsProps {
  isRecording: boolean;
  currentTranscript: string;
  currentResponse: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  getTranslation: (path: string, fallback: string) => string;
}

const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  currentTranscript,
  currentResponse,
  onStartRecording,
  onStopRecording,
  getTranslation
}) => {
  const displayText = currentTranscript || currentResponse;
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <Button
          onClick={isRecording ? onStopRecording : onStartRecording}
          size="lg"
          className={`flex items-center gap-2 ${
            isRecording ? 'bg-red-500 hover:bg-red-600' : 'btn-primary'
          }`}
        >
          {isRecording ? (
            <>
              <MicOff className="h-5 w-5" />
              {getTranslation('test.phases.speaking.stopRecording', 'Stop Recording')}
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" />
              {getTranslation('test.phases.speaking.startRecording', 'Start Recording')}
            </>
          )}
        </Button>
        
        {isRecording && (
          <div className="mt-2 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-red-500">
              {getTranslation('test.phases.speaking.recording', 'Recording...')}
            </span>
          </div>
        )}
        
        {!isRecording && displayText && (
          <div className="mt-2 text-sm text-green-600">
            ✓ {getTranslation('test.phases.speaking.speechCaptured', 'Speech captured')}
          </div>
        )}
      </div>

      {displayText && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            {getTranslation('test.phases.speaking.yourResponse', 'Your Response:')}
          </label>
          <div className="p-4 bg-gray-50 rounded-lg min-h-[100px] border">
            {displayText || 
             getTranslation('test.phases.speaking.speechPlaceholder', 'Your speech will appear here...')}
          </div>
          {isRecording && (
            <div className="text-xs text-palavox-slate">
              {getTranslation('test.phases.speaking.continuousRecording', 'You can pause and continue speaking - your words will be captured continuously.')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecordingControls;
