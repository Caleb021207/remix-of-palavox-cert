
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TestPhase, TestSession } from '@/types';
import { languages, LanguageCode } from '@/config/languages';
import { EnglishTestVariant } from '@/config/languages/englishVariants';
import { saveTestSession } from '@/services/test/sessionService';
import { toast } from 'sonner';
import { useUILanguage } from '@/contexts/UILanguageContext';
import ComprehensionPhase from './phases/ComprehensionPhase';
import WritingPhase from './phases/WritingPhase';
import ConversationalFluencyPhase from './phases/ConversationalFluencyPhase';
import { supabase } from '@/integrations/supabase/client';
import { checkCertificateEligibility, CERTIFICATE_TIERS } from '@/config/testConfig';
import { determineSTAMPLevel } from '@/utils/stampScoring';

interface MultiPhaseTestProps {
  session: TestSession;
  onComplete: (session: TestSession) => void;
}

const MultiPhaseTest: React.FC<MultiPhaseTestProps> = ({ session, onComplete }) => {
  const { t } = useUILanguage();
  const [currentPhase, setCurrentPhase] = useState<TestPhase>(TestPhase.Comprehension);
  const [phaseScores, setPhaseScores] = useState<Partial<Record<TestPhase, number>>>({
    [TestPhase.Comprehension]: 0,
    [TestPhase.Writing]: 0,
    [TestPhase.Conversation]: 0
  });
  const [loading, setLoading] = useState(false);

  const getTranslation = (path: string, fallback: string): string => {
    try {
      if (!t) return fallback;
      
      const keys = path.split('.');
      let value: any = t;
      
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return fallback;
        }
      }
      
      return typeof value === 'string' ? value : fallback;
    } catch {
      return fallback;
    }
  };

  // 3-phase test system
  const phases = [
    TestPhase.Comprehension,
    TestPhase.Writing,
    TestPhase.Conversation
  ];

  // Get language configuration - all tests are English proficiency now
  const getLanguageConfig = () => {
    if (session.language && languages[session.language]) {
      return {
        targetLanguage: 'English',
        flag: languages[session.language].flag
      };
    } else {
      // Fallback to English for Spanish speakers
      return {
        targetLanguage: 'English',
        flag: '🇪🇸'
      };
    }
  };

  const languageConfig = getLanguageConfig();
  const targetLanguage = languageConfig.targetLanguage;

  // Fallback translations with getTranslation function
  const phaseNames = {
    [TestPhase.Comprehension]: getTranslation('test.phases.comprehension.title', 'Comprensión'),
    [TestPhase.Writing]: getTranslation('test.phases.writing.title', 'Writing'),
    [TestPhase.Conversation]: getTranslation('test.phases.conversation.title', 'Conversational Fluency')
  };

  const currentPhaseIndex = phases.indexOf(currentPhase);
  const progress = ((currentPhaseIndex + 1) / phases.length) * 100;

  // Phase weights for final score calculation (25/30/45)
  const PHASE_WEIGHTS = {
    [TestPhase.Comprehension]: 0.25,  // Reading + Listening
    [TestPhase.Writing]: 0.30,         // Written production
    [TestPhase.Conversation]: 0.45     // Conversational fluency
  } as const;

  const handlePhaseComplete = async (score: number) => {
    const updatedPhaseScores = { ...phaseScores, [currentPhase]: score };
    setPhaseScores(updatedPhaseScores);
    
    // Simple success message - no pass/fail
    toast.success(
      `✓ ${phaseNames[currentPhase]} completed: ${score.toFixed(1)}%`,
      { duration: 3000 }
    );
    
    const nextPhaseIndex = currentPhaseIndex + 1;
    if (nextPhaseIndex < phases.length) {
      setCurrentPhase(phases[nextPhaseIndex]);
    } else {
      await handleTestComplete(updatedPhaseScores);
    }
  };

  const handleTestComplete = async (
    finalScores: Partial<Record<TestPhase, number>>
  ) => {
    setLoading(true);
    
    try {
      // Calculate weighted average score
      const weightedScore = 
        (finalScores[TestPhase.Comprehension] || 0) * PHASE_WEIGHTS[TestPhase.Comprehension] +
        (finalScores[TestPhase.Writing] || 0) * PHASE_WEIGHTS[TestPhase.Writing] +
        (finalScores[TestPhase.Conversation] || 0) * PHASE_WEIGHTS[TestPhase.Conversation];
      
      // Check certificate eligibility
      const eligibility = checkCertificateEligibility({
        comprehension: finalScores[TestPhase.Comprehension],
        writing: finalScores[TestPhase.Writing],
        conversation: finalScores[TestPhase.Conversation]
      });
      
      const completedSession: TestSession = {
        ...session,
        phaseScores: finalScores,
        score: Math.round(weightedScore),
        endTime: new Date(),
        feedback: {
          ...session.feedback,
          phaseWeights: PHASE_WEIGHTS,
          scoringMethod: 'weighted-25-30-45',
          certificateTier: eligibility.tier,
          certificateQualified: eligibility.qualified,
          needsImprovement: eligibility.needsImprovement,
          calculation: {
            comprehension: `${finalScores[TestPhase.Comprehension]}% × 0.25 = ${((finalScores[TestPhase.Comprehension] || 0) * 0.25).toFixed(1)}`,
            writing: `${finalScores[TestPhase.Writing]}% × 0.30 = ${((finalScores[TestPhase.Writing] || 0) * 0.30).toFixed(1)}`,
            conversation: `${finalScores[TestPhase.Conversation]}% × 0.45 = ${((finalScores[TestPhase.Conversation] || 0) * 0.45).toFixed(1)}`,
            total: `${weightedScore.toFixed(1)}%`
          }
        }
      };
      
      await saveTestSession(completedSession);
      
      // Update database with certificate tier
      await supabase
        .from('test_sessions')
        .update({
          certificate_tier: eligibility.tier
        } as any)
        .eq('id', session.id);
      
      localStorage.setItem('testSession', JSON.stringify(completedSession));
      
      toast.success(getTranslation('test.multiPhase.testCompleted', 'Test completed! View your results.'));
      onComplete(completedSession);
    } catch (error) {
      console.error('Error saving test session:', error);
      toast.error(getTranslation('test.multiPhase.saveError', 'Test completed but failed to save. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const renderCurrentPhase = () => {
    const phaseProps = {
      sessionId: session.id,
      languageCode: session.language as LanguageCode,
      englishVariant: session.englishVariant,
      onComplete: (score: number) => handlePhaseComplete(score)
    };

    switch (currentPhase) {
      case TestPhase.Comprehension:
        return <ComprehensionPhase {...phaseProps} />;
      case TestPhase.Writing:
        return <WritingPhase {...phaseProps} />;
      case TestPhase.Conversation:
      case TestPhase.ConversationalFluency:
        return <ConversationalFluencyPhase {...phaseProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              {targetLanguage} {getTranslation('test.multiPhase.certificationTest', 'Certification Test')}
            </h2>
            <span className="text-sm text-palavox-slate">
              {getTranslation('test.multiPhase.phaseOf', 'Phase {current} of {total}')
                .replace('{current}', (currentPhaseIndex + 1).toString())
                .replace('{total}', phases.length.toString())}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{phaseNames[currentPhase]}</span>
              <span>{getTranslation('test.multiPhase.percentComplete', '{percent}% Complete')
                .replace('{percent}', Math.round(progress).toString())}</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-6">
          {renderCurrentPhase()}
        </CardContent>
      </Card>

      {Object.keys(phaseScores).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <h3 className="text-lg font-semibold">{getTranslation('test.multiPhase.completedPhases', 'Completed Phases')}</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(phaseScores).map(([phase, score]) => {
                return score && score > 0 ? (
                  <div 
                    key={phase} 
                    className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200"
                  >
                    <div className="font-medium">
                      {phaseNames[phase as TestPhase]}
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {score.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {determineSTAMPLevel(score).name}
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MultiPhaseTest;
