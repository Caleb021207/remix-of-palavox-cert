import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  if (!OPENAI_API_KEY) {
    return new Response("OpenAI API key not configured", { status: 500 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  let openAISocket: WebSocket | null = null;
  let sessionConfigured = false;

  socket.onopen = () => {
    console.log("Client connected to relay");
    
    // Connect to OpenAI Realtime API with proper authentication
    const url = new URL("wss://api.openai.com/v1/realtime");
    url.searchParams.set("model", "gpt-realtime");
    
    // Create WebSocket with Authorization as a subprotocol
    // This is a workaround since Deno WebSocket doesn't support custom headers
    openAISocket = new WebSocket(url.toString(), [
      "realtime",
      `openai-insecure-api-key.${OPENAI_API_KEY}`,
      "openai-beta.realtime-v1"
    ]);

    openAISocket.onopen = () => {
      console.log("Connected to OpenAI Realtime API");
    };

    openAISocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("OpenAI event type:", data.type);

        // Configure session after receiving session.created
        if (data.type === 'session.created' && !sessionConfigured) {
          sessionConfigured = true;
          console.log("Configuring session...");
          
          openAISocket?.send(JSON.stringify({
            type: 'session.update',
            session: {
              modalities: ["text", "audio"],
              instructions: `You are a friendly English language assessment interviewer conducting a conversational fluency evaluation.

Your role:
- Have a natural, flowing conversation with the test-taker
- Ask follow-up questions based on their responses
- Cover topics: daily life, hobbies, experiences, opinions, future plans
- Adjust complexity based on their proficiency level
- Be encouraging and supportive
- Keep responses concise and conversational
- Avoid yes/no questions - ask open-ended questions

Start by greeting them warmly and asking about their day or a recent experience. Let the conversation flow naturally.`,
              voice: "alloy",
              input_audio_format: "pcm16",
              output_audio_format: "pcm16",
              input_audio_transcription: {
                model: "whisper-1"
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 1500
              },
              temperature: 0.8,
              max_response_output_tokens: 300
            }
          }));
        }

        // Forward all events to client
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(event.data);
        }
      } catch (error) {
        console.error("Error processing OpenAI message:", error);
      }
    };

    openAISocket.onerror = (error) => {
      console.error("OpenAI WebSocket error:", error);
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'error',
          error: 'OpenAI connection error'
        }));
      }
    };

    openAISocket.onclose = () => {
      console.log("OpenAI connection closed");
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("Client event type:", data.type);
      
      // Forward client messages to OpenAI
      if (openAISocket?.readyState === WebSocket.OPEN) {
        openAISocket.send(event.data);
      } else {
        console.warn("OpenAI socket not ready, dropping message");
      }
    } catch (error) {
      console.error("Error processing client message:", error);
    }
  };

  socket.onerror = (error) => {
    console.error("Client WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("Client disconnected");
    openAISocket?.close();
  };

  return response;
});
