
// Audio utilities for real-time conversation handling

// Convert Float32Array audio data to base64 for sending to API
export const encodeAudioForAPI = (float32Array: Float32Array): string => {
  // Convert Float32Array to Int16Array (required for PCM16 format)
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    // Clamp values between -1 and 1 before scaling to int16 range
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  // Convert Int16Array to Uint8Array for encoding
  const uint8Array = new Uint8Array(int16Array.buffer);
  
  // Convert to binary string
  let binary = '';
  const chunkSize = 0x8000; // To avoid call stack size limit
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  // Encode as base64
  return btoa(binary);
};

// Create PCM WAV header and combine with audio data
export const createWavFromPCM = (pcmData: Uint8Array): ArrayBuffer => {
  // Convert PCM bytes to 16-bit samples (handled as a view)
  const dataLength = pcmData.length;
  const wavBuffer = new ArrayBuffer(44 + dataLength); // WAV header is 44 bytes
  
  // Create DataView for writing WAV header
  const view = new DataView(wavBuffer);
  
  // Helper function to write string to DataView
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  // WAV header parameters
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  
  // Write WAV header
  writeString(view, 0, 'RIFF'); // ChunkID
  view.setUint32(4, 36 + dataLength, true); // ChunkSize
  writeString(view, 8, 'WAVE'); // Format
  writeString(view, 12, 'fmt '); // Subchunk1ID
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample
  writeString(view, 36, 'data'); // Subchunk2ID
  view.setUint32(40, dataLength, true); // Subchunk2Size
  
  // Copy PCM data after header
  new Uint8Array(wavBuffer, 44).set(pcmData);
  
  return wavBuffer;
};

// Audio recorder class for capturing microphone input
export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isRecording: boolean = false;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start(): Promise<void> {
    if (this.isRecording) return;
    
    try {
      // Request microphone access with specific constraints for optimal quality
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Create audio context with 24kHz sample rate (required by OpenAI)
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
      
      // Create audio source from microphone stream
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      
      // Create script processor to handle audio data
      // Buffer size 4096 for good balance of latency and performance
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      // Handle audio processing
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };
      
      // Connect the audio nodes
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      this.isRecording = true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop(): void {
    if (!this.isRecording) return;
    
    // Disconnect audio processing chain
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    // Stop and release all media tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.isRecording = false;
  }

  isActive(): boolean {
    return this.isRecording;
  }
}

// Audio queue for managing sequential playback of audio chunks
// Buffers small PCM16 chunks to prevent audio crackling
export class AudioQueue {
  private queue: Uint8Array[] = [];
  private isPlaying: boolean = false;
  private audioContext: AudioContext;
  private onPlayingChange: (playing: boolean) => void;
  private isStopped: boolean = false;
  private accumulationBuffer: Uint8Array = new Uint8Array(0);
  private readonly BUFFER_THRESHOLD = 9600; // 200ms at 24kHz mono PCM16 (24000 * 0.2 * 2 bytes)

  constructor(audioContext: AudioContext, onPlayingChange: (playing: boolean) => void) {
    this.audioContext = audioContext;
    this.onPlayingChange = onPlayingChange;
    console.log('🎵 AudioQueue initialized with buffer threshold:', this.BUFFER_THRESHOLD, 'bytes');
  }

  async addToQueue(audioData: Uint8Array): Promise<void> {
    if (this.isStopped) return;
    
    console.log('📦 Received audio chunk:', audioData.length, 'bytes');
    
    // Accumulate data in buffer
    const newBuffer = new Uint8Array(this.accumulationBuffer.length + audioData.length);
    newBuffer.set(this.accumulationBuffer, 0);
    newBuffer.set(audioData, this.accumulationBuffer.length);
    this.accumulationBuffer = newBuffer;
    
    console.log('📊 Buffer size:', this.accumulationBuffer.length, '/', this.BUFFER_THRESHOLD);
    
    // Only process when we have enough data
    if (this.accumulationBuffer.length >= this.BUFFER_THRESHOLD) {
      console.log('✅ Buffer threshold reached, queuing for playback');
      this.queue.push(this.accumulationBuffer);
      this.accumulationBuffer = new Uint8Array(0);
      
      if (!this.isPlaying) {
        await this.playNext();
      }
    }
  }

  // Flush any remaining buffered audio (call this when stream ends)
  async flush(): Promise<void> {
    if (this.accumulationBuffer.length > 0) {
      console.log('🔄 Flushing remaining buffer:', this.accumulationBuffer.length, 'bytes');
      this.queue.push(this.accumulationBuffer);
      this.accumulationBuffer = new Uint8Array(0);
      
      if (!this.isPlaying) {
        await this.playNext();
      }
    }
  }

  async clear(): Promise<void> {
    this.queue = [];
    this.accumulationBuffer = new Uint8Array(0);
    this.isPlaying = false;
    this.onPlayingChange(false);
  }

  stop(): void {
    this.isStopped = true;
    this.queue = [];
    this.accumulationBuffer = new Uint8Array(0);
    this.isPlaying = false;
    this.onPlayingChange(false);
  }

  resume(): void {
    this.isStopped = false;
  }

  private async playNext(): Promise<void> {
    if (this.isStopped || this.queue.length === 0) {
      this.isPlaying = false;
      this.onPlayingChange(false);
      return;
    }

    this.isPlaying = true;
    this.onPlayingChange(true);
    
    const audioData = this.queue.shift()!;

    try {
      // Convert PCM data to WAV for browser playback
      const wavData = createWavFromPCM(audioData);
      
      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(wavData);
      
      // Create and configure audio source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      // Set up completion callback to play next chunk
      source.onended = () => this.playNext();
      
      // Start playback
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
      // Continue with next segment even if current fails
      this.playNext();
    }
  }
}
