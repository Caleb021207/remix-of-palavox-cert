
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TARGET_LANGUAGE } from '@/config/languageConfig';
import { ACTFLLevel } from '@/types';

interface LevelSelectionProps {
  selectedLevel: ACTFLLevel;
  onSelectLevel: (level: ACTFLLevel) => void;
  onStartTest: () => void;
  testType: string;
}

const LevelSelection: React.FC<LevelSelectionProps> = ({ 
  selectedLevel, 
  onSelectLevel, 
  onStartTest,
  testType
}) => {
  return (
    <div className="container-custom py-16">
      <h1 className="text-3xl font-bold text-center mb-8">Select {TARGET_LANGUAGE} {testType} Level</h1>
      
      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <Card 
          className={`cursor-pointer transition-shadow hover:shadow-lg ${
            selectedLevel === ACTFLLevel.NoviceMid ? 'border-4 border-palavox-gold' : 'border'
          }`}
          onClick={() => onSelectLevel(ACTFLLevel.NoviceMid)}
        >
          <CardContent className="p-5">
            <h2 className="text-xl font-bold mb-3 text-center">Novice</h2>
            <p className="text-center text-sm text-palavox-slate mb-4">
              For beginners who are starting to learn {TARGET_LANGUAGE}.
            </p>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-shadow hover:shadow-lg ${
            selectedLevel === ACTFLLevel.IntermediateMid ? 'border-4 border-palavox-gold' : 'border'
          }`}
          onClick={() => onSelectLevel(ACTFLLevel.IntermediateMid)}
        >
          <CardContent className="p-5">
            <h2 className="text-xl font-bold mb-3 text-center">Intermediate</h2>
            <p className="text-center text-sm text-palavox-slate mb-4">
              For those with basic {TARGET_LANGUAGE} knowledge who can handle simple conversations.
            </p>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-shadow hover:shadow-lg ${
            selectedLevel === ACTFLLevel.AdvancedMid ? 'border-4 border-palavox-gold' : 'border'
          }`}
          onClick={() => onSelectLevel(ACTFLLevel.AdvancedMid)}
        >
          <CardContent className="p-5">
            <h2 className="text-xl font-bold mb-3 text-center">Advanced</h2>
            <p className="text-center text-sm text-palavox-slate mb-4">
              For proficient {TARGET_LANGUAGE} users who can express complex ideas.
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-center mt-8">
        <Button 
          className="btn-primary px-8"
          onClick={onStartTest}
        >
          Start {TARGET_LANGUAGE} {testType} Test
        </Button>
      </div>
    </div>
  );
};

export default LevelSelection;
