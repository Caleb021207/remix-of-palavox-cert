
import { useState, useEffect } from 'react';
import { generateListeningContent } from '@/services/test/multiPhaseTestService';
import { LanguageCode } from '@/config/languages';
import { toast } from 'sonner';

export const useListeningContent = (languageCode?: LanguageCode, sessionId?: string) => {
  const [content, setContent] = useState<any[]>([]);
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (sessionId) {
      loadContent();
    }
  }, [languageCode, sessionId]);

  const loadContent = async () => {
    if (!sessionId) {
      setError('Session ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Loading listening content for language:', languageCode, 'session:', sessionId);
      
      // Pass the language code and sessionId to the service
      const result = await generateListeningContent(languageCode, sessionId);
      console.log('Listening content loaded:', result);
      
      if (!result.content || result.content.length === 0) {
        throw new Error('No content received from server');
      }
      
      setContent(result.content);
      setLoading(false);
      setRetryCount(0);
    } catch (error) {
      console.error('Error loading listening content:', error);
      setError(error.message || 'Failed to load listening content');
      setLoading(false);
      
      // Show user-friendly error message
      if (retryCount < 2) {
        toast.error('Failed to load content. Retrying...');
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadContent();
        }, 2000);
      } else {
        toast.error('Unable to load listening content. Please try again later.');
      }
    }
  };

  const getCurrentContent = () => content[currentContentIndex];
  const getCurrentQuestion = () => {
    const currentContent = getCurrentContent();
    return currentContent?.questions[currentQuestionIndex];
  };

  const moveToNext = () => {
    const currentContent = getCurrentContent();
    const isLastQuestion = currentQuestionIndex === currentContent.questions.length - 1;
    const isLastContent = currentContentIndex === content.length - 1;

    if (isLastQuestion && isLastContent) {
      return { isComplete: true };
    } else if (isLastQuestion) {
      setCurrentContentIndex(prev => prev + 1);
      setCurrentQuestionIndex(0);
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
    return { isComplete: false };
  };

  const totalQuestions = content.reduce((sum, c) => sum + c.questions.length, 0);

  return {
    content,
    currentContentIndex,
    currentQuestionIndex,
    loading,
    error,
    getCurrentContent,
    getCurrentQuestion,
    moveToNext,
    loadContent,
    totalQuestions
  };
};
