import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { User, Mic, MicOff, Play, Pause } from 'lucide-react';
import { evaluateResponse } from '@/services/testService';
import { getChatResponse } from '@/services/test/openAIService';
import { textToSpeech } from '@/services/test/azureSpeechService';
import { EvaluationResult, ACTFLLevel } from '@/types';
import { TARGET_LANGUAGE } from '@/config/languageConfig';
import { getSpeechRecognitionLanguage } from '@/utils/languageUtils';

interface SpeakingTestProps {
  level?: ACTFLLevel | string;
  onComplete: (result: EvaluationResult, transcript: string) => void;
  onError: (error: Error) => void;
}

const SpeakingTest = ({ level, onComplete, onError }: SpeakingTestProps) => {
  const [isStarted, setIsStarted] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'agent', text: string }[]>([]);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationHistoryRef = useRef<string>('');
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  
  // Start conversation
  const handleStartConversation = async () => {
    try {
      setIsStarted(true);
      
      // Initialize conversation with a greeting
      const initialPrompt = `You are a ${TARGET_LANGUAGE} conversation partner for a language assessment. Begin the conversation with a greeting and a simple question to the user in ${TARGET_LANGUAGE}.`;
      const initialResponse = await getChatResponse(initialPrompt, '', TARGET_LANGUAGE);
      
      setMessages([{ role: 'agent', text: initialResponse }]);
      conversationHistoryRef.current = `Agent: ${initialResponse}\n`;
      
      // Generate speech for initial response
      const audioUrl = await textToSpeech(initialResponse);
      playAudio(audioUrl);
      
      // Add initial agent message to transcript
      setTranscript(`Agent: ${initialResponse}\n`);
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation. Please try again.');
      onError(error as Error);
    }
  };
  
  // Play audio from URL
  const playAudio = (audioUrl: string) => {
    if (currentAudio) {
      currentAudio.pause();
    }
    
    const audio = new Audio(audioUrl);
    setCurrentAudio(audio);
    setIsPlaying(true);
    
    audio.play().catch(err => {
      console.error('Error playing audio:', err);
      setIsPlaying(false);
      toast.error('Failed to play audio response');
    });
    
    audio.onended = () => {
      setIsPlaying(false);
    };
  };
  
  // Toggle audio playback
  const togglePlayback = () => {
    if (!currentAudio) return;
    
    if (isPlaying) {
      currentAudio.pause();
      setIsPlaying(false);
    } else {
      currentAudio.play().catch(err => {
        console.error('Error resuming audio:', err);
        toast.error('Failed to resume audio playback');
      });
      setIsPlaying(true);
    }
  };
  
  // Start recording user's voice with Web Speech API
  const startRecording = async () => {
    try {
      // Initialize browser's speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error('Speech recognition not supported in this browser');
      }
      
      const recognition = new SpeechRecognition();
      
      // Use the target language for speech recognition
      const targetLanguageCode = getSpeechRecognitionLanguage();
      recognition.lang = targetLanguageCode;
      
      console.log(`Speech recognition started for ${TARGET_LANGUAGE} (${targetLanguageCode})`);
      
      recognition.continuous = true;
      recognition.interimResults = false;
      
      recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        console.log('Recognized text:', transcript);
        // We'll process the transcript when recording stops
        audioChunksRef.current.push(new Blob([transcript]));
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        toast.error('Error with speech recognition. Please try again.');
        stopRecording();
      };
      
      recognition.start();
      speechRecognitionRef.current = recognition;
      setIsRecording(true);
      toast.info('Recording started. Speak now.');
      
      // Also record the audio for evaluation purposes
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };
  
  // Stop recording user's voice
  const stopRecording = () => {
    setIsRecording(false);
    toast.info('Recording stopped');
    
    // Stop speech recognition
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
    
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      // Process the recording once it's stopped
      mediaRecorderRef.current.onstop = async () => {
        await processRecordedSpeech();
      };
    } else {
      // If we don't have media recorder data but have speech recognition data
      processRecordedSpeech();
    }
  };
  
  // Process recorded speech and get AI response
  const processRecordedSpeech = async () => {
    try {
      setIsProcessing(true);
      
      // Use browser's SpeechRecognition API to get the text
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Use the target language for speech recognition
      const targetLanguageCode = getSpeechRecognitionLanguage();
      recognition.lang = targetLanguageCode;
      
      // Create audio blob from chunks for playback and transcription
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Use a Promise to wait for transcription
      const userText = await new Promise<string>((resolve) => {
        // Try to use the browser's speech recognition
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          resolve(transcript);
        };
        
        recognition.onerror = () => {
          // If browser recognition fails, use a placeholder
          resolve("I didn't catch what you said. Could you repeat that?");
        };
        
        // Create audio element to play for transcription
        const audio = new Audio(audioUrl);
        audio.oncanplaythrough = () => {
          recognition.start();
          audio.play();
        };
        
        audio.onended = () => {
          recognition.stop();
          // If no result received, resolve with feedback
          setTimeout(() => resolve("I'm still learning to understand you."), 1000);
        };
      });
      
      // Add user message to UI
      setMessages(prev => [...prev, { role: 'user', text: userText }]);
      setTranscript(prev => `${prev}User: ${userText}\n`);
      conversationHistoryRef.current += `User: ${userText}\n`;
      
      // Get AI response
      const agentResponse = await getChatResponse(
        userText,
        conversationHistoryRef.current,
        TARGET_LANGUAGE
      );
      
      // Add agent response to UI
      setMessages(prev => [...prev, { role: 'agent', text: agentResponse }]);
      setTranscript(prev => `${prev}Agent: ${agentResponse}\n`);
      conversationHistoryRef.current += `Agent: ${agentResponse}\n`;
      
      // Generate speech for AI response
      const responseAudioUrl = await textToSpeech(agentResponse);
      playAudio(responseAudioUrl);
      
      setIsProcessing(false);
      
      // Clean up
      URL.revokeObjectURL(audioUrl);
    } catch (error) {
      console.error('Error processing speech:', error);
      setIsProcessing(false);
      toast.error('Failed to process your response. Please try again.');
    }
  };
  
  // Finish the test and submit transcript for evaluation
  const finishTest = async () => {
    if (!transcript || messages.length < 4) {
      toast.warning('Please complete more of the conversation before finishing.');
      return;
    }
    
    try {
      setIsEvaluating(true);
      toast.info('Evaluating your speaking test...');
      
      // Evaluate the transcript
      const result = await evaluateResponse('speaking', transcript, undefined, level);
      
      setIsEvaluating(false);
      onComplete(result, transcript);
    } catch (error) {
      console.error('Error completing speaking test:', error);
      setIsEvaluating(false);
      toast.error('Error evaluating your speaking test. Please try again.');
      onError(error as Error);
    }
  };
  
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {!isStarted ? (
          <div className="text-center py-8">
            <div className="h-20 w-20 rounded-full bg-palavox-lavender flex items-center justify-center mb-6 mx-auto">
              <User className="h-10 w-10 text-palavox-purple" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Speaking Assessment</h2>
            <p className="text-palavox-slate mb-8">
              You'll have a conversation with an AI speaking partner to assess your {TARGET_LANGUAGE} skills.
              Your responses will be evaluated on fluency, grammar, vocabulary, and overall communication.
            </p>
            <Button className="btn-primary" onClick={handleStartConversation}>
              Start Conversation
            </Button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Speaking Assessment - {TARGET_LANGUAGE}</h2>
              <Button 
                variant="outline" 
                onClick={finishTest}
                disabled={isEvaluating || isProcessing}
              >
                {isEvaluating ? (
                  <>
                    <span className="animate-spin mr-2">⭘</span>
                    Evaluating...
                  </>
                ) : 'Finish Test'}
              </Button>
            </div>
            
            <div className="bg-palavox-ivory rounded-lg border border-gray-200 h-[400px] mb-4 overflow-y-auto p-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-4 p-3 rounded-lg ${
                    message.role === 'agent'
                      ? 'bg-palavox-lavender mr-12'
                      : 'bg-palavox-purple text-white ml-12'
                  }`}
                >
                  {message.text}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="flex justify-between gap-4">
              <Button
                variant={isPlaying ? "outline" : "default"}
                className="flex-1"
                onClick={togglePlayback}
                disabled={!currentAudio}
              >
                {isPlaying ? (
                  <>
                    <Pause className="mr-2 h-4 w-4" /> Pause Audio
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" /> Play Audio
                  </>
                )}
              </Button>
              
              <Button
                variant={isRecording ? "destructive" : "default"}
                className="flex-1"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isPlaying || isEvaluating || isProcessing}
              >
                {isRecording ? (
                  <>
                    <MicOff className="mr-2 h-4 w-4" /> Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-4 w-4" /> Record Response
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SpeakingTest;
