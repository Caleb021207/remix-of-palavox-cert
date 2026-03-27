
import { useState, useEffect, useRef } from 'react';
import { getSpeechRecognitionLanguageForTarget } from '@/utils/languageUtils';
import { toast } from 'sonner';

export const useSpeechRecognition = (targetLanguage: string) => {
  const [recognition, setRecognition] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('');
  const accumulatedRef = useRef('');

  useEffect(() => {
    initializeSpeechRecognition();
  }, [targetLanguage]);

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      
      // Use the target language for speech recognition
      const targetLanguageCode = getSpeechRecognitionLanguageForTarget(targetLanguage);
      recognitionInstance.lang = targetLanguageCode;
      
      console.log(`Speech recognition initialized for ${targetLanguage} (${targetLanguageCode})`);
      
      recognitionInstance.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update current transcript with interim results
        setCurrentTranscript(interimTranscript);
        
        // Accumulate final results
        if (finalTranscript) {
          accumulatedRef.current += finalTranscript;
          setAccumulatedTranscript(accumulatedRef.current);
          console.log('Accumulated transcript:', accumulatedRef.current);
        }
      };
      
      recognitionInstance.onend = () => {
        console.log('Speech recognition ended');
        setIsRecording(false);
        setCurrentTranscript('');
      };
      
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          toast.error(`Speech recognition error: ${event.error}`);
        }
        setIsRecording(false);
      };
      
      setRecognition(recognitionInstance);
    } else {
      toast.error('Speech recognition not supported in this browser');
    }
  };

  const startRecording = () => {
    if (recognition) {
      setCurrentTranscript('');
      recognition.start();
      setIsRecording(true);
      console.log('Speech recognition started');
    }
  };

  const stopRecording = () => {
    if (recognition) {
      recognition.stop();
      setIsRecording(false);
      console.log('Speech recognition stopped');
    }
  };

  const clearTranscript = () => {
    setCurrentTranscript('');
    setAccumulatedTranscript('');
    accumulatedRef.current = '';
  };

  return {
    isRecording,
    currentTranscript,
    accumulatedTranscript,
    startRecording,
    stopRecording,
    setCurrentTranscript,
    clearTranscript
  };
};
