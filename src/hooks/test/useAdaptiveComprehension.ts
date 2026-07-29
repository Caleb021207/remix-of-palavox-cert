import { useState, useCallback, useRef, useEffect } from 'react';
import { LanguageCode, languages } from '@/config/languages';
import { EnglishTestVariant } from '@/config/languages/englishVariants';
import { generateComprehensionContent } from '@/services/test/multiPhaseTestService';
import { toast } from 'sonner';
import { useUILanguage } from '@/contexts/UILanguageContext';
import { useAudioPlayer } from './useAudioPlayer';
import { gradeAnswer, submitPhase } from '@/services/test/secureTestService';

type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

interface AdaptiveState {
  currentLevel: CEFRLevel;
  levelHistory: CEFRLevel[];
  correctCount: number;
  totalCount: number;
  confidence: number;
  isComplete: boolean;
}

interface QuestionAttempt {
  questionId: string;
  level: CEFRLevel;
  isCorrect: boolean;
  responseTimeMs: number;
  confidence: number;
}

interface UseAdaptiveComprehensionProps {
  sessionId: string;
  languageCode?: LanguageCode;
  englishVariant?: EnglishTestVariant;
  onComplete: (score: number) => void;
}

const LEVEL_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const MIN_QUESTIONS = 8;
const MAX_QUESTIONS = 12;
const CONFIDENCE_THRESHOLD = 0.85;
const PRE_GENERATE_QUEUE_SIZE = 2; // Number of questions to pre-generate per level

interface CacheKey {
  phase: 'reading' | 'listening';
  level: CEFRLevel;
}

const makeCacheKey = (phase: 'reading' | 'listening', level: CEFRLevel): string => 
  `${phase}:${level}`;

export const useAdaptiveComprehension = ({
  sessionId,
  languageCode,
  englishVariant,
  onComplete
}: UseAdaptiveComprehensionProps) => {
  const { t } = useUILanguage();
  
  // Guard to prevent multiple starts
  const hasStarted = useRef(false);
  
  // Adaptive state for reading and listening
  const [readingState, setReadingState] = useState<AdaptiveState>({
    currentLevel: 'B1',
    levelHistory: ['B1'],
    correctCount: 0,
    totalCount: 0,
    confidence: 0,
    isComplete: false
  });
  
  const [listeningState, setListeningState] = useState<AdaptiveState>({
    currentLevel: 'B1',
    levelHistory: ['B1'],
    correctCount: 0,
    totalCount: 0,
    confidence: 0,
    isComplete: false
  });
  
  const [currentPhase, setCurrentPhase] = useState<'reading' | 'listening'>('reading');
  const [currentContent, setCurrentContent] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [attempts, setAttempts] = useState<QuestionAttempt[]>([]);
  
  // Pre-generated content cache: Map<"phase:level", content[]>
  const preGeneratedCacheRef = useRef<Map<string, any[]>>(new Map());
  const preGeneratingRef = useRef<Set<string>>(new Set());
  
  // Raw answers collected across both sub-phases, submitted to the server for
  // authoritative grading when the phase completes.
  const responsesRef = useRef<Record<string, string>>({});

  // Refs for stable callback access
  const currentPhaseRef = useRef(currentPhase);
  const stateRef = useRef({ readingState, listeningState });
  
  useEffect(() => {
    currentPhaseRef.current = currentPhase;
  }, [currentPhase]);
  
  useEffect(() => {
    stateRef.current = { readingState, listeningState };
  }, [readingState, listeningState]);
  
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

  const getState = useCallback(() => {
    return currentPhaseRef.current === 'reading' 
      ? stateRef.current.readingState 
      : stateRef.current.listeningState;
  }, []);

  const setState = useCallback((updater: (prev: AdaptiveState) => AdaptiveState) => {
    if (currentPhase === 'reading') {
      setReadingState(updater);
    } else {
      setListeningState(updater);
    }
  }, [currentPhase]);

  const determineNextLevel = useCallback((currentLevel: CEFRLevel, isCorrect: boolean): CEFRLevel => {
    const currentIndex = LEVEL_ORDER.indexOf(currentLevel);
    
    if (isCorrect && currentIndex < LEVEL_ORDER.length - 1) {
      return LEVEL_ORDER[currentIndex + 1];
    } else if (!isCorrect && currentIndex > 0) {
      return LEVEL_ORDER[currentIndex - 1];
    }
    
    return currentLevel;
  }, []);

  const calculateConfidence = useCallback((levelHistory: CEFRLevel[], totalCount: number): number => {
    if (totalCount < 3) return 0;
    
    const recentLevels = levelHistory.slice(-4);
    const mode = recentLevels.reduce((a, b, i, arr) =>
      (arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b)
    );
    
    const stability = recentLevels.filter(l => l === mode).length / recentLevels.length;
    const progressFactor = Math.min(totalCount / MIN_QUESTIONS, 1);
    
    return stability * progressFactor;
  }, []);

  const getFinalLevel = useCallback((levelHistory: CEFRLevel[]): CEFRLevel => {
    const levelCounts = levelHistory.reduce((acc, level) => {
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<CEFRLevel, number>);
    
    return Object.entries(levelCounts)
      .sort(([, a], [, b]) => b - a)[0][0] as CEFRLevel;
  }, []);

  // Pre-generate content in background for any phase/level
  const preGenerateContent = useCallback(async (phase: 'reading' | 'listening', level: CEFRLevel) => {
    const cacheKey = makeCacheKey(phase, level);
    
    // Skip if currently generating this key
    if (preGeneratingRef.current.has(cacheKey)) {
      return;
    }
    
    // Check if we already have enough cached
    const existing = preGeneratedCacheRef.current.get(cacheKey) || [];
    if (existing.length >= PRE_GENERATE_QUEUE_SIZE) {
      return;
    }
    
    preGeneratingRef.current.add(cacheKey);
    
    try {
      const contentLanguageCode: LanguageCode = languageCode || 'english-for-spanish';
      const languageConfig = languages[contentLanguageCode];
      const baseLanguage = languageConfig?.baseLanguage || 'Spanish';
      
      console.log(`🔮 Pre-generating ${phase} content for level ${level} (queue: ${existing.length}/${PRE_GENERATE_QUEUE_SIZE})`);
      
      const result = await generateComprehensionContent(
        contentLanguageCode,
        baseLanguage,
        sessionId,
        phase,
        true,
        level
      );
      
      if (result.content && result.content.length > 0) {
        const currentCache = preGeneratedCacheRef.current.get(cacheKey) || [];
        currentCache.push(result.content[0]);
        preGeneratedCacheRef.current.set(cacheKey, currentCache);
        console.log(`✅ Pre-generated ${phase} content cached for level ${level} (total: ${currentCache.length})`);
      }
    } catch (error) {
      console.warn(`Failed to pre-generate ${phase} content for ${level}:`, error);
    } finally {
      preGeneratingRef.current.delete(cacheKey);
    }
  }, [languageCode, sessionId]);

  // Pre-generate for multiple levels in a phase
  const preGenerateForLevels = useCallback((phase: 'reading' | 'listening', currentLevel: CEFRLevel) => {
    const currentIndex = LEVEL_ORDER.indexOf(currentLevel);
    const levelsToPreGenerate = [
      currentLevel,
      LEVEL_ORDER[Math.max(0, currentIndex - 1)],
      LEVEL_ORDER[Math.min(LEVEL_ORDER.length - 1, currentIndex + 1)]
    ];
    
    const uniqueLevels = [...new Set(levelsToPreGenerate)];
    
    // Pre-generate multiple items per level
    uniqueLevels.forEach(level => {
      // Trigger pre-generation up to queue size
      for (let i = 0; i < PRE_GENERATE_QUEUE_SIZE; i++) {
        preGenerateContent(phase, level);
      }
    });
  }, [preGenerateContent]);

  const loadNextQuestion = useCallback(async (phaseOverride?: 'reading' | 'listening') => {
    try {
      setLoading(true);
      stopAudio();
      
      // Use phaseOverride if provided (for phase transitions), otherwise use current ref
      const activePhase = phaseOverride || currentPhaseRef.current;
      const state = activePhase === 'reading' 
        ? stateRef.current.readingState 
        : stateRef.current.listeningState;
      
      const contentLanguageCode: LanguageCode = languageCode || 'english-for-spanish';
      const languageConfig = languages[contentLanguageCode];
      const baseLanguage = languageConfig?.baseLanguage || 'Spanish';
      
      console.log(`🎯 Loading adaptive ${activePhase} question at level ${state.currentLevel}`);
      
      // Check for pre-generated content
      const cacheKey = makeCacheKey(activePhase, state.currentLevel);
      const cachedQueue = preGeneratedCacheRef.current.get(cacheKey);
      
      if (cachedQueue && cachedQueue.length > 0) {
        const cached = cachedQueue.shift()!;
        preGeneratedCacheRef.current.set(cacheKey, cachedQueue);
        
        console.log(`⚡ Using pre-generated ${activePhase} content for level ${state.currentLevel} (remaining: ${cachedQueue.length})`);
        
        setCurrentContent(cached);
        setCurrentQuestion(cached.questions[0]);
        setUserAnswer('');
        setQuestionStartTime(Date.now());
        setLoading(false);
        
        // Trigger more pre-generation to refill queue
        preGenerateForLevels(activePhase, state.currentLevel);
        
        // Also pre-generate for the OTHER phase during reading
        if (activePhase === 'reading') {
          preGenerateForLevels('listening', state.currentLevel);
        }
        
        return;
      }
      
      // No cached content, generate fresh
      const result = await generateComprehensionContent(
        contentLanguageCode,
        baseLanguage,
        sessionId,
        activePhase,
        true, // adaptiveMode
        state.currentLevel
      );
      
      if (!result.content || result.content.length === 0) {
        throw new Error('No content generated');
      }
      
      const content = result.content[0];
      const question = content.questions[0];
      
      setCurrentContent(content);
      setCurrentQuestion(question);
      setUserAnswer('');
      setQuestionStartTime(Date.now());
      setLoading(false);
      
      // Start pre-generating content for current and adjacent levels
      preGenerateForLevels(activePhase, state.currentLevel);
      
      // Also pre-generate listening during reading phase
      if (activePhase === 'reading') {
        preGenerateForLevels('listening', state.currentLevel);
      }
    } catch (error) {
      console.error('Error loading adaptive question:', error);
      toast.error('Failed to load question');
      setLoading(false);
    }
  }, [sessionId, languageCode, stopAudio, preGenerateForLevels]);

  const evaluateAndProgress = useCallback(async () => {
    if (!currentQuestion || !userAnswer) return;

    const state = getState();
    const responseTime = Date.now() - questionStartTime;

    // Record the raw answer. It is submitted to the server at the end of the
    // phase and re-graded there; nothing here is trusted as a score.
    responsesRef.current[currentQuestion.id] = userAnswer;

    // The browser no longer receives `isCorrect`. Ask the server which way to
    // branch — it also writes the attempt to the audit log.
    let isCorrect = false;
    try {
      const graded = await gradeAnswer({
        sessionId,
        questionId: currentQuestion.id,
        selectedOptionId: userAnswer,
        section: currentPhaseRef.current,
        responseTimeMs: responseTime
      });
      isCorrect = graded.isCorrect;
    } catch (error) {
      console.warn('Could not grade answer server-side, staying at current level:', error);
    }

    const nextLevel = determineNextLevel(state.currentLevel, isCorrect);
    const newLevelHistory = [...state.levelHistory, nextLevel];
    const newCorrectCount = state.correctCount + (isCorrect ? 1 : 0);
    const newTotalCount = state.totalCount + 1;
    const newConfidence = calculateConfidence(newLevelHistory, newTotalCount);

    const attempt: QuestionAttempt = {
      questionId: currentQuestion.id,
      level: state.currentLevel,
      isCorrect,
      responseTimeMs: responseTime,
      confidence: newConfidence
    };

    setAttempts(prev => [...prev, attempt]);

    const shouldComplete = 
      (newConfidence >= CONFIDENCE_THRESHOLD && newTotalCount >= MIN_QUESTIONS) ||
      newTotalCount >= MAX_QUESTIONS;
    
    setState(prev => ({
      ...prev,
      currentLevel: nextLevel,
      levelHistory: newLevelHistory,
      correctCount: newCorrectCount,
      totalCount: newTotalCount,
      confidence: newConfidence,
      isComplete: shouldComplete
    }));
    
    if (shouldComplete) {
      await completePhase(newLevelHistory, newCorrectCount, newTotalCount);
    } else {
      await loadNextQuestion();
    }
  }, [currentQuestion, userAnswer, questionStartTime, sessionId, getState, setState, determineNextLevel, calculateConfidence, loadNextQuestion]);


  const completePhase = useCallback(async (
    levelHistory: CEFRLevel[],
    correctCount: number,
    totalCount: number
  ) => {
    const finalLevel = getFinalLevel(levelHistory);
    const correctRate = correctCount / totalCount;
    
    console.log(`✅ Completed ${currentPhase} phase:`, {
      finalLevel,
      correctRate,
      totalQuestions: totalCount
    });
    
    if (currentPhase === 'reading') {
      setCurrentPhase('listening');
      // Pass 'listening' explicitly since state hasn't updated yet
      await loadNextQuestion('listening');
    } else {
      await completeAdaptiveTest(readingState, listeningState);
    }
  }, [currentPhase, getFinalLevel, readingState, listeningState, loadNextQuestion]);

  const completeAdaptiveTest = useCallback(async (
    reading: AdaptiveState,
    listening: AdaptiveState
  ) => {
    try {
      setLoading(true);

      // Submit raw answers only. The edge function grades them against the
      // server-held answer key and writes the score itself.
      const result = await submitPhase({
        sessionId,
        phase: 'comprehension',
        responses: responsesRef.current,
      });

      console.log('✅ Comprehension graded server-side:', {
        score: result.score,
        cefr: result.cefr_level,
        questions: reading.totalCount + listening.totalCount
      });

      onComplete(result.score);
    } catch (error) {
      console.error('Error completing adaptive test:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to complete test');
    } finally {
      setLoading(false);
    }
  }, [sessionId, onComplete]);


  const handlePlayAudio = async () => {
    if (currentContent) {
      await playAudio(currentContent);
    }
  };

  const handleAnswer = (answer: string) => {
    setUserAnswer(answer);
  };

  const handleNext = async () => {
    await evaluateAndProgress();
  };

  const startAdaptiveTest = useCallback(async () => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    await loadNextQuestion();
  }, [loadNextQuestion]);

  const state = getState();

  return {
    currentPhase,
    currentContent,
    currentQuestion,
    userAnswer,
    loading,
    audioLoading,
    isPlaying,
    currentTime,
    duration,
    currentLevel: state.currentLevel,
    confidence: state.confidence,
    questionNumber: state.totalCount + 1,
    estimatedQuestionsRemaining: Math.max(0, MIN_QUESTIONS - state.totalCount),
    handleAnswer,
    handleNext,
    handlePlayAudio,
    seekAudio,
    skipAudio,
    startAdaptiveTest,
    isReadingComplete: currentPhase === 'listening'
  };
};
