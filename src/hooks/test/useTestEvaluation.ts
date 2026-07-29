
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { TestSession, EvaluationResult, CEFRLevel, ACTFLLevel } from '@/types';
import { saveTestSession } from '@/services/test';
import { EnhancedScoring, ScoringDebugger } from '@/utils/enhancedScoring';
import { determineCEFRLevel, determineACTFLLevel } from '@/utils/scoring';
import { determineProficiencyLevel, generateProficiencyFeedback } from '@/utils/proficiencyScoring';

export const useTestEvaluation = (session: TestSession | null, setLoading: React.Dispatch<React.SetStateAction<boolean>>) => {
  const navigate = useNavigate();

  const handleTestComplete = (result: EvaluationResult, content: string, prompt?: string) => {
    if (!session) return;
    
    console.log('🏁 Test completed with AI evaluation result:', result);
    
    // Complete the session with the evaluation
    const completedSession: TestSession = {
      ...session,
      endTime: new Date(),
      score: result.score,
      cefr: result.cefr_level,
      actfl: result.actfl_level,
      feedback: {
        ...session.feedback,
        summary: result.summary || result.feedback?.overall,
        ...result.feedback
      },
      transcript: content
    };
    
    // Save the completed session and navigate to results
    saveSessionAndRedirect(completedSession);
  };

  const handleSubmitTest = async () => {
    if (!session) return;
    
    setLoading(true);
    console.log('📝 Submitting test for Proficiency Level-based evaluation:', session.id);
    
    try {
      // Clear previous logs and calculate score using enhanced scoring
      ScoringDebugger.clearLogs();
      const scoringResult = EnhancedScoring.calculateSessionScore(session);
      
      console.log('🔢 Enhanced scoring result:', scoringResult);
      
      const score = scoringResult.score;
      
      // Use Proficiency Level-based level determination
      const proficiencyLevel = determineProficiencyLevel(score);
      const cefr = proficiencyLevel.cefrLevel;
      const actfl = proficiencyLevel.actflLevel;
      
      console.log('🎯 Proficiency Level-based level determination:', { 
        score, 
        proficiencyLevel: proficiencyLevel.level, 
        stampName: proficiencyLevel.name,
        cefr, 
        actfl 
      });

      // Generate Proficiency Level-based comprehensive feedback
      const proficiencyFeedback = generateProficiencyFeedback(score, proficiencyLevel, session.testType);
      
      const finalSession = {
        ...session,
        endTime: new Date(),
        score,
        cefr,
        actfl,
        feedback: {
          ...proficiencyFeedback,
          scoring_breakdown: {
            correct_answers: scoringResult.correctCount,
            total_questions: scoringResult.totalCount,
            percentage: score.toFixed(1),
            method_breakdown: scoringResult.breakdown,
            stamp_level: proficiencyLevel.level,
            stamp_name: proficiencyLevel.name,
            cefr_level: cefr,
            actfl_level: actfl,
            scoring_timestamp: new Date().toISOString()
          }
        }
      };
      
      console.log('✅ Final Proficiency Level-based session prepared:', {
        sessionId: finalSession.id,
        score: finalSession.score,
        proficiencyLevel: proficiencyLevel.level,
        stampName: proficiencyLevel.name,
        cefr: finalSession.cefr,
        actfl: finalSession.actfl
      });
      
      // Save the completed session and navigate to results
      saveSessionAndRedirect(finalSession);
    } catch (error) {
      console.error('❌ Error submitting test:', error);
      toast('Error submitting test. Please try again', {
        duration: 5000,
      });
      setLoading(false);
    }
  };
  
  const saveSessionAndRedirect = async (finalSession: TestSession) => {
    try {
      // Save to Supabase
      await saveTestSession(finalSession);
      
      // Store in localStorage for results page
      localStorage.setItem('testSession', JSON.stringify(finalSession));
      
      // Store debug report for potential review
      const debugReport = ScoringDebugger.generateReport(finalSession.id);
      localStorage.setItem('scoringDebugReport', debugReport);
      
      // Store Proficiency Level validation data
      const validationData = {
        sessionId: finalSession.id,
        timestamp: new Date().toISOString(),
        score: finalSession.score,
        cefr: finalSession.cefr,
        actfl: finalSession.actfl,
        questionCount: finalSession.questions?.length || 0,
        scoringMethod: 'proficiency-enhanced'
      };
      localStorage.setItem('scoringValidation', JSON.stringify(validationData));
      
      // Navigate to results page
      navigate('/results');
    } catch (error) {
      console.error('❌ Error saving test session:', error);
      toast('Error saving your test results. Please try again.', {
        duration: 5000,
      });
      setLoading(false);
    }
  };

  return {
    handleTestComplete,
    handleSubmitTest
  };
};
