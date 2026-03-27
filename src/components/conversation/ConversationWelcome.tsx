
import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, RefreshCw } from 'lucide-react';
import { TARGET_LANGUAGE } from '@/config/languageConfig';

interface ConversationWelcomeProps {
  isConnecting: boolean;
  connectionError: string | null;
  onStartConversation: () => void;
}

const ConversationWelcome: React.FC<ConversationWelcomeProps> = ({ 
  isConnecting, 
  connectionError, 
  onStartConversation 
}) => {
  return (
    <div className="text-center py-8">
      <div className="h-20 w-20 rounded-full bg-palavox-lavender flex items-center justify-center mb-6 mx-auto">
        <Mic className="h-10 w-10 text-palavox-purple" />
      </div>
      <h2 className="text-2xl font-bold mb-4">{TARGET_LANGUAGE} Conversation Assessment</h2>
      <p className="text-palavox-slate mb-4">
        You'll have a natural conversation with an AI speaking partner in {TARGET_LANGUAGE}.
        The system will listen continuously and respond when you finish speaking.
        Your responses will be evaluated on fluency, grammar, vocabulary, and overall communication.
      </p>
      
      {connectionError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 my-4 text-left">
          <h3 className="text-red-800 font-medium">Connection Error</h3>
          <p className="text-red-700 mt-1">{connectionError}</p>
          <div className="mt-3 text-sm">
            <p>Please check that:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>The OPENAI_API_KEY is configured in Supabase secrets</li>
              <li>Your internet connection is stable</li>
              <li>Your browser allows microphone access</li>
            </ul>
          </div>
        </div>
      )}
      
      <Button 
        className="btn-primary mt-4"
        onClick={onStartConversation}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <>
            <span className="animate-spin mr-2">⭘</span>
            Connecting...
          </>
        ) : connectionError ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Connection
          </>
        ) : (
          `Start ${TARGET_LANGUAGE} Conversation`
        )}
      </Button>
    </div>
  );
};

export default ConversationWelcome;
