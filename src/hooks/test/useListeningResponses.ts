
import { useState } from 'react';
import { evaluatePhaseResponses } from '@/services/test/multiPhaseTestService';
import { TestPhase } from '@/types';
import { LanguageCode } from '@/config/languages';

export const useListeningResponses = (languageCode?: LanguageCode) => {
  const [responses, setResponses] = useState<Record<string, string>>({});

  const handleAnswer = (questionId: string, answer: string) => {
    setResponses(prev => ({ ...prev, [questionId]: answer }));
  };

  const evaluateResponses = async (content: any[]) => {
    const result = await evaluatePhaseResponses(TestPhase.Listening, responses, content, languageCode);
    
    // Store validation data for results page
    const totalQuestions = content.reduce((sum, c) => sum + (c.questions?.length || 0), 0);
    const answeredQuestions = Object.keys(responses).length;
    const correctAnswers = Math.round((result.score / 100) * totalQuestions);
    
    const validationData = {
      totalQuestions,
      answeredQuestions,
      correctAnswers,
      score: result.score,
      timestamp: new Date().toISOString(),
      scoringMethod: 'listening-comprehension',
      methodBreakdown: {
        'listening-comprehension': {
          count: totalQuestions,
          correct: correctAnswers
        }
      },
      lowConfidenceAnswers: 0
    };
    
    localStorage.setItem('scoringValidation', JSON.stringify(validationData));
    
    return result.score;
  };

  const getAnsweredQuestions = () => {
    return Object.keys(responses).length;
  };

  return {
    responses,
    handleAnswer,
    evaluateResponses,
    getAnsweredQuestions
  };
};
