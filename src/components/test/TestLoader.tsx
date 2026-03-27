
import React from 'react';

interface TestLoaderProps {
  message?: string;
}

const TestLoader: React.FC<TestLoaderProps> = ({ message = 'Loading test content...' }) => {
  return (
    <div className="flex justify-center items-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-palavox-purple"></div>
      <span className="ml-3 text-palavox-purple">{message}</span>
    </div>
  );
};

export default TestLoader;
