
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface SpeakingPromptDisplayProps {
  prompt: string;
  getTranslation: (path: string, fallback: string) => string;
}

const SpeakingPromptDisplay: React.FC<SpeakingPromptDisplayProps> = ({ 
  prompt, 
  getTranslation 
}) => {
  return (
    <Card>
      <CardHeader>
        <h4 className="text-lg font-semibold">
          {getTranslation('test.phases.speaking.speakingPrompt', 'Speaking Prompt')}
        </h4>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none mb-6 p-4 bg-gray-50 rounded-lg">
          {prompt}
        </div>
      </CardContent>
    </Card>
  );
};

export default SpeakingPromptDisplay;
