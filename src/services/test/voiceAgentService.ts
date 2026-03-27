
import { SpeakingResponse } from '@/types';
import { TARGET_LANGUAGE, BASE_LANGUAGE } from '@/config/languageConfig';

// Start a voice conversation with Eleven Labs agent
export async function startVoiceConversation(agentId: string): Promise<{ conversationId: string }> {
  try {
    const response = await fetch(`${window.location.origin}/functions/v1/voice-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        agentId,
        targetLanguage: TARGET_LANGUAGE,
        baseLanguage: BASE_LANGUAGE
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error starting ${TARGET_LANGUAGE} voice conversation: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return { conversationId: data.conversation_id };
  } catch (error) {
    console.error('Error in startVoiceConversation:', error);
    throw error;
  }
}

// Send a message to the voice conversation
export async function sendMessageToVoiceAgent(
  conversationId: string,
  agentId: string,
  message: string,
  audioData?: string
): Promise<SpeakingResponse> {
  try {
    const response = await fetch(`${window.location.origin}/functions/v1/voice-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        conversationId,
        agentId,
        userMessage: message,
        audioData,
        targetLanguage: TARGET_LANGUAGE,
        baseLanguage: BASE_LANGUAGE
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error sending message: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return { 
      conversationId,
      userMessage: data.userMessage,
      agentResponse: data.message || '',
      audioUrl: data.audio_url || ''
    };
  } catch (error) {
    console.error('Error in sendMessageToVoiceAgent:', error);
    throw error;
  }
}
