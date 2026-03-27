/**
 * OpenAI Realtime API Connection via WebRTC
 * Uses ephemeral tokens and RTCPeerConnection for audio streaming
 */

export class RealtimeConnection {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private onMessageCallback: (event: any) => void;
  
  constructor(onMessage: (event: any) => void) {
    this.onMessageCallback = onMessage;
    this.audioEl = document.createElement("audio");
    this.audioEl.autoplay = true;
  }

  async connect(targetLanguage: string = 'English'): Promise<void> {
    console.log('🔌 Getting ephemeral token...');
    
    // Get ephemeral token from edge function
    const tokenResponse = await fetch(
      'https://jyvmhtterlpszklhgjwp.supabase.co/functions/v1/get-realtime-token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLanguage })
      }
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to get token: ${error}`);
    }

    const { token } = await tokenResponse.json();
    console.log('✅ Token received, connecting via WebRTC...');

    // Create peer connection
    this.pc = new RTCPeerConnection();

    // Set up remote audio playback
    this.pc.ontrack = (e) => {
      console.log('🎵 Received remote audio track');
      this.audioEl.srcObject = e.streams[0];
    };

    // Add local audio track from microphone
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      this.pc.addTrack(ms.getTracks()[0]);
      console.log('🎤 Local audio track added');
    } catch (error) {
      console.error('❌ Failed to access microphone:', error);
      throw error;
    }

    // Set up data channel for events
    this.dc = this.pc.createDataChannel("oai-events");
    
    this.dc.onopen = () => {
      console.log('📡 Data channel opened');
    };

    this.dc.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        console.log('📥 Event:', event.type);
        
        // Configure session after receiving session.created
        if (event.type === 'session.created') {
          console.log('🎉 Session created, configuring...');
          this.configureSession();
        }
        
        this.onMessageCallback(event);
      } catch (error) {
        console.error('Failed to parse data channel message:', error);
      }
    };

    this.dc.onerror = (error) => {
      console.error('❌ Data channel error:', error);
    };

    // Create and set local description
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Exchange SDP with OpenAI
    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-realtime-2025-08-28";
    
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/sdp"
      },
    });

    if (!sdpResponse.ok) {
      const error = await sdpResponse.text();
      throw new Error(`SDP exchange failed: ${error}`);
    }

    const answerSdp = await sdpResponse.text();
    const answer: RTCSessionDescriptionInit = {
      type: "answer",
      sdp: answerSdp,
    };
    
    await this.pc.setRemoteDescription(answer);
    console.log('🟢 WebRTC connection established');
  }

  private configureSession(): void {
    if (!this.dc || this.dc.readyState !== 'open') {
      console.warn('⚠️ Data channel not ready for session config');
      return;
    }

    console.log('⚙️ Configuring session...');
    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: 'You are a friendly AI interviewer conducting an ENGLISH language fluency assessment. You MUST respond ONLY in English at all times. Ask engaging questions about daily life, interests, and experiences. Keep responses concise and conversational.',
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1500
        },
        temperature: 0.8,
        max_response_output_tokens: 300
      }
    };

    this.dc.send(JSON.stringify(sessionConfig));
    console.log('✅ Session configuration sent');
  }

  send(data: any): void {
    if (this.dc?.readyState === 'open') {
      this.dc.send(JSON.stringify(data));
    } else {
      console.warn('⚠️ Data channel not ready');
    }
  }

  close(): void {
    this.dc?.close();
    this.pc?.close();
    this.audioEl.srcObject = null;
    this.dc = null;
    this.pc = null;
  }

  get isOpen(): boolean {
    return this.dc?.readyState === 'open';
  }
}
