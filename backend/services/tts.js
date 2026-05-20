import dotenv from 'dotenv';
dotenv.config();

import { OpenAI } from 'openai';

// TTS Configuration
// Option 1: Use OpenAI TTS (requires separate API key)
// Option 2: Use ElevenLabs (free tier available at https://elevenlabs.io)
// Option 3: Use Google Cloud TTS (free tier available)

const USE_OPENAI_TTS = process.env.OPENAI_API_KEY_TTS ? true : false;
const USE_ELEVENLABS_TTS = process.env.ELEVENLABS_API_KEY ? true : false;

let openaiClient = null;
if (USE_OPENAI_TTS) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY_TTS,
  });
}

async function generateSpeech(text) {
  try {
    // Option 1: OpenAI TTS (if key provided)
    if (USE_OPENAI_TTS && openaiClient) {
      console.log('🔊 Using OpenAI TTS');
      const response = await openaiClient.audio.speech.create({
        model: 'tts-1-hd',
        voice: process.env.TTS_VOICE || 'nova',
        input: text,
        response_format: 'mp3',
      });

      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer);
    }

    // Option 2: ElevenLabs TTS (if key provided)
    if (USE_ELEVENLABS_TTS) {
      console.log('🔊 Using ElevenLabs TTS');
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/oscRKPepfCle4xJixCOI', {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!response.ok) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch (e) {}
        console.error(`ElevenLabs API Status: ${response.status} ${response.statusText}`);
        console.error(`ElevenLabs Error Response: ${errorBody}`);
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}. Check your API key and subscription status.`);
      }

      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer);
    }

    // Fallback: Return a dummy audio buffer (system will log text)
    console.log('⚠️ No TTS service configured. Returning mock audio.');
    console.log(`📝 Text that would be spoken: "${text}"`);
    return Buffer.from([]);

  } catch (error) {
    console.error('❌ TTS Error:', error);
    throw new Error('Failed to generate speech');
  }
}

export { generateSpeech };
