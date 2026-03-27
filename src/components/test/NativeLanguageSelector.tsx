import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { languages, LanguageCode } from '@/config/languages';
import { useUILanguage } from '@/contexts/UILanguageContext';
import { Globe } from 'lucide-react';

interface NativeLanguageSelectorProps {
  onSelectLanguage: (languageCode: LanguageCode) => void;
}

const NativeLanguageSelector: React.FC<NativeLanguageSelectorProps> = ({ onSelectLanguage }) => {
  const { t, setLanguage } = useUILanguage();

  // Map language codes to UI language codes
  const languageToUICode: Record<string, string> = {
    'english-for-spanish': 'es',
    'english-for-french': 'fr',
    'english-for-german': 'de',
    'english-for-italian': 'it',
    'english-for-portuguese': 'pt',
    'english-for-russian': 'ru',
    'english-for-ukrainian': 'uk',
    'english-for-chinese': 'zh',
    'english-for-japanese': 'ja',
    'english-for-korean': 'ko',
    'english-for-hindi': 'hi',
    'english-for-vietnamese': 'vi',
    'english-for-indonesian': 'id',
    'english-for-arabic': 'ar',
    'english-for-persian': 'fa',
    'english-for-urdu': 'ur',
    'english-for-pashto': 'ps',
    'english-for-swahili': 'sw',
  };

  const handleLanguageSelect = (languageCode: LanguageCode) => {
    // Set UI language to match the native language
    const uiLangCode = languageToUICode[languageCode] || 'en';
    setLanguage(uiLangCode as any);
    
    // Notify parent component
    onSelectLanguage(languageCode);
  };

  const nativeLanguages = Object.entries(languages).map(([code, config]) => {
    return {
      code: code as LanguageCode,
      name: config.baseLanguage,
      flag: config.flag,
      displayName: config.displayName,
    };
  });

  return (
    <div className="space-y-8">
      <div className="text-center">
        <Globe className="h-16 w-16 mx-auto mb-4 text-palavox-purple" />
        <h2 className="text-3xl font-bold text-palavox-purple mb-2">
          {t.test.nativeLanguageSelection.title}
        </h2>
        <p className="text-xl text-gray-600 mb-2">
          {t.test.nativeLanguageSelection.subtitle}
        </p>
        <p className="text-sm text-gray-500">
          {t.test.nativeLanguageSelection.description}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {nativeLanguages.map((lang) => (
          <Card 
            key={lang.code}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-palavox-purple"
            onClick={() => handleLanguageSelect(lang.code)}
          >
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-3">{lang.flag}</div>
              <h3 className="font-semibold text-sm">{lang.name}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center text-sm text-gray-500 max-w-2xl mx-auto">
        <p>
          {t.test.nativeLanguageSelection.noteDescription}
        </p>
      </div>
    </div>
  );
};

export default NativeLanguageSelector;
