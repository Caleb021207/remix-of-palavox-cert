# Phase 2: Conversational Fluency with OpenAI Realtime API

## Overview
Replaced deprecated pronunciation phase with dynamic conversational fluency assessment using OpenAI's Realtime API for natural voice conversations.

## Architecture

### Components

**1. WebSocket Relay Edge Function** (`realtime-conversation`)
- Proxies WebSocket connection to OpenAI Realtime API
- Keeps API key server-side (secure)
- Configures session with conversational AI instructions
- Handles bidirectional audio streaming

**2. Frontend Component** (`ConversationalFluencyPhase`)
- Real-time voice conversation interface
- Audio recording at 24kHz PCM16
- Audio playback with proper queueing
- Transcript display for both user and AI
- Duration tracking and minimum requirements

**3. Audio Utilities** (`RealtimeAudio.ts`)
- `AudioRecorder`: Captures microphone input at 24kHz
- `encodeAudioForAPI`: Converts Float32 to base64 PCM16
- `AudioQueue`: Sequential playback of AI responses with WAV conversion

## Features

### Real-Time Conversation
- **Voice Activity Detection (VAD)**: Server-side turn detection
- **Natural Flow**: AI waits for user to finish speaking
- **Contextual Responses**: AI asks follow-up questions
- **No Manual Triggers**: Automatic turn-taking

### Assessment Criteria
- **Duration**: Minimum 1 minute, recommended 3 minutes
- **Interaction Quality**: Number of meaningful exchanges
- **Scoring**: 
  - 60% based on conversation duration
  - 40% based on number of user turns
  - Encourages extended, natural dialogue

### Audio Pipeline
```
User Speech → AudioRecorder (24kHz) → PCM16 Encoding → Base64
→ WebSocket → OpenAI → Response (Base64 PCM16)
→ WAV Conversion → AudioQueue → Sequential Playback
```

## Implementation Details

### Session Configuration
```javascript
{
  modalities: ["text", "audio"],
  instructions: "Friendly English assessment interviewer...",
  voice: "alloy",
  input_audio_format: "pcm16",
  output_audio_format: "pcm16",
  turn_detection: {
    type: "server_vad",
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 1000
  }
}
```

### Audio Specifications
- **Sample Rate**: 24kHz (both input and output)
- **Format**: PCM16 (16-bit linear PCM)
- **Channels**: Mono (1 channel)
- **Encoding**: Base64 for transmission
- **Playback**: WAV format with proper headers

### WebSocket Events Handled
- `session.created` → Configure session
- `response.audio.delta` → Stream audio chunks
- `conversation.item.input_audio_transcription.completed` → User transcript
- `response.audio_transcript.delta/done` → AI transcript

## User Experience

### Start Flow
1. Click "Start Conversation"
2. Grant microphone permission
3. Wait for connection (1-2 seconds)
4. AI greets user and starts conversation
5. User speaks naturally - AI detects pauses and responds

### During Conversation
- Real-time status indicators:
  - 🔴 Recording: Shows when mic is active
  - 🔵 AI Speaking: Shows when AI is responding
- Live transcript display
- Timer showing elapsed time
- Minimum duration indicator

### End Flow
1. Must have at least 1 minute of conversation
2. Click "End Conversation"
3. Receive immediate score
4. Move to next phase or results

## Testing Checklist

### Audio Quality
- [ ] No audio glitches or distortion
- [ ] Clear voice output from AI
- [ ] Proper microphone capture
- [ ] Sequential playback (no overlapping)

### Conversation Flow
- [ ] AI waits for user to finish speaking
- [ ] Natural turn-taking
- [ ] Contextual follow-up questions
- [ ] Smooth transitions

### Transcript Accuracy
- [ ] User speech transcribed correctly
- [ ] AI responses shown in transcript
- [ ] Timestamps working
- [ ] No missing messages

### Error Handling
- [ ] Microphone permission denied → clear error
- [ ] Connection lost → automatic cleanup
- [ ] WebSocket errors → user notification
- [ ] Audio playback errors → continue with next chunk

## Edge Cases Handled

1. **Microphone Access Denied**
   - Clear error message
   - Doesn't proceed without mic

2. **Connection Lost Mid-Conversation**
   - Automatic cleanup
   - Can retry

3. **Audio Chunk Errors**
   - Skip failed chunk
   - Continue with next (no conversation break)

4. **Short Conversations**
   - Minimum 1 minute enforced
   - Warning if trying to end early

5. **WebSocket Reconnection**
   - Clean state on disconnect
   - User must restart (prevents confusion)

## Security Considerations

### API Key Protection
- ✅ OpenAI key stored in Supabase secrets
- ✅ Never exposed to client
- ✅ Edge function acts as secure proxy

### User Privacy
- ✅ No audio stored permanently
- ✅ Transcripts only in session memory
- ✅ WebSocket connection encrypted (WSS)

## Performance Metrics

### Latency
- **Connection**: ~1-2 seconds
- **Turn Detection**: ~1 second after silence
- **AI Response Start**: ~0.5-1 second
- **End-to-End**: ~2-3 seconds per turn

### Resource Usage
- **Audio Recording**: ~4KB/second
- **Audio Playback**: ~48KB/second
- **WebSocket**: Minimal overhead

## Migration from Pronunciation

### Removed
- ❌ `PronunciationPhase.tsx`
- ❌ `generate-pronunciation-phrases` edge function
- ❌ `TestPhase.Pronunciation` enum value
- ❌ All pronunciation-related UI/translations

### Added
- ✅ `ConversationalFluencyPhase.tsx`
- ✅ `realtime-conversation` edge function
- ✅ `RealtimeAudio.ts` utilities
- ✅ `TestPhase.ConversationalFluency` enum value

### Updated
- ✅ `MultiPhaseTest.tsx`: Uses ConversationalFluency
- ✅ `SinglePhaseTest.tsx`: Updated phase rendering
- ✅ Test flow: 5 phases now (Reading, Listening, Writing, Speaking, Conversational Fluency)

## Cost Estimation

### OpenAI Realtime API
- **Audio Input**: $0.06 per minute
- **Audio Output**: $0.24 per minute
- **3-Minute Conversation**: ~$0.90

### Comparison
- Old Pronunciation: $0.05 per test (simple transcription)
- New Conversational: $0.60-1.20 per test (3-5 minutes)
- **Worth it**: Much better assessment quality

## Future Enhancements (Phase 3)

1. **Multi-Level Difficulty**
   - Adjust conversation complexity based on prior scores
   - Novice: Simple questions, slower pace
   - Advanced: Complex topics, faster pace

2. **Topic Selection**
   - Let users choose conversation topic
   - Travel, business, academic, casual

3. **Accent Variation**
   - Different AI voices (British, American, etc.)
   - Test comprehension across accents

4. **Detailed Feedback**
   - Grammar corrections
   - Vocabulary suggestions
   - Pronunciation tips

5. **Recording Playback**
   - Let users review their conversation
   - Identify improvement areas

## Troubleshooting

### "WebSocket failed to connect"
- Check edge function is deployed
- Verify OpenAI API key is set
- Check network connectivity

### "No audio output"
- Verify AudioContext initialized
- Check browser audio permissions
- Test with different browser

### "AI not responding"
- Check WebSocket connection status
- Verify session configuration sent
- Look at edge function logs

### "Microphone not working"
- Grant mic permissions
- Check browser supports getUserMedia
- Test mic in browser settings

## Deployment

Edge function deploys automatically when code is pushed. No manual steps needed!

**Verify deployment:**
```bash
# Check edge function is live
curl -X GET https://jyvmhtterlpszklhgjwp.supabase.co/functions/v1/realtime-conversation
# Should return "Expected WebSocket connection"
```

## Support Links

- **Edge Function**: https://supabase.com/dashboard/project/jyvmhtterlpszklhgjwp/functions/realtime-conversation
- **OpenAI Realtime Docs**: https://platform.openai.com/docs/guides/realtime
- **WebSocket Testing**: Use browser console to verify connection
