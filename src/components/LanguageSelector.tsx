
import React from 'react';
import { Languages } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useUILanguage } from '@/contexts/UILanguageContext';

const LanguageSelector = () => {
  const { language, setLanguage, t } = useUILanguage();

  console.log('LanguageSelector: t object:', t);
  console.log('LanguageSelector: t.languages:', t?.languages);

  // All available UI languages
  const languageOptions = [
    { code: 'en', flag: '🇺🇸', name: 'English' },
    { code: 'es', flag: '🇪🇸', name: 'Español' },
    { code: 'fr', flag: '🇫🇷', name: 'Français' },
    { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
    { code: 'it', flag: '🇮🇹', name: 'Italiano' },
    { code: 'pt', flag: '🇧🇷', name: 'Português' },
    { code: 'zh', flag: '🇨🇳', name: '中文' },
    { code: 'ja', flag: '🇯🇵', name: '日本語' },
    { code: 'ko', flag: '🇰🇷', name: '한국어' },
    { code: 'ru', flag: '🇷🇺', name: 'Русский' },
    { code: 'ar', flag: '🇸🇦', name: 'العربية' },
    { code: 'hi', flag: '🇮🇳', name: 'हिन्दी' },
    { code: 'vi', flag: '🇻🇳', name: 'Tiếng Việt' },
    { code: 'uk', flag: '🇺🇦', name: 'Українська' },
    { code: 'id', flag: '🇮🇩', name: 'Bahasa Indonesia' },
    { code: 'fa', flag: '🇮🇷', name: 'فارسی' },
    { code: 'ur', flag: '🇵🇰', name: 'اردو' },
    { code: 'ps', flag: '🇦🇫', name: 'پښتو' },
    { code: 'sw', flag: '🇰🇪', name: 'Kiswahili' },
  ];

  const currentLanguage = languageOptions.find(lang => lang.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="text-gray-600 hover:text-palavox-purple"
        >
          <Languages className="h-4 w-4 mr-2" />
          {currentLanguage?.code.toUpperCase() || 'EN'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="bg-white border border-gray-200 shadow-lg z-50"
        align="end"
      >
        {languageOptions.map((lang) => (
          <DropdownMenuItem 
            key={lang.code}
            onClick={() => setLanguage(lang.code as any)}
            className="cursor-pointer hover:bg-gray-50"
          >
            {lang.flag} {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
