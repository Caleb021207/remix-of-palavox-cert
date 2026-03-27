
import { useState } from 'react';
import { ACTFLLevel, TestSession } from '@/types';

export const useLevelSelection = (
  setSession: React.Dispatch<React.SetStateAction<TestSession | null>>
) => {
  const [selectedLevel, setSelectedLevel] = useState<ACTFLLevel>(ACTFLLevel.IntermediateMid);

  const handleSelectLevel = (level: ACTFLLevel) => {
    setSelectedLevel(level);
  };

  const handleConfirmLevel = () => {
    setSession(prevSession => prevSession ? {...prevSession, level: selectedLevel} : null);
  };

  return {
    selectedLevel,
    handleSelectLevel,
    handleConfirmLevel,
  };
};
