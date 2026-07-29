import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { RealtimeConnection } from '@/utils/RealtimeConnection';
import { LanguageCode } from '@/config/languages';
import { useUILanguage } from '@/contexts/UILanguageContext';
import { submitPhase } from '@/services/test/secureTestService';

interface ConversationalFluencyPhaseProps {
  sessionId: string;
  languageCode?: LanguageCode;
  onComplete: (score: number) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ConversationalFluencyPhase: React.FC<ConversationalFluencyPhaseProps> = ({
  sessionId,
  onComplete
}) => {
  const { t } = useUILanguage();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [conversationDuration, setConversationDuration] = useState(0);
  
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const TARGET_DURATION = 180; // 3 minutes minimum

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (isConnected && startTimeRef.current) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!.getTime()) / 1000);
        setConversationDuration(elapsed);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isConnected]);

  const startConversation = async () => {
    if (isConnecting || isConnected) return;
    
    try {
      setIsConnecting(true);
      console.log('🎙️ Starting WebRTC conversation...');

      const connection = new RealtimeConnection((event) => {
        console.log('📥 Event:', event.type);
        
        // Handle transcript deltas (streaming text)
        if (event.type === 'response.audio_transcript.delta' && event.delta) {
          setCurrentTranscript(prev => prev + event.delta);
        }
        
        // Handle completed transcript
        if (event.type === 'response.audio_transcript.done') {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: event.transcript,
            timestamp: new Date()
          }]);
          setCurrentTranscript('');
        }
        
        // Handle user transcription
        if (event.type === 'conversation.item.input_audio_transcription.completed') {
          setMessages(prev => [...prev, {
            role: 'user',
            content: event.transcript,
            timestamp: new Date()
          }]);
        }
        
        // Handle audio playback status (from WebRTC audio track)
        if (event.type === 'response.audio.delta') {
          setIsSpeaking(true);
        }
        
        if (event.type === 'response.audio.done') {
          setIsSpeaking(false);
        }
        
        // Handle errors
        if (event.type === 'error') {
          console.error('OpenAI error:', event.error);
          toast.error(event.error?.message || 'Connection error');
        }
      });

      await connection.connect('English');
      connectionRef.current = connection;
      
      setIsConnected(true);
      setIsRecording(true);
      startTimeRef.current = new Date();
      
      toast.success('Connected! Start speaking.');

    } catch (error) {
      console.error('❌ Failed to start:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start conversation');
    } finally {
      setIsConnecting(false);
    }
  };

  const endConversation = async () => {
    if (conversationDuration < 60) {
      toast.error(t.test.phases['conversational-fluency'].step2);
      return;
    }

    console.log('🛑 Ending conversation...');
    
    try {
      // Extract only user messages for evaluation
      const userMessages = messages.filter(m => m.role === 'user');
      
      if (userMessages.length === 0) {
        toast.error('No user messages to evaluate');
        cleanup();
        return;
      }

      console.log('📤 Sending conversation for evaluation:', {
        userMessageCount: userMessages.length,
        duration: conversationDuration
      });

      // Show loading state
      toast.info('Evaluating your conversation...');

      // Submit the raw transcript. Scoring happens server-side and the
      // score is written to the database by the edge function, never here.
      const result = await submitPhase({
        sessionId,
        phase: 'conversation',
        responses: {
          messages: userMessages.map(msg => ({
            content: msg.content,
            timestamp: msg.timestamp
          })),
          duration: conversationDuration
        },
        targetLanguage: 'English'
      });

      cleanup();

      toast.success(`${t.test.phases['conversational-fluency'].endConversation}! Score: ${result.score}`);
      onComplete(result.score);

    } catch (error) {
      console.error('❌ Error evaluating conversation:', error);
      cleanup();
      toast.error(error instanceof Error ? error.message : 'Failed to evaluate conversation');
    }
  };


  const cleanup = () => {
    console.log('🧹 Cleaning up...');
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    connectionRef.current?.close();
    connectionRef.current = null;

    setIsConnected(false);
    setIsRecording(false);
    setIsSpeaking(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 md:p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {t.test.phases['conversational-fluency'].title}
              </h2>
              <p className="text-muted-foreground mt-2">
                {t.test.phases['conversational-fluency'].description}
              </p>
            </div>
            {isConnected && (
              <div className="text-right">
                <div className="text-3xl font-bold whitespace-nowrap">
                  {formatTime(conversationDuration)} / {formatTime(TARGET_DURATION)}
                </div>
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  {conversationDuration >= 60 ? '✅ Minimum reached' : '⏱️ Keep talking...'}
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Prominent Language Instruction */}
          {!isConnected && (
            <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">
                    {t.test.phases['conversational-fluency'].speakInEnglish}
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {t.test.phases['conversational-fluency'].conversationTip}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Indicators */}
          <div className="flex gap-4 justify-center">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              isRecording ? 'bg-red-500/20 text-red-600' : 'bg-muted'
            }`}>
              <Mic className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
              <span className="text-sm font-medium">
                {isRecording ? t.test.phases.speaking.recording : t.test.phases['conversational-fluency'].micOff}
              </span>
            </div>

            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              isSpeaking ? 'bg-blue-500/20 text-blue-600' : 'bg-muted'
            }`}>
              <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-pulse' : ''}`} />
              <span className="text-sm font-medium">
                {isSpeaking ? 'AI' : t.test.phases['conversational-fluency'].listening}
              </span>
            </div>
          </div>

          {/* Instructions */}
          {!isConnected && (
            <>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-3">{t.test.phases['conversational-fluency'].howItWorks}</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <span>1.</span>
                      <span>{t.test.phases['conversational-fluency'].step1}</span>
                    </li>
                    <li className="flex gap-2">
                      <span>2.</span>
                      <span>{t.test.phases['conversational-fluency'].step2}</span>
                    </li>
                    <li className="flex gap-2">
                      <span>3.</span>
                      <span>{t.test.phases['conversational-fluency'].step3}</span>
                    </li>
                    <li className="flex gap-2">
                      <span>4.</span>
                      <span>{t.test.phases['conversational-fluency'].step4}</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              {/* Helpful Tip Card */}
              <Card className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                <CardContent className="pt-4">
                  <p className="text-sm text-center text-green-800 dark:text-green-200">
                    💡 {t.test.phases['conversational-fluency'].tip}
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {/* Conversation Transcript */}
          {messages.length > 0 && (
            <Card className="max-h-96 overflow-y-auto">
              <CardContent className="pt-6 space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-lg ${
                        msg.role === 'assistant'
                          ? 'bg-primary/10 text-foreground'
                          : 'bg-accent text-accent-foreground'
                      }`}
                    >
                      <div className="text-xs opacity-60 mb-1">
                        {msg.role === 'assistant' ? '🤖 AI' : '👤 You'}
                      </div>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))}
                
                {currentTranscript && (
                  <div className="flex gap-3 justify-start">
                    <div className="max-w-[80%] px-4 py-3 rounded-lg bg-primary/5 text-foreground/60">
                      <div className="text-xs opacity-60 mb-1">🤖 AI (typing...)</div>
                      <p className="text-sm">{currentTranscript}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Controls */}
          <div className="flex gap-4 justify-center">
            {!isConnected ? (
              <Button
                onClick={startConversation}
                size="lg"
                className="gap-2"
                disabled={isConnecting}
              >
                <Phone className="w-5 h-5" />
                {isConnecting ? 'Connecting...' : t.test.phases['conversational-fluency'].startConversation}
              </Button>
            ) : (
              <Button
                onClick={endConversation}
                variant="destructive"
                size="lg"
                className="gap-2"
                disabled={conversationDuration < 60}
              >
                <PhoneOff className="w-5 h-5" />
                {t.test.phases['conversational-fluency'].endConversation}
                {conversationDuration < 60 && ` (${60 - conversationDuration}s)`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversationalFluencyPhase;
