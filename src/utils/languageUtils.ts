
import { TARGET_LANGUAGE } from '@/config/languageConfig';

// Mapping of language names to speech recognition language codes
export const SPEECH_RECOGNITION_LANGUAGES: Record<string, string> = {
  'Spanish': 'es-ES',
  'French': 'fr-FR',
  'German': 'de-DE',
  'Italian': 'it-IT',
  'Portuguese': 'pt-PT',
  'English': 'en-US',
  'Chinese': 'zh-CN',
  'Japanese': 'ja-JP',
  'Korean': 'ko-KR',
  'Russian': 'ru-RU',
  'Arabic': 'ar-SA',
  'Vietnamese': 'vi-VN',
  'Indonesian': 'id-ID',
  'Swahili': 'sw-KE'
};

/**
 * Get the speech recognition language code for the current target language
 */
export const getSpeechRecognitionLanguage = (): string => {
  const languageCode = SPEECH_RECOGNITION_LANGUAGES[TARGET_LANGUAGE];
  
  // Fallback to English if language not found
  if (!languageCode) {
    console.warn(`Speech recognition not configured for ${TARGET_LANGUAGE}, falling back to English`);
    return 'en-US';
  }
  
  return languageCode;
};

/**
 * Get speech recognition language code for a specific language
 */
export const getSpeechRecognitionLanguageForTarget = (language: string): string => {
  const languageCode = SPEECH_RECOGNITION_LANGUAGES[language];
  
  // Fallback to English if language not found
  if (!languageCode) {
    console.warn(`Speech recognition not configured for ${language}, falling back to English`);
    return 'en-US';
  }
  
  return languageCode;
};
