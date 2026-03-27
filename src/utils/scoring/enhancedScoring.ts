
import { TestSession, Question } from '@/types';
import { ScoringDebugger } from '../scoringDebug';
import { AnswerComparison } from './answerComparison';
import { SessionScoreResult } from './scoringTypes';

export class EnhancedScoring {
  
  // Main evaluation function with enhanced logging
  static evaluateAnswer(
    questionId: string, 
    userAnswer: any, 
    question: Question,
    sessionId?: string
  ): boolean {
    console.log(`🔍 Evaluating answer for question ${questionId}:`, {
      questionType: question.type,
      userAnswer,
      questionText: question.text.substring(0, 100) + '...'
    });

    let result;
    switch (question.type) {
      case 'multipleChoice':
        result = AnswerComparison.compareMultipleChoice(userAnswer, question);
        break;
      case 'fillInBlank':
        result = AnswerComparison.compareFillInBlank(userAnswer, question);
        break;
      default:
        result = { isCorrect: false, method: 'unsupported-type', confidence: 0 };
    }

    // Enhanced logging with debug information
    ScoringDebugger.logAnswerEvaluation({
      questionId,
      questionText: question.text,
      questionType: question.type,
      userAnswer,
      correctAnswer: question.type === 'multipleChoice' 
        ? question.options?.find(opt => opt.isCorrect)
        : question.answer,
      isCorrect: result.isCorrect,
      comparisonMethod: result.method,
      confidence: result.confidence,
      debugInfo: result.debugInfo,
      timestamp: new Date().toISOString(),
      sessionId
    });

    console.log(`${result.isCorrect ? '✅' : '❌'} Question ${questionId}: ${result.method} (${result.confidence})`);

    return result.isCorrect;
  }

  // Enhanced session score calculation with detailed validation
  static calculateSessionScore(session: TestSession): SessionScoreResult {
    if (!session.questions) {
      return { 
        score: 0, 
        correctCount: 0, 
        totalCount: 0, 
        breakdown: [],
        validationInfo: { error: 'No questions in session' }
      };
    }

    let correctAnswers = 0;
    let totalAnswerable = 0;
    const breakdown: Array<{questionId: string; correct: boolean; method: string; confidence?: number}> = [];
    const validationInfo: {
      sessionId: string;
      timestamp: string;
      questionsProcessed: number;
      answersProvided: number;
      scoringMethods: Record<string, number>;
      finalScore?: number;
      correctCount?: number;
      totalCount?: number;
    } = {
      sessionId: session.id,
      timestamp: new Date().toISOString(),
      questionsProcessed: 0,
      answersProvided: 0,
      scoringMethods: {} as Record<string, number>
    };

    session.questions.forEach(question => {
      validationInfo.questionsProcessed++;
      
      // Only count answerable question types
      if (['multipleChoice', 'fillInBlank'].includes(question.type)) {
        totalAnswerable++;
        const userAnswer = session.answers[question.id];
        
        if (userAnswer !== undefined) {
          validationInfo.answersProvided++;
          const isCorrect = this.evaluateAnswer(question.id, userAnswer, question, session.id);
          if (isCorrect) {
            correctAnswers++;
          }
          
          // Get the last logged evaluation for this question
          const logs = ScoringDebugger.getSessionLogs(session.id);
          const lastLog = logs.filter(log => log.questionId === question.id).pop();
          
          if (lastLog) {
            const method = lastLog.comparisonMethod;
            validationInfo.scoringMethods[method] = (validationInfo.scoringMethods[method] || 0) + 1;
            
            breakdown.push({
              questionId: question.id,
              correct: isCorrect,
              method,
              confidence: lastLog.confidence
            });
          } else {
            breakdown.push({
              questionId: question.id,
              correct: isCorrect,
              method: 'unknown'
            });
          }
        } else {
          breakdown.push({
            questionId: question.id,
            correct: false,
            method: 'no-answer'
          });
        }
      }
    });

    const score = totalAnswerable > 0 ? (correctAnswers / totalAnswerable) * 100 : 0;
    
    validationInfo.finalScore = score;
    validationInfo.correctCount = correctAnswers;
    validationInfo.totalCount = totalAnswerable;
    
    console.log('📊 Enhanced Session Score Calculation:', {
      sessionId: session.id,
      score: score.toFixed(1) + '%',
      correct: correctAnswers,
      total: totalAnswerable,
      answerRate: `${validationInfo.answersProvided}/${totalAnswerable}`,
      methodDistribution: validationInfo.scoringMethods
    });

    return {
      score,
      correctCount: correctAnswers,
      totalCount: totalAnswerable,
      breakdown,
      validationInfo
    };
  }
}
