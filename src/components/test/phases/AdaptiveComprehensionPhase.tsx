import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Headphones, Loader2, Target } from 'lucide-react';
import { useAdaptiveComprehension } from '@/hooks/test/useAdaptiveComprehension';
import { LanguageCode } from '@/config/languages';
import { EnglishTestVariant } from '@/config/languages/englishVariants';
import { useUILanguage } from '@/contexts/UILanguageContext';
import AudioPlayer from './listening/AudioPlayer';

interface AdaptiveComprehensionPhaseProps {
  sessionId: string;
  languageCode?: LanguageCode;
  englishVariant?: EnglishTestVariant;
  onComplete: (score: number) => void;
}

const AdaptiveComprehensionPhase: React.FC<AdaptiveComprehensionPhaseProps> = ({
  sessionId,
  languageCode,
  englishVariant,
  onComplete
}) => {
  const { t } = useUILanguage();
  const hasInitialized = useRef(false);

  const {
    currentPhase,
    currentContent,
    currentQuestion,
    userAnswer,
    loading,
    audioLoading,
    isPlaying,
    currentTime,
    duration,
    currentLevel,
    confidence,
    questionNumber,
    estimatedQuestionsRemaining,
    handleAnswer,
    handleNext,
    handlePlayAudio,
    seekAudio,
    skipAudio,
    startAdaptiveTest
  } = useAdaptiveComprehension({
    sessionId,
    languageCode,
    englishVariant,
    onComplete
  });

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      startAdaptiveTest();
    }
  }, []);

  if (loading && !currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">
          {t?.test?.phases?.reading?.loadingContent || 'Loading adaptive content...'}
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
  const confidencePercent = Math.round(confidence * 100);

  return (
    <div className="space-y-6">
      {/* Adaptive Progress Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentPhase === 'reading' ? (
              <>
                <BookOpen className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-600">
                  {t?.test?.phases?.reading?.title || 'Adaptive Reading'}
                </span>
              </>
            ) : (
              <>
                <Headphones className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-600">
                  {t?.test?.phases?.listening?.title || 'Adaptive Listening'}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              Level: {currentLevel}
            </Badge>
          </div>
        </div>

        {/* Confidence Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Question {questionNumber} {estimatedQuestionsRemaining > 0 && `(~${estimatedQuestionsRemaining} more)`}</span>
            <span>Confidence: {confidencePercent}%</span>
          </div>
          <Progress value={confidencePercent} className="h-2" />
        </div>
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
            <Badge variant="secondary" className="ml-auto">
              {currentLevel}
            </Badge>
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
              {audioUrl ? (
                <AudioPlayer
                  isPlaying={isPlaying}
                  audioLoading={audioLoading}
                  currentTime={currentTime}
                  duration={duration}
                  onPlayAudio={handlePlayAudio}
                  onSeek={seekAudio}
                  onSkip={skipAudio}
                />
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    Audio content is being loaded...
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Question {questionNumber}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base font-medium">
            {currentQuestion.text}
          </p>

          <RadioGroup
            key={currentQuestion.id}
            value={userAnswer}
            onValueChange={handleAnswer}
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
            disabled={!userAnswer || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : confidencePercent >= 85 && questionNumber >= 8 ? (
              'Complete Section'
            ) : (
              'Next Adaptive Question'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdaptiveComprehensionPhase;
