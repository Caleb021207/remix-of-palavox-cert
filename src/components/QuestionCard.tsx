
import React, { useState } from 'react';
import { Question } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface QuestionCardProps {
  question: Question;
  onAnswer: (questionId: string, answer: string | string[]) => void;
  onNext: () => void;
  userAnswer?: string | string[];
  isLastQuestion?: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onAnswer,
  onNext,
  userAnswer,
  isLastQuestion = false
}) => {
  const [localAnswer, setLocalAnswer] = useState<string>(
    typeof userAnswer === 'string' ? userAnswer : ''
  );
  const [recording, setRecording] = useState(false);

  const handleSubmit = () => {
    if (question.type !== 'multipleChoice') {
      onAnswer(question.id, localAnswer);
    }
    onNext();
  };

  const handleOptionChange = (value: string) => {
    onAnswer(question.id, value);
  };

  const renderQuestionContent = () => {
    switch (question.type) {
      case 'multipleChoice':
        return (
          <div key={question.id}>
            <RadioGroup
              value={userAnswer as string || undefined}
              onValueChange={handleOptionChange}
              className="mt-4 space-y-3"
            >
              {question.options?.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label htmlFor={option.id} className="text-base">{option.text}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'fillInBlank':
        return (
          <div className="mt-4">
            <Input 
              type="text" 
              value={localAnswer}
              onChange={(e) => setLocalAnswer(e.target.value)}
              placeholder="Your answer..."
              className="w-full"
            />
          </div>
        );

      case 'shortAnswer':
        return (
          <div className="mt-4">
            <Textarea 
              value={localAnswer}
              onChange={(e) => setLocalAnswer(e.target.value)}
              placeholder="Your answer..."
              className="w-full min-h-[150px]"
            />
          </div>
        );

      case 'audioResponse':
        return (
          <div className="mt-4 flex flex-col items-center">
            <Button 
              onClick={() => setRecording(!recording)}
              className={`${recording ? 'bg-red-500 hover:bg-red-600' : 'bg-palavox-purple hover:bg-indigo-800'} text-white p-4 rounded-full w-16 h-16`}
            >
              {recording ? 'Stop' : 'Record'}
            </Button>
            <p className="mt-3 text-sm text-gray-500">
              {recording 
                ? 'Recording... Click to stop' 
                : 'Click to start recording your answer'}
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="card animate-fade-in">
      <h3 className="text-xl font-semibold mb-4">{question.text}</h3>
      {renderQuestionContent()}
      <div className="mt-6 flex justify-end">
        <Button 
          onClick={handleSubmit}
          className="btn-primary"
        >
          {isLastQuestion ? 'Submit Test' : 'Next Question'}
        </Button>
      </div>
    </div>
  );
};

export default QuestionCard;
