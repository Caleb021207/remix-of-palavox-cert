import React, { useState, useEffect } from 'react';
import { TestSession, TestPhase } from '@/types';
import { useUILanguage } from '@/contexts/UILanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ComprehensionPhase from './phases/ComprehensionPhase';
import WritingPhase from './phases/WritingPhase';
import SpeakingPhase from './phases/SpeakingPhase';
import ConversationalFluencyPhase from './phases/ConversationalFluencyPhase';
import { languages, LanguageCode } from '@/config/languages';
import { finalizeTest } from '@/services/test/secureTestService';


interface SinglePhaseTestProps {
  session: TestSession;
  phase: TestPhase;
  onComplete: (session: TestSession, score: number) => void;
  onBackToMenu?: () => void;
}

const SinglePhaseTest: React.FC<SinglePhaseTestProps> = ({
  session,
  phase,
  onComplete,
  onBackToMenu
}) => {
  const { t } = useUILanguage();
  const [loading, setLoading] = useState(false);

  const getLanguageConfig = () => {
    const targetLang = session.language || 'english-for-spanish';
    return languages[targetLang as LanguageCode] || languages['english-for-spanish'];
  };

  const handlePhaseComplete = async (completedPhase: TestPhase, score: number) => {
    setLoading(true);
    try {
      // Even for a single section, the overall record is written server-side
      // so the results page has an authoritative row to read.
      await finalizeTest(session.id);
    } catch (error) {
      console.warn('Could not finalize single-phase session:', error);
    } finally {
      setLoading(false);
    }

    const updatedSession: TestSession = {
      ...session,
      phaseScores: {
        ...session.phaseScores,
        [completedPhase]: score
      },
      score: score,
      endTime: new Date()
    };

    onComplete(updatedSession, score);
  };


  const renderPhase = () => {
    const onComplete = (score: number) => {
      handlePhaseComplete(phase, score);
    };

    const languageCode = (session.language || 'english-for-spanish') as LanguageCode;

    switch (phase) {
      case TestPhase.Comprehension:
      case TestPhase.Reading:
      case TestPhase.Listening:
        return (
          <ComprehensionPhase 
            sessionId={session.id}
            languageCode={languageCode}
            englishVariant={session.englishVariant}
            skill={
              phase === TestPhase.Reading
                ? 'reading'
                : phase === TestPhase.Listening
                  ? 'listening'
                  : 'both'
            }
            onComplete={onComplete}
          />
        );
      case TestPhase.Writing:
        return (
          <WritingPhase 
            sessionId={session.id}
            languageCode={languageCode}
            englishVariant={session.englishVariant}
            onComplete={onComplete}
          />
        );
      case TestPhase.Speaking:
        return (
          <SpeakingPhase 
            sessionId={session.id}
            languageCode={languageCode}
            englishVariant={session.englishVariant}
            onComplete={onComplete}
          />
        );
      case TestPhase.Conversation:
      case TestPhase.ConversationalFluency:
        return (
          <ConversationalFluencyPhase
            sessionId={session.id}
            languageCode={languageCode}
            onComplete={onComplete}
          />
        );
      default:
        return <div>Unknown phase</div>;
    }
  };

  const getPhaseTitle = () => {
    switch (phase) {
      case TestPhase.Comprehension:
        return t.test.phaseSelection.phases.comprehension?.title || 'Comprensión';
      case TestPhase.Reading:
        return t.test.phaseSelection.phases.reading.title;
      case TestPhase.Listening:
        return t.test.phaseSelection.phases.listening.title;
      case TestPhase.Writing:
        return t.test.phaseSelection.phases.writing.title;
      case TestPhase.Speaking:
        return t.test.phaseSelection.phases.speaking.title;
      case TestPhase.Conversation:
      case TestPhase.ConversationalFluency:
        return t.test.phaseSelection.phases['conversational-fluency']?.title || 'Fluidez Conversacional';
      default:
        return 'Assessment';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {onBackToMenu && (
        <Button
          variant="ghost"
          onClick={onBackToMenu}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t.test.phaseSelection.backToSelection}
        </Button>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-primary">
            {getPhaseTitle()}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t.test.phaseSelection.individualAssessment}
          </p>
        </CardHeader>
        <CardContent>
          {renderPhase()}
        </CardContent>
      </Card>
    </div>
  );
};

export default SinglePhaseTest;
