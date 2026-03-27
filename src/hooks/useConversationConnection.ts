
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { AudioRecorder, AudioQueue, encodeAudioForAPI } from '@/utils/AudioUtils';
import { TARGET_LANGUAGE, BASE_LANGUAGE } from '@/config/languageConfig';

export interface ConversationMessage {
  role: 'user' | 'agent' | 'system';
  text: string;
  sequence?: number;
  responseId?: string;
}

export interface UseConversationConnectionProps {
  onError: (error: Error) => void;
}

export function useConversationConnection({ onError }: UseConversationConnectionProps) {
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [transcript, setTranscript] = useState('');
  
  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Refs
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);
  const retryCountRef = useRef<number>(0);
  
  // Message sequencing to maintain correct order
  const messageSequenceRef = useRef<number>(0);
  const pendingUserMessageIndexRef = useRef<number | null>(null);
  const currentResponseIdRef = useRef<string | null>(null);

  const startConversation = async () => {
    try {
      setIsConnecting(true);
      setConnectionError(null);
      
      // Add system message to indicate conversation starting
      setMessages([
        { role: 'system', text: `Starting ${TARGET_LANGUAGE} conversation...` }
      ]);
      
      // Initialize AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }
      
      // Initialize AudioQueue
      if (!audioQueueRef.current && audioContextRef.current) {
        audioQueueRef.current = new AudioQueue(audioContextRef.current, setIsSpeaking);
      }
      
      // Create WebSocket connection through our edge function
      const projectId = 'jyvmhtterlpszklhgjwp'; // This is the project ID from the provided context
      const ws = new WebSocket(
        `wss://${projectId}.functions.supabase.co/realtime-chat?targetLanguage=${TARGET_LANGUAGE}&baseLanguage=${BASE_LANGUAGE}`
      );
      
      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (!isStarted) {
          setConnectionError(`Connection to ${TARGET_LANGUAGE} conversation service timed out. Please check your internet connection and try again.`);
          setIsConnecting(false);
          ws.close();
        }
      }, 10000); // 10 seconds timeout
      
      ws.onopen = () => {
        console.log('WebSocket connection established');
        clearTimeout(connectionTimeout);
      };
      
      ws.onclose = (event) => {
        console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
        setIsStarted(false);
        setIsConnecting(false);
        
        if (event.code !== 1000) {  // 1000 is normal closure
          setConnectionError(`Connection closed unexpectedly: ${event.reason || 'Unknown reason'}`);
          toast.error(`Connection closed unexpectedly: ${event.reason || 'Unknown reason'}`);
        }
      };
      
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setIsConnecting(false);
        setConnectionError('Connection error. Please check that all API keys are properly configured.');
        toast.error(`Connection error. Please try again.`);
        onError(new Error('WebSocket connection error'));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message type:', data.type);
          
          if (data.type === 'session.created') {
            console.log('Session created:', data.session.id);
            setIsStarted(true);
            setIsConnecting(false);
            clearTimeout(connectionTimeout);
            
            // Update system message
            setMessages([
              { role: 'system', text: `${TARGET_LANGUAGE} conversation started. You can begin speaking.` }
            ]);
            
            toast.success(`Connected to ${TARGET_LANGUAGE} conversation service`);
            
            // Edge function handles session configuration - no need to send from client
          }
          else if (data.type === 'error') {
            console.error('Error from server:', data.message);
            setConnectionError(data.message);
            toast.error(`Error: ${data.message}`);
            setIsConnecting(false);
          } 
          else if (data.type === 'response.created') {
            // AI is about to respond - add placeholder for user message
            console.log('🎬 AI response starting, response_id:', data.response?.id);
            currentResponseIdRef.current = data.response?.id || null;
            
            // Add placeholder for user's message (transcription will arrive later)
            const userSequence = messageSequenceRef.current++;
            setMessages(prev => {
              const newMessages = [...prev, { 
                role: 'user' as const, 
                text: '[Transcribing...]',
                sequence: userSequence
              }];
              pendingUserMessageIndexRef.current = newMessages.length - 1;
              return newMessages;
            });
          }
          else if (data.type === 'response.audio.delta' && !isMuted) {
            // Handle audio chunks
            console.log('🔊 Audio delta received, size:', data.delta?.length);
            const binaryString = atob(data.delta);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Add to audio queue for playback (now buffered)
            if (audioQueueRef.current) {
              audioQueueRef.current.addToQueue(bytes);
            }
          }
          else if (data.type === 'response.audio_transcript.delta') {
            // Handle AI text transcript deltas
            if (data.delta) {
              const responseId = currentResponseIdRef.current;
              console.log('📝 AI transcript delta:', data.delta, 'responseId:', responseId);
              
              setMessages(prevMessages => {
                // Find existing AI message for this response
                const existingIndex = prevMessages.findIndex(
                  m => m.role === 'agent' && m.responseId === responseId
                );
                
                if (existingIndex !== -1) {
                  // Update existing message
                  const updated = [...prevMessages];
                  updated[existingIndex] = {
                    ...updated[existingIndex],
                    text: updated[existingIndex].text + data.delta
                  };
                  return updated;
                } else {
                  // Create new AI message
                  const aiSequence = messageSequenceRef.current++;
                  return [...prevMessages, { 
                    role: 'agent' as const, 
                    text: data.delta,
                    sequence: aiSequence,
                    responseId: responseId || undefined
                  }];
                }
              });
              
              setTranscript(prev => `${prev}${data.delta}`);
            }
          }
          else if (data.type === 'response.audio_transcript.done') {
            console.log('✅ AI transcript completed');
            // Flush any remaining audio buffer
            if (audioQueueRef.current) {
              audioQueueRef.current.flush();
            }
          }
          else if (data.type === 'response.audio.done') {
            console.log('✅ Audio playback completed');
          }
          else if (data.type === 'response.done') {
            console.log('✅ AI response completed');
            currentResponseIdRef.current = null;
          }
          else if (data.type === 'conversation.item.input_audio_transcription.completed') {
            // Update placeholder user message with actual transcription
            if (data.transcript) {
              console.log('👤 User transcript completed:', data.transcript);
              
              setMessages(prev => {
                // Update the placeholder message
                if (pendingUserMessageIndexRef.current !== null) {
                  const updated = [...prev];
                  const index = pendingUserMessageIndexRef.current;
                  if (updated[index]?.role === 'user') {
                    updated[index] = {
                      ...updated[index],
                      text: data.transcript
                    };
                    pendingUserMessageIndexRef.current = null;
                    return updated;
                  }
                }
                
                // Fallback: if no placeholder found, append normally (shouldn't happen)
                console.warn('⚠️ No placeholder found for user message');
                const userSequence = messageSequenceRef.current++;
                return [...prev, { 
                  role: 'user' as const, 
                  text: data.transcript,
                  sequence: userSequence
                }];
              });
              
              setTranscript(prev => `${prev}\nUser: ${data.transcript}\n`);
            }
          }
        } catch (error) {
          console.error('Error processing message:', error, event.data);
        }
      };
      
      setWsConnection(ws);
      
    } catch (error) {
      console.error('Error starting conversation:', error);
      setIsConnecting(false);
      setConnectionError(`Failed to start conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error(`Failed to start conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      onError(error instanceof Error ? error : new Error('Unknown error starting conversation'));
    }
  };

  // Start recording user audio
  const startRecording = async () => {
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      toast.error('WebSocket connection not ready');
      return;
    }
    
    try {
      if (!audioRecorderRef.current) {
        audioRecorderRef.current = new AudioRecorder((audioData) => {
          // On each audio chunk, encode and send to WebSocket
          if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
            const base64Audio = encodeAudioForAPI(audioData);
            wsConnection.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: base64Audio
            }));
          }
        });
      }
      
      await audioRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  // Stop recording user audio
  const stopRecording = () => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Toggle mute state for AI responses
  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const retryConnection = () => {
    retryCountRef.current += 1;
    startConversation();
  };

  // Cleanup function for component unmount
  const cleanupResources = () => {
    // Close WebSocket
    if (wsConnection) {
      wsConnection.close();
    }
    
    // Stop audio recording
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
    }
    
    // Stop audio queue
    if (audioQueueRef.current) {
      audioQueueRef.current.stop();
    }
    
    // Reset message sequencing
    messageSequenceRef.current = 0;
    pendingUserMessageIndexRef.current = null;
    currentResponseIdRef.current = null;
    
    // Reset messages for next conversation
    setMessages([]);
    setTranscript('');
  };

  return {
    wsConnection,
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
    cleanupResources,
    audioQueueRef,
    audioRecorderRef
  };
}
