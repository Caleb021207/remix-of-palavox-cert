
import { useState } from 'react';
import { TestType } from '@/types';

export const useTestTypes = () => {
  const [selectedTest, setSelectedTest] = useState<TestType | null>(null);
  const [testStarted, setTestStarted] = useState(false);
  const [useRealtime, setUseRealtime] = useState(false);

  const handleStartTest = (testType: TestType) => {
    setSelectedTest(testType);
    setTestStarted(true);
  };

  const handleRealtimeTest = () => {
    setUseRealtime(true);
    setSelectedTest(TestType.Speaking);
    setTestStarted(true);
  };

  return {
    selectedTest,
    testStarted,
    useRealtime,
    handleStartTest,
    handleRealtimeTest,
  };
};
