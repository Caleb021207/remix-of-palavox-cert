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

export async function evaluatePhaseResponses(
  phase: TestPhase,
  responses: Record<string, any>,
  content?: any,
  languageCode?: LanguageCode
): Promise<any> {
  try {
    const config = languageCode ? languages[languageCode] : null;
    const targetLanguage = config?.targetLanguage || 'English';
    
    console.log(`🧪 Evaluating ${phase} phase responses:`, {
      phase,
      responseKeys: Object.keys(responses),
      contentProvided: !!content,
      language: targetLanguage
    });

    // SPECIAL HANDLING for Writing: use validator/scorer split
    if (phase === TestPhase.Writing) {
      console.log('✍️ Evaluating writing with validator/scorer split...');
      
      // Step 1: Fast validation (language, length)
      const allResponses = Object.values(responses).join(' ');
      const validationResponse = await supabase.functions.invoke('validate-writing', {
        body: {
          response: allResponses,
          targetLanguage
        }
      });

      if (validationResponse.error) {
        console.error('❌ Validation function error:', validationResponse.error);
        throw validationResponse.error;
      }
      
      const validatorResult = validationResponse.data;
      console.log('✅ Validation result:', validatorResult);

      // Step 2: Detailed rubric scoring
      const scoringResponse = await supabase.functions.invoke('score-writing', {
        body: {
          response: allResponses,
          validatorResult,
          targetLevel: 'B1'
        }
      });

      if (scoringResponse.error) {
        console.error('❌ Scoring function error:', scoringResponse.error);
        throw scoringResponse.error;
      }
      
      const scoringResult = scoringResponse.data;
      console.log('✅ Scoring result:', scoringResult);
      
      return {
        score: scoringResult.score,
        feedback: {
          traits: scoringResult.traits,
          notes: scoringResult.notes,
          recommendedCEFR: scoringResult.recommendedCEFR,
          lengthAdjustment: scoringResult.lengthAdjustment,
          validatorFlags: validatorResult.flags
        }
      };
    }

    // For other phases (Comprehension, Conversation), use existing logic
    const response = await supabase.functions.invoke('evaluate-test-responses', {
      body: {
        phase,
        responses,
        content,
        targetLanguage
      }
    });

    if (response.error) {
      console.error('❌ Phase evaluation error:', response.error);
      throw response.error;
    }

    console.log('✅ Phase evaluation completed:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error evaluating phase responses:', error);
    throw error;
  }
}

export async function savePhaseResult(result: Omit<PhaseResult, 'id'>): Promise<string> {
  try {
    // Store phase results in event_logs since test_phase_results doesn't exist in new schema
    const { data, error } = await supabase
      .from('event_logs')
      .insert({
        session_id: result.sessionId,
        event_type: 'phase_result',
        payload: {
          phase: result.phase,
          score: result.score,
          responses: result.responses,
          feedback: result.feedback,
          completed_at: result.completedAt.toISOString()
        } as any,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error saving phase result:', error);
    throw error;
  }
}

export async function updateTestSession(sessionId: string, updates: Partial<TestSession>): Promise<void> {
  try {
    const updateData: any = {};
    
    if (updates.endTime) updateData.completed_at = updates.endTime.toISOString();
    if (updates.status) updateData.status = updates.status;
    
    // Store extended data in metadata
    const metadata: any = {};
    if (updates.currentPhase) metadata.current_phase = updates.currentPhase;
    if (updates.phaseScores) metadata.phase_scores = updates.phaseScores;
    if (updates.score !== undefined) metadata.score = updates.score;
    if (updates.cefr) metadata.cefr_level = updates.cefr;
    if (updates.actfl) metadata.actfl_level = updates.actfl;
    if (updates.feedback) metadata.feedback = updates.feedback;
    if (updates.language) metadata.language = updates.language;
    
    if (Object.keys(metadata).length > 0) {
      updateData.metadata = metadata;
    }

    const { error } = await supabase
      .from('test_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating test session:', error);
    throw error;
  }
}
  }
}
