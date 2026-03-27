
import { LanguageConfig } from './types.ts';

export function determineLanguages(targetLanguage: string, baseLanguage?: string): LanguageConfig {
  let contentLanguage = targetLanguage;
  let questionLanguage = 'English'; // Default fallback
  
  // For English tests (ESL learners), content should be in English
  if (targetLanguage === 'English' || targetLanguage === 'english') {
    contentLanguage = 'English';
    // Questions should be in the learner's native language
    if (baseLanguage && baseLanguage !== 'ESL learners') {
      questionLanguage = baseLanguage;
      console.log('English test detected - content in English, questions in:', baseLanguage);
    } else {
      // If baseLanguage is not properly set, we need to handle this case
      console.log('English test detected but baseLanguage not properly set:', baseLanguage);
      questionLanguage = 'English'; // Fallback to English if baseLanguage is not available
    }
  } else {
    // For non-English tests, use the target language for both content and questions
    contentLanguage = targetLanguage;
    questionLanguage = baseLanguage || targetLanguage;
  }

  console.log('Language determination result:', { contentLanguage, questionLanguage, targetLanguage, baseLanguage });

  return { contentLanguage, questionLanguage };
}
