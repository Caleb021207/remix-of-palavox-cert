
import { LanguageCode } from '@/config/languages';

// Helper function to extract base language from English variant codes
export function extractBaseLanguageFromVariant(languageCode: LanguageCode): string | undefined {
  if (!languageCode.startsWith('english-for-')) {
    return undefined;
  }
  
  const variantParts = languageCode.split('-for-');
  if (variantParts.length === 2) {
    const languageKey = variantParts[1];
    const languageKeyMap: Record<string, string> = {
      'spanish': 'Spanish',
      'french': 'French', 
      'german': 'German',
      'italian': 'Italian',
      'portuguese': 'Portuguese',
      'russian': 'Russian',
      'ukrainian': 'Ukrainian',
      'chinese': 'Chinese',
      'japanese': 'Japanese',
      'korean': 'Korean',
      'hindi': 'Hindi',
      'vietnamese': 'Vietnamese',
      'indonesian': 'Indonesian',
      'arabic': 'Arabic',
      'persian': 'Persian',
      'urdu': 'Urdu',
      'pashto': 'Pashto',
      'swahili': 'Swahili'
    };
    return languageKeyMap[languageKey];
  }
  
  return undefined;
}
