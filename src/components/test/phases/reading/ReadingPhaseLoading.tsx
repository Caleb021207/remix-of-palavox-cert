
import React from 'react';
import { useUILanguage } from '@/contexts/UILanguageContext';

const ReadingPhaseLoading: React.FC = () => {
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
    <div className="text-center py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-palavox-purple mx-auto mb-4"></div>
      <p>{getTranslation('test.phases.reading.loadingContent', 'Loading content...')}</p>
    </div>
  );
};

export default ReadingPhaseLoading;
