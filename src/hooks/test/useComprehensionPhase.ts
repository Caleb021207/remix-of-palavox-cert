import { useState, useEffect } from 'react';
import { TestPhase } from '@/types';
import { LanguageCode, languages } from '@/config/languages';
import { EnglishTestVariant } from '@/config/languages/englishVariants';
import { generateComprehensionContent, evaluatePhaseResponses } from '@/services/test/multiPhaseTestService';
import { toast } from 'sonner';
import { useUILanguage } from '@/contexts/UILanguageContext';
import { useAudioPlayer } from './useAudioPlayer';

interface UseComprehensionPhaseProps {
  sessionId: string;
  languageCode?: LanguageCode;
  englishVariant?: EnglishTestVariant;
  onComplete: (score: number) => void;
}

export const useComprehensionPhase = ({
  sessionId,
  languageCode,
  englishVariant,
  onComplete
}: UseComprehensionPhaseProps) => {
  const { t } = useUILanguage();
  const [readingContent, setReadingContent] = useState<any[]>([]);
  const [listeningContent, setListeningContent] = useState<any[]>([]);
  const [currentPhase, setCurrentPhase] = useState<'reading' | 'listening'>('reading');
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [readingResponses, setReadingResponses] = useState<Record<string, string>>({});
  const [listeningResponses, setListeningResponses] = useState<Record<string, string>>({});
  const [readingScore, setReadingScore] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Use enhanced audio player
  const {
    audioLoading,
    isPlaying,
    currentTime,
    duration,
    handlePlayAudio: playAudio,
    stopAudio,
    seekAudio,
    skipAudio
  } = useAudioPlayer();

  useEffect(() => {
    loadAllContent();
  }, []);

  // Unwrap audioUrl if it's wrapped in an object structure
  const unwrapAudioUrl = (audioUrl: any): string | null => {
    if (!audioUrl) return null;
    if (typeof audioUrl === 'string') return audioUrl;
    if (typeof audioUrl === 'object' && audioUrl.value) return audioUrl.value;
    console.warn('Unexpected audioUrl format:', audioUrl);
    return null;
  };

  // Transform question IDs to be globally unique across all passages
  const transformContentWithUniqueIds = (content: any[], prefix: string) => {
    return content.map((passage, contentIndex) => {
      const unwrappedAudioUrl = unwrapAudioUrl(passage.audioUrl);
      const transformed = {
        ...passage,
        passage: passage.passage,
        audioUrl: unwrappedAudioUrl,
        questions: passage.questions.map((question: any) => ({
          ...question,
          id: `${prefix}-${contentIndex}-${question.id}`,
          options: question.options.map((option: any) => ({
            ...option,
            id: `${prefix}-${contentIndex}-${option.id}`
          }))
        }))
      };
      console.log(`[Transform ${prefix}] Passage ${contentIndex} audioUrl:`, transformed.audioUrl);
      return transformed;
    });
  };

  const loadAllContent = async () => {
    try {
      setLoading(true);
      const contentLanguageCode: LanguageCode = languageCode || 'english-for-spanish';
      const languageConfig = languages[contentLanguageCode];
      
      console.log('📖🎧 Loading separate reading and listening content:', contentLanguageCode);
      
      // Extract base language for bilingual content
      const baseLanguage = languageConfig?.baseLanguage || 'Spanish';
      
      // Load reading content (6 passages, no audio)
      const readingResult = await generateComprehensionContent(
        contentLanguageCode, 
        baseLanguage, 
        sessionId,
        'reading'
      );
      
      console.log('📖 Reading content loaded:', {
        passageCount: readingResult.content?.length,
        hasAudio: readingResult.content?.[0]?.audioUrl
      });

      // Load listening content (6 DIFFERENT passages, WITH audio)
      const listeningResult = await generateComprehensionContent(
        contentLanguageCode, 
        baseLanguage, 
        sessionId,
        'listening'
      );
      
      console.log('🎧 Listening content loaded:', {
        passageCount: listeningResult.content?.length,
        firstAudioUrl: listeningResult.content?.[0]?.audioUrl?.substring(0, 50)
      });
      
      // Transform IDs to be globally unique
      const transformedReading = transformContentWithUniqueIds(readingResult.content || [], 'reading');
      const transformedListening = transformContentWithUniqueIds(listeningResult.content || [], 'listening');
      
      console.log('✅ Content transformed:', {
        readingCount: transformedReading.length,
        listeningCount: transformedListening.length,
        firstListeningAudioUrl: transformedListening[0]?.audioUrl?.substring(0, 50)
      });
      
      setReadingContent(transformedReading);
      setListeningContent(transformedListening);
      setLoading(false);
    } catch (error) {
      console.error('Error loading comprehension content:', error);
      toast.error('Failed to load comprehension content');
      setLoading(false);
    }
  };

  const getCurrentContent = () => {
    if (currentPhase === 'reading') {
      return readingContent[currentContentIndex];
    } else {
      return listeningContent[currentContentIndex];
    }
  };

  const getCurrentQuestion = () => {
    const content = getCurrentContent();
    return content?.questions[currentQuestionIndex];
  };

  const handleAnswer = (questionId: string, answer: string) => {
    if (currentPhase === 'reading') {
      setReadingResponses(prev => ({ ...prev, [questionId]: answer }));
    } else {
      setListeningResponses(prev => ({ ...prev, [questionId]: answer }));
    }
  };

  const handlePlayAudio = async () => {
    const currentContent = getCurrentContent();
    if (!currentContent) return;
    await playAudio(currentContent);
  };

  const handleNext = async () => {
    // Stop any playing audio when moving to next question
    stopAudio();

    const content = currentPhase === 'reading' ? readingContent : listeningContent;
    const currentContent = getCurrentContent();
    const isLastQuestion = currentQuestionIndex === currentContent.questions.length - 1;
    const isLastContent = currentContentIndex === content.length - 1;

    if (isLastQuestion && isLastContent) {
      if (currentPhase === 'reading') {
        // Complete reading, move to listening
        await completeReadingPhase();
      } else {
        // Complete listening and entire comprehension phase
        await completeComprehensionPhase();
      }
    } else if (isLastQuestion) {
      setCurrentContentIndex(prev => prev + 1);
      setCurrentQuestionIndex(0);
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const completeReadingPhase = async () => {
    try {
      setLoading(true);
      const contentLanguageCode: LanguageCode = languageCode || 'english-for-spanish';
      
      const result = await evaluatePhaseResponses(
        TestPhase.Reading,
        readingResponses,
        readingContent,
        contentLanguageCode
      );
      
      setReadingScore(result.score);
      
      // Move to listening phase
      setCurrentPhase('listening');
      setCurrentContentIndex(0);
      setCurrentQuestionIndex(0);
      setLoading(false);
    } catch (error) {
      console.error('Error evaluating reading phase:', error);
      toast.error('Failed to evaluate reading responses');
      setLoading(false);
    }
  };

  const completeComprehensionPhase = async () => {
    try {
      setLoading(true);
      const contentLanguageCode: LanguageCode = languageCode || 'english-for-spanish';
      
      const listeningResult = await evaluatePhaseResponses(
        TestPhase.Listening,
        listeningResponses,
        listeningContent,
        contentLanguageCode
      );
      
      // Calculate combined score (average of reading and listening)
      const combinedScore = (readingScore + listeningResult.score) / 2;
      
      // Store validation data
      const totalQuestions = 
        readingContent.reduce((sum, c) => sum + c.questions.length, 0) +
        listeningContent.reduce((sum, c) => sum + c.questions.length, 0);
      
      const validationData = {
        totalQuestions,
        answeredQuestions: Object.keys(readingResponses).length + Object.keys(listeningResponses).length,
        readingScore,
        listeningScore: listeningResult.score,
        combinedScore,
        timestamp: new Date().toISOString(),
        scoringMethod: 'comprehension',
        phaseBreakdown: {
          reading: {
            score: readingScore,
            questions: readingContent.reduce((sum, c) => sum + c.questions.length, 0)
          },
          listening: {
            score: listeningResult.score,
            questions: listeningContent.reduce((sum, c) => sum + c.questions.length, 0)
          }
        }
      };
      
      localStorage.setItem('scoringValidation', JSON.stringify(validationData));
      
      onComplete(combinedScore);
    } catch (error) {
      console.error('Error completing comprehension phase:', error);
      toast.error('Failed to evaluate comprehension responses');
    } finally {
      setLoading(false);
    }
  };

  const totalReadingQuestions = readingContent.reduce((sum, c) => sum + c.questions.length, 0);
  const totalListeningQuestions = listeningContent.reduce((sum, c) => sum + c.questions.length, 0);
  const totalQuestions = totalReadingQuestions + totalListeningQuestions;
  const answeredQuestions = Object.keys(readingResponses).length + Object.keys(listeningResponses).length;

  return {
    currentPhase,
    content: currentPhase === 'reading' ? readingContent : listeningContent,
    currentContentIndex,
    currentQuestionIndex,
    responses: currentPhase === 'reading' ? readingResponses : listeningResponses,
    loading,
    audioLoading,
    isPlaying,
    currentTime,
    duration,
    getCurrentContent,
    getCurrentQuestion,
    handleAnswer,
    handleNext,
    handlePlayAudio,
    seekAudio,
    skipAudio,
    totalQuestions,
    answeredQuestions,
    readingScore,
    isReadingComplete: currentPhase === 'listening'
  };
};
