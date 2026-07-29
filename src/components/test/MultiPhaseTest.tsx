
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TestPhase, TestSession } from '@/types';
import { languages, LanguageCode } from '@/config/languages';
import { EnglishTestVariant } from '@/config/languages/englishVariants';
import { toast } from 'sonner';
import { useUILanguage } from '@/contexts/UILanguageContext';
import ComprehensionPhase from './phases/ComprehensionPhase';
import WritingPhase from './phases/WritingPhase';
import ConversationalFluencyPhase from './phases/ConversationalFluencyPhase';
import { finalizeTest } from '@/services/test/secureTestService';

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

  /**
   * Finalization is entirely server-side: `finalize-test` aggregates the
   * section scores it wrote itself, applies the official weights and stores
   * the overall result. No weighting, tier logic or score math happens here.
   */
  const handleTestComplete = async (
    finalScores: Partial<Record<TestPhase, number>>
  ) => {
    setLoading(true);
    
    try {
      const result = await finalizeTest(session.id);

      const completedSession: TestSession = {
        ...session,
        phaseScores: finalScores,
        score: Math.round(result.overall_score ?? 0),
        endTime: new Date(),
        feedback: {
          ...session.feedback,
          overallCefr: result.overall_cefr,
          functionalLabel: result.functional_label,
          confidenceBand: result.confidence_band,
          strengths: result.strengths,
          nextSteps: result.next_steps,
          scoringMethod: 'server-side',
        }
      };

      toast.success(getTranslation('test.multiPhase.testCompleted', 'Test completed! View your results.'));
      onComplete(completedSession);
    } catch (error) {
      console.error('Error finalizing test session:', error);
      toast.error(error instanceof Error ? error.message : getTranslation('test.multiPhase.saveError', 'Could not finalize your test. Please try again.'));
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
                      {getTranslation('test.multiPhase.serverScored', 'Scored by our servers')}
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
