
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useUILanguage } from '@/contexts/UILanguageContext';

interface QuestionDisplayProps {
  question: any;
  selectedAnswer: string;
  onAnswer: (questionId: string, answer: string) => void;
  onNext: () => void;
  isLastQuestion: boolean;
}

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  selectedAnswer,
  onAnswer,
  onNext,
  isLastQuestion
}) => {
  const { t } = useUILanguage();

  console.log('QuestionDisplay render:', {
    questionId: question.id,
    selectedAnswer,
    optionIds: question.options.map((o: any) => o.id)
  });

  return (
    <Card>
      <CardHeader>
        <h4 className="text-lg font-semibold">{t.test.phases.listening.question}</h4>
      </CardHeader>
      <CardContent>
        <p className="mb-4 font-medium">{question.text}</p>
        
        <div key={question.id}>
          <RadioGroup
            key={question.id}
            value={selectedAnswer ? `${question.id}___${selectedAnswer}` : ''}
            onValueChange={(value) => {
              // Extract the actual option ID from the unique value
              const optionId = value.split('___')[1];
              onAnswer(question.id, optionId);
            }}
          >
            {question.options.map((option: any) => {
              const uniqueValue = `${question.id}___${option.id}`;
              return (
                <div key={option.id} className="flex items-center space-x-2 p-2 rounded hover:bg-palavox-lavender">
                  <RadioGroupItem value={uniqueValue} id={`${question.id}-${option.id}`} />
                  <Label htmlFor={`${question.id}-${option.id}`} className="cursor-pointer flex-1">
                    {option.text}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        <div className="mt-6 flex justify-between">
          <div></div>
          <Button 
            onClick={onNext}
            disabled={!selectedAnswer}
            className="btn-primary"
          >
            {isLastQuestion ? t.test.phases.listening.completePhase : t.test.phases.listening.nextQuestion}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestionDisplay;
