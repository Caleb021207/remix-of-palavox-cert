
import React from 'react';
import { useUILanguage } from '@/contexts/UILanguageContext';

interface ReadingPhaseProgressProps {
  currentQuestionNumber: number;
  totalQuestions: number;
  currentLevel: string;
}

const ReadingPhaseProgress: React.FC<ReadingPhaseProgressProps> = ({
  currentQuestionNumber,
  totalQuestions,
  currentLevel
}) => {
  const { t } = useUILanguage();

  return (
    <div className="text-center">
      <h3 className="text-xl font-bold mb-2">{t?.test?.phases?.reading?.title || 'Reading'}</h3>
      <p className="text-palavox-slate">
        {t?.test?.phases?.common?.questionOf?.replace('{current}', currentQuestionNumber.toString()).replace('{total}', totalQuestions.toString()) || `Question ${currentQuestionNumber} of ${totalQuestions}`} • {t?.test?.phases?.common?.level || 'Level'} {currentLevel}
      </p>
    </div>
  );
};

export default ReadingPhaseProgress;
