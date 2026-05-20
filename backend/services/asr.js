import { createClient } from '@deepgram/sdk';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

async function transcribeAudio(audioBuffer) {
  try {
    // Deepgram v3 SDK - correct format
    const response = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: 'nova-2',
        smart_format: true,
        language: 'en',
      }
    );

   const transcript =
  response.result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

const confidence =
  response.result?.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;

    return { transcript, confidence };
  } catch (error) {
    console.error('❌ Deepgram ASR Error:', error);
    throw new Error('Failed to transcribe audio');
  }
}

export { transcribeAudio };
