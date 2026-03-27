
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useUILanguage } from '@/contexts/UILanguageContext';

interface ReadingContentProps {
  prompt: string;
  level: string;
}

const ReadingContent: React.FC<ReadingContentProps> = ({ prompt, level }) => {
  const { t } = useUILanguage();

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

  return (
    <Card>
      <CardHeader>
        <h4 className="text-lg font-semibold">{getTranslation('test.phases.reading.readingPassage', 'Reading Passage')}</h4>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none mb-6 p-4 bg-gray-50 rounded-lg">
          {prompt}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReadingContent;
