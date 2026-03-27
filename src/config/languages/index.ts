import { englishForFrenchConfig } from './english-for-french';
import { englishForGermanConfig } from './english-for-german';
import { englishForItalianConfig } from './english-for-italian';
import { englishForPortugueseConfig } from './english-for-portuguese';

// Create generic English language configs for all supported UI languages
const createEnglishConfig = (code: string, name: string, flag: string, baseLanguage: string) => ({
  name: 'English',
  targetLanguage: 'English',
  baseLanguage,
  flag,
  displayName: name,
  grammarTopics: ['Present Simple', 'Past Simple', 'Present Perfect', 'Future Forms', 'Modal Verbs', 'Conditionals', 'Passive Voice', 'Reported Speech'],
  vocabularyTopics: ['Daily Activities', 'Work & Career', 'Travel & Transportation', 'Food & Dining', 'Health & Body', 'Family & Relationships', 'Education', 'Technology'],
  cultureTopics: ['American Culture', 'British Culture', 'Business English', 'Academic English', 'Social Interactions', 'Holidays & Traditions']
});

export const languages = {
  'english-for-spanish': createEnglishConfig('english-for-spanish', 'English (for Spanish speakers)', '🇪🇸', 'Spanish'),
  'english-for-french': englishForFrenchConfig,
  'english-for-vietnamese': createEnglishConfig('english-for-vietnamese', 'English (for Vietnamese speakers)', '🇻🇳', 'Vietnamese'),
  'english-for-indonesian': createEnglishConfig('english-for-indonesian', 'English (for Indonesian speakers)', '🇮🇩', 'Indonesian'),
  'english-for-swahili': createEnglishConfig('english-for-swahili', 'English (for Swahili speakers)', '🇰🇪', 'Swahili'),
  'english-for-german': englishForGermanConfig,
  'english-for-italian': englishForItalianConfig,
  'english-for-portuguese': englishForPortugueseConfig,
  'english-for-russian': createEnglishConfig('english-for-russian', 'English (for Russian speakers)', '🇷🇺', 'Russian'),
  'english-for-ukrainian': createEnglishConfig('english-for-ukrainian', 'English (for Ukrainian speakers)', '🇺🇦', 'Ukrainian'),
  'english-for-chinese': createEnglishConfig('english-for-chinese', 'English (for Chinese speakers)', '🇨🇳', 'Chinese'),
  'english-for-japanese': createEnglishConfig('english-for-japanese', 'English (for Japanese speakers)', '🇯🇵', 'Japanese'),
  'english-for-korean': createEnglishConfig('english-for-korean', 'English (for Korean speakers)', '🇰🇷', 'Korean'),
  'english-for-hindi': createEnglishConfig('english-for-hindi', 'English (for Hindi speakers)', '🇮🇳', 'Hindi'),
  'english-for-arabic': createEnglishConfig('english-for-arabic', 'English (for Arabic speakers)', '🇸🇦', 'Arabic'),
  'english-for-persian': createEnglishConfig('english-for-persian', 'English (for Persian speakers)', '🇮🇷', 'Persian'),
  'english-for-urdu': createEnglishConfig('english-for-urdu', 'English (for Urdu speakers)', '🇵🇰', 'Urdu'),
  'english-for-pashto': createEnglishConfig('english-for-pashto', 'English (for Pashto speakers)', '🇦🇫', 'Pashto'),
} as const;

export type LanguageCode = keyof typeof languages;

export { 
  englishForFrenchConfig,
  englishForGermanConfig,
  englishForItalianConfig,
  englishForPortugueseConfig
};
