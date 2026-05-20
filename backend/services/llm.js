import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';
import { getCollectionAgentPrompt } from '../prompts/collectionAgent.js';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,


  baseURL: 'https://openrouter.ai/api/v1',

  defaultHeaders: {
    'HTTP-Referer': process.env.FRONTEND_URL,
    'X-Title': 'Loan Collection Agent',
  },
});

async function generateLLMResponse(userMessage, conversationHistory) {
  try {
    // System Prompt
    const systemPrompt = getCollectionAgentPrompt();

    // Conversation messages
    const messages = [
      {
        role: 'system',
        content: systemPrompt,
      },

      ...conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // API call
    const response = await openai.chat.completions.create({
      model: 'openai/gpt-3.5-turbo',

      messages,

      temperature: 0.7,
      max_tokens: 150,
    });

    const agentResponse =
      response.choices?.[0]?.message?.content || '';

    return agentResponse.trim();

  } catch (error) {
    console.error('❌ OpenRouter LLM Error:', error);

    if (error.response) {
      console.error(error.response.data);
    }

    throw new Error('Failed to generate response');
  }
}

export { generateLLMResponse };