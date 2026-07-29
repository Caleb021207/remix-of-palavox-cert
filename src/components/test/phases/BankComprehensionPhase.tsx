import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Headphones, Loader2 } from 'lucide-react';
import { useBankPhase } from '@/hooks/test/useBankPhase';
import type { BankSkill } from '@/services/test/itemBankService';
import AudioPlayer from './listening/AudioPlayer';

interface BankComprehensionPhaseProps {
  sessionId: string;
  skill: BankSkill;
  onComplete: (score: number) => void;
}

/**
 * Renders a fixed practice form served from the persistent item bank.
 * Options arrive with labels only — no answer key is present in the client.
 */
const BankComprehensionPhase: React.FC<BankComprehensionPhaseProps> = ({
  sessionId,
  skill,
  onComplete,
}) => {
  const {
    currentItem,
    index,
    answers,
    totalItems,
    loading,
    submitting,
    error,
    selectOption,
    next,
  } = useBankPhase({ sessionId, skill, onComplete });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Preparing your practice set…</p>
      </div>
    );
  }

  if (error || !currentItem) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          {error || 'No practice items are available for this skill yet.'}
        </p>
      </div>
    );
  }

  const progress = ((index + 1) / Math.max(totalItems, 1)) * 100;
  const selected = answers[currentItem.id] ?? '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {skill === 'listening' ? (
            <Headphones className="h-5 w-5 text-primary" />
          ) : (
            <BookOpen className="h-5 w-5 text-primary" />
          )}
          <span className="font-medium text-primary">
            {skill === 'listening' ? 'Listening Practice' : 'Reading Practice'}
          </span>
        </div>
        <Badge variant="outline">
          {index + 1} / {totalItems}
        </Badge>
      </div>

      <Progress value={progress} className="h-2" />

      <p className="text-xs text-muted-foreground">
        Practice / formative — not an official proficiency measure.
      </p>

      {currentItem.passage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {currentItem.passage.title || (skill === 'listening' ? 'Listen' : 'Read the text')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {skill === 'listening' && currentItem.audioUrl ? (
              <AudioPlayer audioUrl={currentItem.audioUrl} />
            ) : null}
            {skill === 'listening' && !currentItem.audioUrl ? (
              <p className="text-xs text-muted-foreground">
                Audio is being prepared — read the transcript below.
              </p>
            ) : null}
            <p className="whitespace-pre-line leading-relaxed">{currentItem.passage.body}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{currentItem.stem}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selected}
            onValueChange={(value) => selectOption(currentItem.id, value)}
            className="space-y-3"
          >
            {currentItem.options.map((option) => (
              <div key={option.id} className="flex items-start gap-3 rounded-md border p-3">
                <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                <Label htmlFor={option.id} className="cursor-pointer leading-relaxed">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={next} disabled={submitting || !selected}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scoring…
            </>
          ) : index === totalItems - 1 ? (
            'Finish section'
          ) : (
            'Next question'
          )}
        </Button>
      </div>
    </div>
  );
};

export default BankComprehensionPhase;
