
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, PlayCircle } from 'lucide-react';
import { englishTestVariants, EnglishTestVariant } from '@/config/languages/englishVariants';
import { useUILanguage } from '@/contexts/UILanguageContext';

interface EnglishTestCardProps {
  onSelectTest: (variant: EnglishTestVariant) => void;
  loading?: boolean;
}

const EnglishTestCard: React.FC<EnglishTestCardProps> = ({ 
  onSelectTest, 
  loading = false
}) => {
  const { t } = useUILanguage();
  const [selectedVariant, setSelectedVariant] = useState<EnglishTestVariant>(englishTestVariants[0]);

  const handleStartTest = () => {
    onSelectTest(selectedVariant);
  };

  const handleVariantChange = (variantCode: string) => {
    const variant = englishTestVariants.find(v => v.code === variantCode);
    if (variant) {
      setSelectedVariant(variant);
    }
  };

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-palavox-purple">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-palavox-purple" />
          <div className="flex items-center gap-2">
            <span>🇺🇸</span>
            <span>{t?.test?.englishProficiency?.title || 'English Proficiency Test'}</span>
          </div>
        </CardTitle>
        <CardDescription>
          {t?.test?.englishProficiency?.description || 'Comprehensive English language assessment with interface in your native language'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            {t?.test?.englishProficiency?.selectNativeLanguage || 'Select your native language:'}
          </label>
          <Select value={selectedVariant.code} onValueChange={handleVariantChange}>
            <SelectTrigger className="w-full">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <span>{selectedVariant.flag}</span>
                  <span>{selectedVariant.displayName}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto bg-white z-50">
              {englishTestVariants.map((variant) => (
                <SelectItem key={variant.code} value={variant.code} className="bg-white hover:bg-gray-100">
                  <div className="flex items-center gap-2">
                    <span>{variant.flag}</span>
                    <div className="flex flex-col">
                      <span>{variant.displayName}</span>
                      <span className="text-xs text-gray-500">{variant.nativeName}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm text-gray-600 mb-2">{t?.test?.englishProficiency?.testIncludes || 'This test includes:'}</p>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
            <li>{t?.test?.phases?.reading?.title || 'Reading Comprehension'}</li>
            <li>{t?.test?.phases?.listening?.title || 'Listening Skills'}</li>
            <li>{t?.test?.englishProficiency?.grammarVocabulary || 'Grammar and Vocabulary'}</li>
            <li>{t?.test?.phases?.writing?.title || 'Writing Proficiency'}</li>
            <li>{t?.test?.phases?.speaking?.title || 'Speaking Assessment'}</li>
          </ul>
          <p className="text-xs text-blue-600 mt-2">
            ✨ {t?.test?.englishProficiency?.interfaceLanguage?.replace('{language}', selectedVariant.displayName.split('(')[1]?.replace(')', '') || selectedVariant.displayName) || `Test interface will be displayed in ${selectedVariant.displayName.split('(')[1]?.replace(')', '') || selectedVariant.displayName}`}
          </p>
        </div>
        
        <Button 
          onClick={handleStartTest} 
          className="w-full bg-palavox-purple hover:bg-palavox-purple/90 text-white"
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              {t?.common?.checkingAccess || 'Checking Access...'}
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4 mr-2" />
              {t?.test?.englishProficiency?.startTest || 'Start English Test'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EnglishTestCard;
