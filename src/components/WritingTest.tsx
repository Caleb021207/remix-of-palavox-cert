
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Timer, Book, ArrowRight } from 'lucide-react';
import { getQuestions, evaluateResponse } from '@/services/testService';
import { ACTFLLevel, Question, EvaluationResult, TestType } from '@/types';
import { SPANISH_SPECIAL_CHARACTERS, TARGET_LANGUAGE } from '@/config/languageConfig';

interface WritingTestProps {
  level: ACTFLLevel;
  onComplete: (result: EvaluationResult, content: string, prompt: string) => void;
  onError: (error: Error) => void;
}

const WritingTest = ({ level, onComplete, onError }: WritingTestProps) => {
  const [prompt, setPrompt] = useState<Question | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes in seconds
  
  // Load writing prompt on component mount
  useEffect(() => {
    const loadPrompt = async () => {
      try {
        setLoading(true);
        const questions = await getQuestions(TestType.Writing, level, 1);
        if (questions && questions.length > 0) {
          setPrompt(questions[0]);
        } else {
          throw new Error('No writing prompts found');
        }
      } catch (error) {
        console.error('Error loading writing prompt:', error);
        toast('Failed to load Spanish writing prompt. Please try again.', {
          duration: 5000,
        });
        onError(error as Error);
      } finally {
        setLoading(false);
      }
    };
    
    loadPrompt();
  }, [level, onError]);
  
  // Handle timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Format time remaining
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculate the percentage of time remaining
  const timePercentage = (timeLeft / 1200) * 100;
  
  // Handle writing submission
  const handleSubmit = async () => {
    if (!prompt) return;
    
    if (content.trim().length < 50) {
      toast('Please write a more detailed response in Spanish before submitting.', {
        duration: 5000,
      });
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Evaluate the writing using GPT
      const result = await evaluateResponse('writing', content, prompt.text, level);
      
      onComplete(result, content, prompt.text);
    } catch (error) {
      console.error('Error submitting writing:', error);
      toast('Failed to evaluate your Spanish writing. Please try again.', {
        duration: 5000,
      });
      onError(error as Error);
    } finally {
      setSubmitting(false);
    }
  };

  // Insert Spanish special character
  const insertSpecialCharacter = (char: string) => {
    const textArea = document.querySelector('textarea');
    if (textArea) {
      const start = textArea.selectionStart || 0;
      const end = textArea.selectionEnd || 0;
      const text = textArea.value;
      const newText = text.substring(0, start) + char + text.substring(end);
      setContent(newText);
      
      // Set cursor position after inserted character
      setTimeout(() => {
        textArea.selectionStart = textArea.selectionEnd = start + 1;
        textArea.focus();
      }, 10);
    } else {
      setContent(prev => prev + char);
    }
  };
  
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Book className="h-5 w-5 mr-2 text-palavox-purple" />
            <h2 className="text-xl font-bold">Spanish Writing Assessment</h2>
          </div>
          
          <div className="flex items-center">
            <Timer className="h-5 w-5 mr-2 text-palavox-purple" />
            <span className="font-medium">{formatTime(timeLeft)}</span>
          </div>
        </div>
        
        {/* Time progress bar */}
        <div className="w-full h-2 bg-gray-200 rounded-full mb-6">
          <div 
            className={`h-2 rounded-full ${
              timePercentage > 50 
                ? 'bg-green-500' 
                : timePercentage > 20 
                  ? 'bg-amber-500' 
                  : 'bg-red-500'
            }`}
            style={{ width: `${timePercentage}%` }}
          ></div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-palavox-purple"></div>
            <span className="ml-3 text-palavox-purple">Loading Spanish prompt...</span>
          </div>
        ) : (
          <>
            {prompt && (
              <div className="mb-6 p-4 bg-palavox-lavender rounded-lg">
                <h3 className="text-lg font-medium mb-2">Spanish Writing Prompt:</h3>
                <p>{prompt.text}</p>
                <p className="text-sm text-gray-600 mt-2">Please respond in Spanish.</p>
              </div>
            )}
            
            {/* Spanish special characters toolbar */}
            <div className="mb-4 flex flex-wrap gap-2">
              {SPANISH_SPECIAL_CHARACTERS.map((item, index) => (
                <Button 
                  key={index}
                  variant="outline" 
                  className="w-10 h-10 text-lg font-medium"
                  title={item.description}
                  onClick={() => insertSpecialCharacter(item.char)}
                >
                  {item.char}
                </Button>
              ))}
            </div>
            
            <textarea
              className="w-full h-64 p-4 rounded-lg border border-gray-300 focus:border-palavox-purple focus:ring-1 focus:ring-palavox-purple mb-6"
              placeholder="Write your response in Spanish here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={submitting}
            ></textarea>
            
            <div className="flex justify-between">
              <div className="text-sm text-gray-500">
                {content.trim().length} characters
              </div>
              
              <Button 
                className="btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white rounded-full border-t-transparent"></div>
                    Evaluating...
                  </>
                ) : (
                  <>
                    Submit <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WritingTest;
