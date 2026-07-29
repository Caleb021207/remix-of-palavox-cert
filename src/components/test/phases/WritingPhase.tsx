
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { generateWritingPrompts } from '@/services/test/multiPhaseTestService';
import { submitPhase } from '@/services/test/secureTestService';
import { TestPhase } from '@/types';
import { LanguageCode } from '@/config/languages';
import { EnglishTestVariant } from '@/config/languages/englishVariants';
import { toast } from 'sonner';
import { useUILanguage } from '@/contexts/UILanguageContext';

interface WritingPhaseProps {
  sessionId: string;
  languageCode?: LanguageCode;
  englishVariant?: EnglishTestVariant;
  onComplete: (score: number) => void;
}

const WritingPhase: React.FC<WritingPhaseProps> = ({ 
  sessionId, 
  languageCode, 
  englishVariant,
  onComplete 
}) => {
  const { t } = useUILanguage();
  const [prompts, setPrompts] = useState<any[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [wordCounts, setWordCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

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
      
      const contentLanguageCode: LanguageCode = languageCode || 'english-for-spanish';
      console.log('Generating English writing content for language code:', contentLanguageCode);
      
      const result = await generateWritingPrompts(contentLanguageCode);
      setPrompts(result.prompts);
      setLoading(false);
    } catch (error) {
      console.error('Error loading writing prompts:', error);
      toast.error('Failed to load writing prompts');
      setLoading(false);
    }
  };

  const getCurrentPrompt = () => prompts[currentPromptIndex];

  const handleResponseChange = (value: string) => {
    // Use prompt index as key instead of level to avoid conflicts
    setResponses(prev => ({ ...prev, [currentPromptIndex.toString()]: value }));
    
    // Count words by splitting on whitespace and filtering empty strings
    const words = value.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCounts(prev => ({ ...prev, [currentPromptIndex.toString()]: words.length }));
  };

  const handleNext = () => {
    if (currentPromptIndex < prompts.length - 1) {
      setCurrentPromptIndex(prev => prev + 1);
    } else {
      completePhase();
    }
  };

  const completePhase = async () => {
    try {
      setLoading(true);
      
      // Raw text only — scoring and the database write happen server-side.
      const result = await submitPhase({
        sessionId,
        phase: 'writing',
        responses,
        targetLanguage: 'English',
      });
      onComplete(result.score);
    } catch (error) {
      console.error('Error evaluating writing phase:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to evaluate writing responses');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-palavox-purple mx-auto mb-4"></div>
        <p>{getTranslation('test.phases.writing.loadingPrompts', 'Loading writing prompts...')}</p>
      </div>
    );
  }

  if (!prompts.length) {
    return <div className="text-center py-8">{getTranslation('test.phases.writing.noPrompts', 'No prompts available')}</div>;
  }

  const currentPrompt = getCurrentPrompt();
  const currentResponse = responses[currentPromptIndex.toString()] || '';
  const currentWordCount = wordCounts[currentPromptIndex.toString()] || 0;

  const getExpectedLength = () => {
    switch (currentPrompt.level) {
      case 'Novice':
        return getTranslation('test.phases.writing.noviceLength', '50-100 words');
      case 'Intermediate':
        return getTranslation('test.phases.writing.intermediateLength', '100-200 words');
      default:
        return getTranslation('test.phases.writing.advancedLength', '200-300 words');
    }
  };

  const getTargetWordCount = () => {
    switch (currentPrompt.level) {
      case 'Novice':
        return { min: 50, target: 100 };
      case 'Intermediate':
        return { min: 100, target: 200 };
      default:
        return { min: 200, target: 300 };
    }
  };

  const getWordCountColor = () => {
    const { min, target } = getTargetWordCount();
    if (currentWordCount < min) return 'text-red-600';
    if (currentWordCount >= min && currentWordCount <= target) return 'text-green-600';
    return 'text-gray-500'; // Beyond target = no bonus
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold mb-2">{getTranslation('test.phases.writing.title', 'Writing')}</h3>
        <p className="text-palavox-slate">
          {getTranslation('test.phases.common.promptOf', 'Prompt {current} of {total}')
            .replace('{current}', (currentPromptIndex + 1).toString())
            .replace('{total}', prompts.length.toString())} • {getTranslation('test.phases.common.level', 'Level')} {currentPrompt.level}
        </p>
      </div>

      <Card>
        <CardHeader>
          <h4 className="text-lg font-semibold">{getTranslation('test.phases.writing.writingPrompt', 'Writing Prompt')}</h4>
        </CardHeader>
        <CardContent>
          {currentPrompt.prompt_english && currentPrompt.prompt_native ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h5 className="font-semibold mb-2 text-blue-900">
                  {getTranslation('test.phases.writing.sideBySide.nativeLabel', 'Instructions in Your Language:')}
                </h5>
                <p className="prose prose-sm whitespace-pre-wrap">{currentPrompt.prompt_native}</p>
                {currentPrompt.instructions_native && (
                  <p className="text-sm text-muted-foreground mt-2 italic">{currentPrompt.instructions_native}</p>
                )}
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h5 className="font-semibold mb-2">
                  {getTranslation('test.phases.writing.sideBySide.englishLabel', 'Instructions in English:')}
                </h5>
                <p className="prose prose-sm whitespace-pre-wrap">{currentPrompt.prompt_english}</p>
                {currentPrompt.instructions_english && (
                  <p className="text-sm text-muted-foreground mt-2 italic">{currentPrompt.instructions_english}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none mb-6 p-4 bg-gray-50 rounded-lg">
              {currentPrompt.prompt}
            </div>
          )}

          <div className="space-y-4">
            <label className="block text-sm font-medium">{getTranslation('test.phases.writing.yourResponse', 'Your Response')}</label>
            <Textarea
              key={currentPromptIndex}
              value={currentResponse}
              onChange={(e) => handleResponseChange(e.target.value)}
              placeholder={getTranslation('test.phases.writing.responsePlaceholder', 'Type your response here...')}
              rows={8}
              className="w-full"
            />
            <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4 mb-4 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-blue-900">
                    {getTranslation('test.phases.writing.expectedLength', 'Target:')} {getExpectedLength()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-bold ${getWordCountColor()}`}>
                    {currentWordCount}
                  </span>
                  <span className="text-sm text-gray-600">words</span>
                  {currentWordCount < getTargetWordCount().min && (
                    <div className="flex items-center gap-2 bg-amber-100 px-3 py-1 rounded-full">
                      <span className="text-sm font-medium text-amber-900">
                        Write {getTargetWordCount().min - currentWordCount} more
                      </span>
                    </div>
                  )}
                  {currentWordCount >= getTargetWordCount().min && currentWordCount < getTargetWordCount().target && (
                    <div className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full">
                      <span className="text-sm font-medium text-green-900">
                        Good! {getTargetWordCount().target - currentWordCount} more for target
                      </span>
                    </div>
                  )}
                  {currentWordCount >= getTargetWordCount().target && (
                    <div className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full">
                      <span className="text-sm font-medium text-blue-900">
                        Target reached!
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <div></div>
            <Button 
              onClick={handleNext}
              disabled={!currentResponse.trim()}
              className="btn-primary"
            >
              {currentPromptIndex === prompts.length - 1 ? 
                getTranslation('test.phases.writing.completePhase', 'Complete Writing Phase') : 
                getTranslation('test.phases.writing.nextPrompt', 'Next Prompt')
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WritingPhase;
