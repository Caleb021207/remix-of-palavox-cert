
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, PlayCircle, Database, CheckCircle } from 'lucide-react';
import { needsInitialPopulation } from '@/services/databaseInit';
import { languages, LanguageCode } from '@/config/languages';
import { englishTestVariants, EnglishTestVariant } from '@/config/languages/englishVariants';
import { useUILanguage } from '@/contexts/UILanguageContext';
import EnglishTestCard from './EnglishTestCard';

interface TestSelectionProps {
  onSelectTest: (languageCode?: LanguageCode, englishVariant?: EnglishTestVariant) => void;
  onSelectRealtimeTest: () => void;
  loading?: boolean;
  selectedLanguage: LanguageCode;
}

const TestSelection: React.FC<TestSelectionProps> = ({ 
  onSelectTest, 
  onSelectRealtimeTest, 
  loading = false,
  selectedLanguage 
}) => {
  const { t, setLanguage } = useUILanguage();
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationStatus, setInitializationStatus] = useState<string>('');

  const languageConfig = languages[selectedLanguage];

  const testSelection = t.test.testSelection.english;

  useEffect(() => {
    checkInitializationStatus();
  }, []);

  const checkInitializationStatus = async () => {
    try {
      const needsPopulation = await needsInitialPopulation();
      if (needsPopulation) {
        setIsInitializing(true);
        setInitializationStatus('Setting up question database for the first time...');
        
        const progressMessages = [
          'Generating Spanish grammar questions...',
          'Creating vocabulary assessments...',
          'Building speaking prompts...',
          'Finalizing question variety...',
          'Database ready!'
        ];
        
        let messageIndex = 0;
        const interval = setInterval(() => {
          if (messageIndex < progressMessages.length - 1) {
            setInitializationStatus(progressMessages[messageIndex]);
            messageIndex++;
          } else {
            setInitializationStatus(progressMessages[messageIndex]);
            setIsInitializing(false);
            clearInterval(interval);
          }
        }, 3000);
        
        return () => clearInterval(interval);
      }
    } catch (error) {
      console.error('Error checking initialization status:', error);
    }
  };

  const handleEnglishTestSelect = (variant: EnglishTestVariant) => {
    // Set the UI language to the variant's target language
    setLanguage(variant.uiLanguage as any);
    onSelectTest(undefined, variant);
  };

  const handleRegularTestSelect = () => {
    onSelectTest(selectedLanguage);
  };

  // All tests are English proficiency tests now
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-palavox-purple mb-2">
          {t.test.testSelection.englishTest.pageTitle}
        </h2>
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-2xl">{languageConfig.flag}</span>
          <span className="text-lg text-gray-600">
            {t.test.testSelection.englishTest.subtitle.replace('{language}', languageConfig.baseLanguage)}
          </span>
        </div>
        <p className="text-gray-600">
          {t.test.testSelection.englishTest.description}
        </p>
      </div>

      {/* Assessment Purpose Disclaimer */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-700">
              <p className="font-medium text-blue-900 mb-1">
                Purpose of This Assessment
              </p>
              <p>
                This test is designed for <strong>self-assessment, progress tracking, and placement guidance</strong>. Results may contain inaccuracies and are not official certifications. Our assessments help you understand your approximate proficiency level and guide your learning journey.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {isInitializing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-blue-600 animate-pulse" />
            <div>
              <h3 className="font-medium text-blue-900">{t.test.testSelection.initialization.title}</h3>
              <p className="text-blue-700 text-sm mt-1">{initializationStatus}</p>
              <p className="text-blue-600 text-xs mt-2">
                {t.test.testSelection.initialization.description}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Full Certification Test */}
        <div className="md:col-span-2">
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-palavox-purple">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-palavox-purple" />
                {testSelection.certificationTest}
              </CardTitle>
              <CardDescription>
                {testSelection.multiPhaseAssessment}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="list-disc pl-5 text-gray-600">
                <li>{testSelection.skills.readingComprehension}</li>
                <li>{testSelection.skills.listeningSkills}</li>
                <li>{testSelection.skills.grammarVocabulary}</li>
                <li>{testSelection.skills.writingProficiency}</li>
                <li>{testSelection.skills.speakingAssessment}</li>
              </ul>
              
              <Button 
                onClick={handleRegularTestSelect} 
                className="w-full bg-palavox-purple hover:bg-palavox-purple/90 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Checking Access...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    {testSelection.startTest}
                  </>
                )}
              </Button>
              
              {!isInitializing && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>{testSelection.environmentReady}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TestSelection;
