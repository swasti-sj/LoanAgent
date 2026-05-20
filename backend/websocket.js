import { createClient } from "@deepgram/sdk";
import { generateLLMResponse } from "./services/llm.js";
import { generateSpeech } from "./services/tts.js";
import {
  detectCallOutcome,
  formatOutcomeForLog,
  recordOutcomeInSession,
  createSessionState,
  closeSession,
} from "./services/outcomeDetection.js";
import { v4 as uuidv4 } from "uuid";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

// Store active connections
const activeConnections = new Map();

export async function handleWebSocketConnection(ws, req) {
  const connectionId = uuidv4();

  /**
   * Connection State Management
   * 
   * Maintains all session data for a single WebSocket connection:
   * - conversationHistory: Full chat history for LLM context
   * - audioBuffer: Buffered audio chunks for ASR processing
   * - isRecording: Current recording state
   * - sessionState: Structured outcome tracking (calls, outcomes, timestamps)
   */
  const connectionState = {
    id: connectionId,
    conversationHistory: [],
    audioBuffer: [],
    isRecording: false,
    // Structured outcome tracking lives inside sessionState:
    // { conversationHistory: [], callOutcome: {}, timestamps: [] }
    sessionState: createSessionState(connectionId),
  };

  activeConnections.set(connectionId, connectionState);

  console.log(`✅ Connected: ${connectionId}`);

  // Welcome message
  ws.send(
    JSON.stringify({
      type: "system",
      message: "Connected to Loan Collection Agent. Click start to begin.",
    })
  );

  ws.on("message", async (data) => {
    try {
      let message;

      try {
        message = JSON.parse(data);
      } catch {
        // If not JSON, treat as raw audio
        message = {
          type: "audio",
          data,
        };
      }

      if (message.type === "audio") {
        // Buffer the audio chunk instead of processing immediately
        connectionState.audioBuffer.push(data);
        console.log(
          `📦 Audio chunk received: ${data.byteLength} bytes (total: ${connectionState.audioBuffer.reduce((a, b) => a + b.byteLength, 0)} bytes)`
        );
      }

      if (message.type === "start") {
        connectionState.isRecording = true;
        connectionState.audioBuffer = [];
        console.log("🎙️ Recording started");

        ws.send(
          JSON.stringify({
            type: "status",
            status: "listening",
          })
        );
      }

      if (message.type === "end") {
        connectionState.isRecording = false;
        console.log("⏹️ Recording ended");

        ws.send(
          JSON.stringify({
            type: "status",
            status: "processing",
          })
        );

        // Process the complete audio buffer
        if (connectionState.audioBuffer.length > 0) {
          const completeAudio = Buffer.concat(connectionState.audioBuffer);
          console.log(
            `🔊 Processing ${connectionState.audioBuffer.length} audio chunks: ${completeAudio.byteLength} bytes total`
          );
          await handleAudioChunk(ws, connectionState, completeAudio);
          connectionState.audioBuffer = [];
        }
      }
    } catch (error) {
      console.error("❌ Message Processing Error:", error);

      ws.send(
        JSON.stringify({
          type: "error",
          error: error.message,
        })
      );
    }
  });

  ws.on("close", () => {
    console.log(`📴 Disconnected: ${connectionId}`);

    // ========================================
    // SESSION FINALIZATION - Outcome Tracking
    // ========================================
    // Close the session and prepare data for storage
    const finalizedSession = closeSession(connectionState.sessionState);

    if (finalizedSession.callOutcome && finalizedSession.callOutcome.status) {
      console.log("\n🎯 FINAL CALL OUTCOME:");
      console.log(`   Status: ${finalizedSession.callOutcome.status}`);
      console.log(
        `   Confidence: ${(finalizedSession.callOutcome.confidence * 100).toFixed(0)}%`
      );
      console.log(`   Reason: ${finalizedSession.callOutcome.reason}`);
      console.log(`   Timestamp: ${finalizedSession.callOutcome.timestamp}`);

      console.log(
        `   Total messages: ${finalizedSession.conversationHistory.length}`
      );
      console.log(
        `   Duration: ${finalizedSession.durationSeconds.toFixed(0)} seconds\n`
      );

      // In a production system, this would be sent to:
      // - Database for compliance tracking
      // - Analytics service for reporting
      // - CRM system for follow-up actions
      // - Audit logs for regulatory compliance
    }

    activeConnections.delete(connectionId);
  });

  ws.on("error", (error) => {
    console.error(`⚠️ WebSocket Error:`, error);
  });
}

async function handleAudioChunk(ws, connectionState, audioBuffer) {
  try {
    console.log("🎤 Starting ASR processing...");

    // Deepgram v3 SDK - use listen.prerecorded.transcribeFile
    const response = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: 'nova-2',
        smart_format: true,
        language: 'en',
      }
    );

    // Extract transcript from v3 response
    let transcript = "";
    
    try {
      // Direct path access (structure confirmed from Deepgram v3)
      transcript = response.result.results.channels[0].alternatives[0].transcript || "";
    } catch (parseError) {
      console.log("⚠️ Error parsing transcript path:", parseError.message);
      console.log("Response structure:", JSON.stringify(response, null, 2));
    }

    if (!transcript?.trim()) {
      console.log("⚠️ No transcript detected (silent audio)");
      ws.send(JSON.stringify({ type: "error", error: "No speech detected. Please try again." }));
      ws.send(JSON.stringify({ type: "status", status: "ready" }));
      return;
    }

    console.log(`✅ Transcript: "${transcript}"`);

    // Send transcript to frontend
    ws.send(JSON.stringify({ type: "transcription", text: transcript }));

    // Store user message
    connectionState.conversationHistory.push({ role: "user", content: transcript });

    console.log("🤖 Generating LLM response...");

    // Generate AI response
    const agentResponse = await generateLLMResponse(transcript, connectionState.conversationHistory);

    console.log(`✅ Agent response: "${agentResponse}"`);

    // Store assistant message
    connectionState.conversationHistory.push({ role: "assistant", content: agentResponse });

    // Send text response
    ws.send(JSON.stringify({ type: "response", text: agentResponse }));

    // Store into sessionState conversationHistory for compliance tracking
    connectionState.sessionState.conversationHistory.push(
      { role: "user", content: transcript },
      { role: "assistant", content: agentResponse }
    );

    // ========================================

    // OUTCOME DETECTION - Core Feature
    // ========================================
    // Detects loan collection outcomes (payment_completed, promise_to_pay, etc.)
    // This enables structured tracking of call results for analytics and compliance
    try {
      console.log("🔍 Analyzing conversation for outcomes...");
      const outcome = await detectCallOutcome(
        transcript,
        agentResponse,
        connectionState.conversationHistory
      );

      // Log outcome if detected
      if (outcome.status !== "no_outcome") {
        console.log("\n" + formatOutcomeForLog(outcome) + "\n");

        // Record in session state for compliance/analytics
        recordOutcomeInSession(connectionState.sessionState, outcome);

        // Send outcome to frontend for display
        ws.send(
          JSON.stringify({
            type: "outcome",
            status: outcome.status,
            promisedDate: outcome.promisedDate,
            reason: outcome.reason,
            confidence: outcome.confidence,
          })
        );

        // Deterministic backend acknowledgement:
        // This keeps acknowledgement reliable even when the LLM response format varies.
        const acknowledgementByStatus = {
          payment_completed: "Thank you for settling the payment. Your account is now updated.",
          promise_to_pay: `Thank you. I’ve noted your commitment to pay ${outcome.promisedDate || "soon"}.`,
          callback_requested: `No problem. I’ll schedule a callback for ${outcome.promisedDate || "a suitable time"}.`,
          dispute: "I understand your concern. I’ll escalate this to our supervisor who can review your account in detail.",
          unable_to_pay: "I appreciate your honesty. Let’s explore options or schedule a better time to discuss this.",
        };

        const acknowledgementText = acknowledgementByStatus[outcome.status];
        if (acknowledgementText) {
          console.log("\n🗣️ Backend acknowledgement:");
          console.log(acknowledgementText);

          // Natural flow: add acknowledgement as an assistant message
          connectionState.conversationHistory.push({
            role: "assistant",
            content: acknowledgementText,
          });

          ws.send(
            JSON.stringify({
              type: "response",
              text: acknowledgementText,
            })
          );
        }
      }
    } catch (outcomeError) {
      console.warn("⚠️ Outcome detection failed (non-critical):", outcomeError.message);
    }

    // Try to generate TTS (optional, non-blocking)
    try {
      console.log("🔊 Generating TTS...");
      const audioBufferResponse = await generateSpeech(agentResponse);

      if (audioBufferResponse && audioBufferResponse.length > 0) {
        console.log(`📤 Sending audio: ${audioBufferResponse.byteLength} bytes`);
        ws.send(audioBufferResponse);
      }
    } catch (ttsError) {
      console.warn("⚠️ TTS generation failed (non-critical):", ttsError.message);
    }

    ws.send(JSON.stringify({ type: "status", status: "ready" }));
  } catch (error) {
    console.error("❌ Audio Processing Error:", error);
    ws.send(JSON.stringify({ type: "error", error: error.message || "Failed to process audio" }));
    ws.send(JSON.stringify({ type: "status", status: "error" }));
  }
}
