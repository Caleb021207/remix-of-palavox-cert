
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useUILanguage } from '@/contexts/UILanguageContext';

interface ReadingQuestionProps {
  question: {
    id: string;
    text: string;
    options: Array<{
      id: string;
      text: string;
    }>;
  };
  selectedAnswer: string;
  onAnswerChange: (questionId: string, answer: string) => void;
  onNext: () => void;
  isLastQuestion: boolean;
  currentQuestionNumber: number;
  totalQuestions: number;
}

const ReadingQuestion: React.FC<ReadingQuestionProps> = ({
  question,
  selectedAnswer,
  onAnswerChange,
  onNext,
  isLastQuestion,
  currentQuestionNumber,
  totalQuestions
}) => {
  const { t } = useUILanguage();

  console.log('ReadingQuestion render:', {
    questionId: question.id,
    selectedAnswer,
    optionIds: question.options.map(o => o.id)
  });

  return (
    <div key={`question-wrapper-${question.id}`}>
      <Card>
      <CardHeader>
        <h4 className="text-lg font-semibold">{t?.test?.phases?.reading?.question || 'Question'}</h4>
      </CardHeader>
      <CardContent>
        <p className="mb-4">{question.text}</p>
        
        <div key={question.id}>
          <RadioGroup
            key={question.id}
            value={selectedAnswer ? `${question.id}___${selectedAnswer}` : ''}
            onValueChange={(value) => {
              // Extract the actual option ID from the unique value
              const optionId = value.split('___')[1];
              onAnswerChange(question.id, optionId);
            }}
          >
            {question.options.map((option: any) => {
              const uniqueValue = `${question.id}___${option.id}`;
              return (
                <div key={option.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={uniqueValue} id={`${question.id}-${option.id}`} />
                  <Label htmlFor={`${question.id}-${option.id}`} className="cursor-pointer">
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
            {isLastQuestion ? 
              (t?.test?.phases?.reading?.completePhase || 'Complete Phase') : 
              (t?.test?.phases?.reading?.nextQuestion || 'Next Question')
            }
          </Button>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};

export default ReadingQuestion;
