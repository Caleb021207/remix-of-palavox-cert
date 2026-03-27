
import { useState, useEffect } from 'react';
import { textToSpeech } from '@/services/test/azureSpeechService';
import { toast } from 'sonner';

export const useAudioPlayer = () => {
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [audio]);

  // Update current time as audio plays
  useEffect(() => {
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
    };

    const updateDuration = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
    };
  }, [audio]);

  const isValidAudioUrl = (url: string): boolean => {
    if (!url || url.includes('placeholder')) {
      console.log('Audio validation failed: URL is placeholder or empty');
      return false;
    }
    
    // Check if it's a valid base64 data URL
    if (url.startsWith('data:audio/')) {
      const base64Part = url.split(',')[1];
      if (!base64Part || base64Part.length < 1000) {
        console.log('Audio validation failed: Base64 data too short or missing, length:', base64Part?.length || 0);
        return false;
      }
      
      try {
        // Try to decode a small portion to validate base64
        atob(base64Part.substring(0, 100));
        console.log('Audio validation passed: Valid base64 audio data, length:', base64Part.length);
        return true;
      } catch (error) {
        console.error('Audio validation failed: Invalid base64 audio data:', error);
        return false;
      }
    }
    
    console.log('Audio validation failed: Not a data URL');
    return false;
  };

  const handlePlayAudio = async (currentContent: any) => {
    // Extract text content - works for both speaking prompts and listening passages
    const textContent = currentContent?.prompt || currentContent?.passage;
    
    if (!textContent) {
      console.error('❌ No text content available');
      toast.error('No audio content available');
      return;
    }

    try {
      if (audio && !audio.paused) {
        audio.pause();
        setIsPlaying(false);
        return;
      }

      // Check if we have valid pre-generated audio
      if (currentContent.audioUrl && isValidAudioUrl(currentContent.audioUrl)) {
        console.log('Using pre-generated audio, length:', currentContent.audioUrl.length);
        try {
          const newAudio = new Audio(currentContent.audioUrl);
          
          newAudio.onplay = () => {
            console.log('Audio started playing');
            setIsPlaying(true);
          };
          
          newAudio.onended = () => {
            console.log('Audio finished playing');
            setIsPlaying(false);
          };
          
          newAudio.onerror = (e) => {
            console.error('Pre-generated audio playback error:', e);
            console.log('Pre-generated audio failed, falling back to on-demand generation...');
            generateAudioFallback(textContent);
          };
          
          setAudio(newAudio);
          await newAudio.play();
          return;
        } catch (error) {
          console.error('Error with pre-generated audio:', error);
          console.log('Pre-generated audio error, falling back to on-demand generation...');
        }
      } else {
        console.log('Pre-generated audio not available or invalid, generating on-demand');
      }

      // Fallback to generating audio on-demand
      await generateAudioFallback(textContent);
      
    } catch (error) {
      console.error('Error playing audio:', error);
      toast.error('Failed to play audio. Please check your internet connection and try again.');
      setAudioLoading(false);
      setIsPlaying(false);
    }
  };

  const generateAudioFallback = async (text: string) => {
    setAudioLoading(true);
    console.log('Generating audio on-demand for text:', text.substring(0, 50) + '...');
    
    try {
      const audioUrl = await textToSpeech(text);
      console.log('Audio generated successfully, validating...');
      
      if (audioUrl && isValidAudioUrl(audioUrl)) {
        console.log('Generated audio is valid, setting up playback');
        const newAudio = new Audio(audioUrl);
        
        newAudio.onplay = () => {
          console.log('Generated audio started playing');
          setIsPlaying(true);
        };
        
        newAudio.onended = () => {
          console.log('Generated audio finished playing');
          setIsPlaying(false);
        };
        
        newAudio.onerror = (e) => {
          console.error('Generated audio playback error:', e);
          toast.error('Audio playback failed. The audio file may be corrupted.');
          setIsPlaying(false);
        };
        
        setAudio(newAudio);
        await newAudio.play();
      } else {
        throw new Error('Invalid audio URL received from service');
      }
      
      setAudioLoading(false);
    } catch (error) {
      console.error('Error generating audio:', error);
      toast.error(`Failed to generate audio: ${error.message || 'Unknown error'}. Please try again.`);
      setAudioLoading(false);
      setIsPlaying(false);
    }
  };

  const stopAudio = () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const seekAudio = (time: number) => {
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skipAudio = (seconds: number) => {
    if (audio) {
      const newTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  return {
    audioLoading,
    isPlaying,
    currentTime,
    duration,
    handlePlayAudio,
    stopAudio,
    seekAudio,
    skipAudio
  };
};
