
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language, TranslationKeys } from '@/translations';

interface UILanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
}

const UILanguageContext = createContext<UILanguageContextType | undefined>(undefined);

interface UILanguageProviderProps {
  children: ReactNode;
}

export const UILanguageProvider = ({ children }: UILanguageProviderProps) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('ui-language');
    // Validate that the saved language exists in our translations
    if (saved && saved in translations) {
      return saved as Language;
    }
    return 'en'; // Default to English
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('ui-language', lang);
  };

  const t = translations[language];

  return (
    <UILanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </UILanguageContext.Provider>
  );
};

export const useUILanguage = () => {
  const context = useContext(UILanguageContext);
  if (context === undefined) {
    throw new Error('useUILanguage must be used within a UILanguageProvider');
  }
  return context;
};
