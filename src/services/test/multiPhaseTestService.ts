import { supabase } from '@/integrations/supabase/client';
import { TestPhase, TestContent, PhaseResult, TestSession } from '@/types';
import { languages, LanguageCode } from '@/config/languages';
import { extractBaseLanguageFromVariant } from '@/utils/englishVariantUtils';

// Combined comprehension content (reading passages + audio for listening)
export async function generateComprehensionContent(
  languageCode: LanguageCode,
  baseLanguage?: string,
  sessionId?: string,
  section?: 'reading' | 'listening',
  adaptiveMode: boolean = false,
  targetLevel?: string
): Promise<any> {
  try {
    const languageConfig = languages[languageCode];
    const uiLanguage = extractBaseLanguageFromVariant(languageCode) || baseLanguage || 'english';
    const extractedBaseLanguage = languageConfig?.baseLanguage || baseLanguage || 'Spanish';
    
    console.log('📖🎧 Fetching comprehension content:', { 
      languageCode, 
      uiLanguage,
      baseLanguage: extractedBaseLanguage,
      sessionId,
      section
    });
    
    const { data, error } = await supabase.functions.invoke('generate-comprehension-content', {
      body: { 
        uiLanguage: uiLanguage.toLowerCase(),
        baseLanguage: extractedBaseLanguage,
        sessionId,
        section: section || 'reading',
        includeAudio: section === 'listening',
        adaptiveMode,
        targetLevel
      }
    });

    if (error) {
      console.error('Error calling generate-comprehension-content function:', error);
      throw new Error(`Failed to generate comprehension content: ${error.message}`);
    }

    if (!data?.content) {
      console.error('No content returned from generate-comprehension-content function');
      throw new Error('No comprehension content was generated');
    }

    console.log('Comprehension content generated successfully:', data.content.length, 'items');
    return data;
  } catch (error) {
    console.error('Error in generateComprehensionContent:', error);
    throw error;
  }
}

// Legacy aliases for backward compatibility
export const generateReadingContent = generateComprehensionContent;
export const generateListeningContent = generateComprehensionContent;

export async function generateWritingPrompts(
  languageCode?: LanguageCode,
  baseLanguage?: string
): Promise<any> {
  try {
    const languageConfig = languageCode ? languages[languageCode] : null;
    const uiLanguage = languageCode ? extractBaseLanguageFromVariant(languageCode) : 'english';
    const extractedBaseLanguage = languageConfig?.baseLanguage || baseLanguage || 'Spanish';
    
    console.log('✍️ Fetching English writing prompts for UI:', { 
      languageCode, 
      uiLanguage,
      baseLanguage: extractedBaseLanguage
    });
    
    // Content is ALWAYS in English, uiLanguage is for instructions only
    const response = await supabase.functions.invoke('generate-writing-prompts', {
      body: {
        uiLanguage: uiLanguage?.toLowerCase() || 'english',
        baseLanguage: extractedBaseLanguage
      }
    });

    console.log('📦 Raw response from edge function:', response);

    if (response.error) {
      console.error('❌ Edge function returned error:', response.error);
      throw response.error;
    }
    
    if (!response.data) {
      console.error('❌ No data in response:', response);
      throw new Error('No data returned from generate-writing-prompts');
    }
    
    if (!response.data.prompts || response.data.prompts.length === 0) {
      console.error('❌ Empty prompts array:', response.data);
      throw new Error('No prompts generated');
    }
    
    console.log('✅ Writing prompts received:', response.data.prompts.length, 'prompts');
    return response.data;
  } catch (error) {
    console.error('💥 Error generating writing prompts:', error);
    throw error;
  }
}

export async function generatePronunciationPhrases(languageCode?: LanguageCode): Promise<any> {
  try {
    // Extract UI language from variant
    const uiLanguage = languageCode ? extractBaseLanguageFromVariant(languageCode) : 'english';
    
    console.log('🗣️ Fetching English pronunciation phrases for UI:', { 
      languageCode, 
      uiLanguage 
    });
    
    // Content is ALWAYS in English, uiLanguage is for instructions only
    const response = await supabase.functions.invoke('generate-pronunciation-phrases', {
      body: {
        uiLanguage: uiLanguage?.toLowerCase() || 'english'
      }
    });

    if (response.error) throw response.error;
    return response.data;
  } catch (error) {
    console.error('Error generating pronunciation phrases:', error);
    throw error;
  }
}


// Client-side scoring and result writes were removed on purpose.
// Scores and session state are written exclusively by the server-side edge
// functions (start-session, submit-phase, finalize-test) via secureTestService.
