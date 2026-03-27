
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { evaluatePhaseResponses } from '@/services/test/multiPhaseTestService';
import { generateSpeakingPrompts } from '@/services/test/speakingPromptService';
import { TestPhase } from '@/types';
import { LanguageCode, languages } from '@/config/languages';
import { EnglishTestVariant } from '@/config/languages/englishVariants';
import { toast } from 'sonner';
import { useUILanguage } from '@/contexts/UILanguageContext';
import { useSpeechRecognition } from '@/hooks/test/useSpeechRecognition';
import SpeakingPromptDisplay from './speaking/SpeakingPromptDisplay';
import RecordingControls from './speaking/RecordingControls';

interface SpeakingPhaseProps {
  sessionId: string;
  languageCode?: LanguageCode;
  englishVariant?: EnglishTestVariant;
  onComplete: (score: number) => void;
}

interface SpeakingPrompt {
  level: string;
  prompt: string;
  prompt_english?: string;
  expectedDuration: string;
  instructions: string;
  instructions_english?: string;
  initial_cta_native?: string;
  initial_cta_english?: string;
}

const SpeakingPhase: React.FC<SpeakingPhaseProps> = ({ 
  sessionId, 
  languageCode, 
  englishVariant,
  onComplete 
}) => {
  const { t } = useUILanguage();
  const [prompts, setPrompts] = useState<SpeakingPrompt[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // All tests are English proficiency tests now
  const targetLanguage = 'English';
  const languageConfig = languageCode && languages[languageCode] ? languages[languageCode] : languages['english-for-spanish'];

  const {
    isRecording,
    currentTranscript,
    startRecording,
    stopRecording,
    setCurrentTranscript,
    accumulatedTranscript,
    clearTranscript
  } = useSpeechRecognition(targetLanguage);

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

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      
      const result = await generateSpeakingPrompts(languageCode, englishVariant);
      setPrompts(result.prompts);
      setLoading(false);
    } catch (error) {
      console.error('Error loading speaking prompts:', error);
      toast.error('Failed to load speaking prompts');
      setLoading(false);
    }
  };

  const getCurrentPrompt = () => prompts[currentPromptIndex];

  const handleStartRecording = () => {
    clearTranscript();
    startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
    
    // Save the accumulated transcript (includes all speech segments)
    const currentPrompt = getCurrentPrompt();
    const finalTranscript = accumulatedTranscript || currentTranscript;
    if (finalTranscript.trim()) {
      setResponses(prev => ({ ...prev, [currentPrompt.level]: finalTranscript }));
    }
  };

  const handleNext = () => {
    if (currentPromptIndex < prompts.length - 1) {
      setCurrentPromptIndex(prev => prev + 1);
      clearTranscript();
    } else {
      completePhase();
    }
  };

  const completePhase = async () => {
    try {
      setLoading(true);
      
      // Pass the language code to evaluation, which will handle base language extraction
      const result = await evaluatePhaseResponses(TestPhase.Speaking, responses, undefined, languageCode);
      onComplete(result.score);
    } catch (error) {
      console.error('Error evaluating speaking phase:', error);
      toast.error('Failed to evaluate speaking responses');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-palavox-purple mx-auto mb-4"></div>
        <p>{getTranslation('test.phases.speaking.loadingPrompts', 'Loading speaking prompts...')}</p>
      </div>
    );
  }

  if (!prompts.length) {
    return <div className="text-center py-8">{getTranslation('test.phases.speaking.noPrompts', 'No prompts available')}</div>;
  }

  const currentPrompt = getCurrentPrompt();
  const currentResponse = responses[currentPrompt.level] || '';
  const displayTranscript = accumulatedTranscript || currentTranscript || currentResponse;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold mb-2">{getTranslation('test.phases.speaking.title', 'Speaking Assessment')}</h3>
        <p className="text-palavox-slate">
          {getTranslation('test.phases.common.promptOf', 'Prompt {current} of {total}')
            .replace('{current}', (currentPromptIndex + 1).toString())
            .replace('{total}', prompts.length.toString())} • {getTranslation('test.phases.common.level', 'Level')}: {currentPrompt.level}
        </p>
        <p className="text-sm text-palavox-slate mt-1">
          {getTranslation('test.phases.speaking.speakingIn', 'Speaking in')} {targetLanguage}
        </p>
        <p className="text-xs text-palavox-slate mt-1">
          Expected duration: {currentPrompt.expectedDuration}
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {currentPrompt.prompt_english && currentPrompt.prompt && currentPrompt.prompt !== currentPrompt.prompt_english ? (
              <>
                <p className="text-center text-sm text-muted-foreground mb-4">
                  {getTranslation('test.phases.speaking.initialInstructions.bothLabel', 'Instructions available in both languages')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h5 className="font-semibold mb-2 text-blue-900">
                      {getTranslation('test.phases.speaking.initialInstructions.yourLanguage', 'Your Language')}
                    </h5>
                    <div className="prose prose-sm mb-3">
                      {currentPrompt.prompt}
                    </div>
                    {currentPrompt.instructions && (
                      <p className="text-sm text-muted-foreground italic">{currentPrompt.instructions}</p>
                    )}
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h5 className="font-semibold mb-2">
                      {getTranslation('test.phases.speaking.initialInstructions.testLanguage', 'Test Language (English)')}
                    </h5>
                    <div className="prose prose-sm mb-3">
                      {currentPrompt.prompt_english}
                    </div>
                    {currentPrompt.instructions_english && (
                      <p className="text-sm text-muted-foreground italic">{currentPrompt.instructions_english}</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <h4 className="text-lg font-semibold mb-2">
                  {getTranslation('test.phases.speaking.speakingPrompt', 'Speaking Prompt')}
                </h4>
                <div className="prose prose-sm max-w-none mb-4 p-4 bg-gray-50 rounded-lg">
                  {currentPrompt.prompt}
                </div>
                <div className="text-sm text-palavox-slate italic">
                  {currentPrompt.instructions}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <RecordingControls
            isRecording={isRecording}
            currentTranscript={displayTranscript}
            currentResponse={currentResponse}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            getTranslation={getTranslation}
          />

          <div className="mt-6 flex justify-between">
            <div></div>
            <Button 
              onClick={handleNext}
              disabled={!currentResponse && !displayTranscript.trim()}
              className="btn-primary"
            >
              {currentPromptIndex === prompts.length - 1 ? 
                getTranslation('test.phases.speaking.completePhase', 'Complete Speaking Phase') : 
                getTranslation('test.phases.speaking.nextPrompt', 'Next Prompt')
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpeakingPhase;
