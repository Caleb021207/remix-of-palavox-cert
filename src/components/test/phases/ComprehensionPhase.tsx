import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Headphones, Volume2, Loader2, TrendingUp } from 'lucide-react';
import { useComprehensionPhase } from '@/hooks/test/useComprehensionPhase';
import { LanguageCode } from '@/config/languages';
import { EnglishTestVariant } from '@/config/languages/englishVariants';
import { useUILanguage } from '@/contexts/UILanguageContext';
import AudioPlayer from './listening/AudioPlayer';
import AdaptiveComprehensionPhase from './AdaptiveComprehensionPhase';

interface ComprehensionPhaseProps {
  sessionId: string;
  languageCode?: LanguageCode;
  englishVariant?: EnglishTestVariant;
  onComplete: (score: number) => void;
}

const ComprehensionPhase: React.FC<ComprehensionPhaseProps> = ({
  sessionId,
  languageCode,
  englishVariant,
  onComplete
}) => {
  const { t } = useUILanguage();
  
  // Feature flag: use adaptive mode (can be toggled later)
  const useAdaptiveMode = true;
  
  if (useAdaptiveMode) {
    return (
      <AdaptiveComprehensionPhase
        sessionId={sessionId}
        languageCode={languageCode}
        englishVariant={englishVariant}
        onComplete={onComplete}
      />
    );
  }

  const {
    currentPhase,
    currentContentIndex,
    currentQuestionIndex,
    responses,
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
    answeredQuestions
  } = useComprehensionPhase({
    sessionId,
    languageCode,
    englishVariant,
    onComplete
  });

  const currentQuestion = getCurrentQuestion();
  const currentContent = getCurrentContent();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">
          {t?.test?.phases?.reading?.loadingContent || 'Loading comprehension content...'}
        </p>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          {t?.test?.phases?.reading?.noContent || 'No content available'}
        </p>
      </div>
    );
  }

  const passage = currentContent?.passage;
  const audioUrl = currentContent?.audioUrl;

  console.log('🔍 ComprehensionPhase Debug:', {
    currentPhase,
    currentQuestionIndex,
    questionId: currentQuestion.id,
    optionIds: currentQuestion.options?.map((o: any) => o.id),
    currentResponse: responses[currentQuestion.id],
    allResponses: responses,
    hasAudioUrl: !!audioUrl,
    audioUrlLength: audioUrl?.length,
    currentContentKeys: currentContent ? Object.keys(currentContent) : [],
    fullCurrentContent: currentContent
  });

  return (
    <div className="space-y-6">
      {/* Phase indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {currentPhase === 'reading' ? (
            <>
              <BookOpen className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-600">
                {t?.test?.phases?.reading?.title || 'Reading Comprehension'}
              </span>
            </>
          ) : (
            <>
              <Headphones className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-600">
                {t?.test?.phases?.listening?.title || 'Listening Comprehension'}
              </span>
            </>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          Question {currentQuestionIndex + 1}
        </span>
      </div>

      {/* Content Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {currentPhase === 'reading' ? (
              <>
                <BookOpen className="h-5 w-5" />
                {t?.test?.phases?.reading?.readingPassage || 'Reading Passage'}
              </>
            ) : (
              <>
                <Headphones className="h-5 w-5" />
                {t?.test?.phases?.listening?.audioPassage || 'Audio Passage'}
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentPhase === 'reading' ? (
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{passage}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground mb-4">
                {t?.test?.phases?.listening?.listenCarefully || 'Listen carefully to the audio passage:'}
              </p>
              {!audioUrl && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    No audio content available for this passage. Debug info: {JSON.stringify({
                      hasContent: !!currentContent,
                      contentKeys: currentContent ? Object.keys(currentContent) : [],
                      audioUrlType: typeof audioUrl
                    })}
                  </p>
                </div>
              )}
              {audioUrl && (
                <AudioPlayer
                  isPlaying={isPlaying}
                  audioLoading={audioLoading}
                  currentTime={currentTime}
                  duration={duration}
                  onPlayAudio={handlePlayAudio}
                  onSeek={seekAudio}
                  onSkip={skipAudio}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Question {currentQuestionIndex + 1}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base font-medium">
            {currentQuestion.text}
          </p>

          <RadioGroup
            key={currentQuestion.id}
            value={responses[currentQuestion.id] || ''}
            onValueChange={(optionId) => {
              handleAnswer(currentQuestion.id, optionId);
            }}
          >
            {currentQuestion.options?.map((option: any) => (
              <div key={option.id} className="flex items-center space-x-2">
                <RadioGroupItem value={option.id} id={option.id} />
                <Label htmlFor={option.id} className="cursor-pointer flex-1">
                  {option.text}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <Button
            onClick={handleNext}
            disabled={!responses[currentQuestion.id] || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (answeredQuestions + 1 === totalQuestions) ? (
              currentPhase === 'reading' ? (
                'Continue to Listening'
              ) : (
                'Complete Comprehension Phase'
              )
            ) : (
              t?.test?.phases?.reading?.nextQuestion || 'Next Question'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComprehensionPhase;
