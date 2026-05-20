/**
 * Outcome Detection Service
 * 
 * Detects and classifies loan collection call outcomes from customer responses.
 * Uses LLM-based classification with rule-based fallback for reliability.
 * 
 * Supported Outcomes:
 * - payment_completed: Customer has paid the outstanding amount
 * - promise_to_pay: Customer promises to pay by a specific date
 * - callback_requested: Customer requests a callback at a later time
 * - dispute: Customer disputes the loan/charges
 * - unable_to_pay: Customer indicates inability to pay
 * 
 * Production Considerations:
 * - No sensitive data (OTP, CVV, PIN) is processed or stored
 * - Outcomes are timestamped for compliance tracking
 * - Structured format enables downstream analytics and reporting
 */

import OpenAI from "openai";

// Outcome detection uses OpenRouter-compatible OpenAI client.
// Keeping this aligned with services/llm.js reduces dependency issues.
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.FRONTEND_URL,
    "X-Title": "Loan Collection Agent",
  },
});


/**
 * Detects the loan collection call outcome from customer response
 * 
 * @param {string} userMessage - The latest customer message
 * @param {string} agentResponse - The agent's response (context for understanding the conversation)
 * @param {Array} conversationHistory - Full conversation history for context
 * @returns {Promise<Object>} Structured outcome object
 * 
 * @example
 * const outcome = await detectCallOutcome(
 *   "I'll pay tomorrow",
 *   "Thank you for that information",
 *   conversationHistory
 * );
 * // Returns: { status: "promise_to_pay", promisedDate: "tomorrow", notes: "...", timestamp: "..." }
 */
export async function detectCallOutcome(
  userMessage,
  agentResponse,
  conversationHistory = []
) {
  try {
    // Construct context from conversation history
    const conversationContext = conversationHistory
      .slice(-5) // Last 5 messages for context
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    // Prepare LLM prompt for outcome classification
    const classificationPrompt = `
You are a loan collection call analyzer. Analyze the customer's message and determine the call outcome.

Conversation Context:
${conversationContext}

Latest Customer Message: "${userMessage}"

Classify the outcome as ONE of these statuses:
1. payment_completed - Customer has completed the payment
2. promise_to_pay - Customer promises to pay by a specific date
3. callback_requested - Customer EXPLICITLY requests a callback (e.g., "call me back", "please reschedule", "call me later"). Do NOT classify as callback_requested for vague responses or customer questions.
4. dispute - Customer disputes the loan or charges
5. unable_to_pay - Customer indicates they cannot pay
6. no_outcome - No clear outcome detected (use this for greetings, questions, or unclear statements)

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "status": "one_of_the_above",
  "promisedDate": "date_if_applicable_or_null",
  "reason": "brief_reason_for_classification",
  "confidence": 0.95
}

Important: 
- NEVER include sensitive information like account numbers, OTPs, or PINs in your response.
- Only classify as callback_requested if customer EXPLICITLY requests to be called back later.
- For greetings like "Hello" or "Hi", classify as no_outcome.
- For uncertain responses like "What am I supposed to do?", classify as no_outcome.
`;

    // Call LLM for classification
    const response = await openai.chat.completions.create({
      model: "openai/gpt-3.5-turbo",
      max_tokens: 200,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: classificationPrompt,
        },
      ],
      // We want strict JSON output; classificationPrompt already enforces this.
    });


    // Extract JSON response
    const responseTextRaw =
      response?.choices?.[0]?.message?.content ||
      response?.content?.[0]?.text ||
      response?.output_text ||
      "";

    const responseText = String(responseTextRaw).trim();

    // If the model returned nothing, throw so we hit the fallback rule-based detector.
    if (!responseText) {
      throw new Error("Empty outcome classification response");
    }

    const outcome = JSON.parse(responseText);


    // Validate outcome structure
    if (!outcome.status) {
      return createNoOutcomeResponse();
    }

    // Build structured response
    return {
      status: outcome.status,
      promisedDate: outcome.promisedDate || null,
      reason: outcome.reason || "Outcome detected",
      confidence: outcome.confidence || 0.8,
      timestamp: new Date().toISOString(),
      detectionMethod: "llm", // For analytics: distinguish LLM vs rule-based
    };
  } catch (error) {
    console.warn("⚠️ LLM outcome detection failed:", error.message);
    // Fallback to rule-based detection
    return detectCallOutcomeRuleBased(userMessage);
  }
}

/**
 * Rule-based fallback outcome detection
 * Uses keyword matching for reliability when LLM fails
 * 
 * @param {string} userMessage - Customer message to analyze
 * @returns {Object} Structured outcome object
 */
function detectCallOutcomeRuleBased(userMessage) {
  const message = userMessage.toLowerCase();

  // Rule: Payment Completed
  if (
    /paid|payment\s*(done|complete|processed|sent)/i.test(message) &&
    !/will|would|promise/i.test(message)
  ) {
    return {
      status: "payment_completed",
      promisedDate: null,
      reason: "Payment completion keywords detected",
      confidence: 0.7,
      timestamp: new Date().toISOString(),
      detectionMethod: "rule_based",
    };
  }

  // Rule: Promise to Pay
  const promiseMatch = message.match(
    /(?:pay|will\s+pay|promise.*?pay|guarantee.*?pay)\s+(?:by\s+)?(tomorrow|next\s+(?:week|month|day)|on\s+[\w\s]+|soon)/i
  );
  if (promiseMatch) {
    return {
      status: "promise_to_pay",
      promisedDate: promiseMatch[1] || "specified",
      reason: "Promise to pay detected with date",
      confidence: 0.8,
      timestamp: new Date().toISOString(),
      detectionMethod: "rule_based",
    };
  }

  // Rule: Callback Requested
  // Only match explicit callback requests (e.g., "call me back", "reschedule", "schedule a callback")
  // Avoid false positives from vague mentions of "later"
  if (/(?:call\s+(?:me\s+)?back|reschedule|schedule.*callback|call.*later|ring.*back)/i.test(message)) {
    return {
      status: "callback_requested",
      promisedDate: null,
      reason: "Callback request detected",
      confidence: 0.75,
      timestamp: new Date().toISOString(),
      detectionMethod: "rule_based",
    };
  }

  // Rule: Dispute
  if (/dispute|wrong|incorrect|not\s+mine|error|fraudulent/i.test(message)) {
    return {
      status: "dispute",
      promisedDate: null,
      reason: "Dispute indicated",
      confidence: 0.7,
      timestamp: new Date().toISOString(),
      detectionMethod: "rule_based",
    };
  }

  // Rule: Unable to Pay
  if (/can't|cannot|unable|don't\s+have|no\s+money|financial\s+difficulty/i.test(message)) {
    return {
      status: "unable_to_pay",
      promisedDate: null,
      reason: "Inability to pay indicated",
      confidence: 0.75,
      timestamp: new Date().toISOString(),
      detectionMethod: "rule_based",
    };
  }

  // No clear outcome
  return createNoOutcomeResponse();
}

/**
 * Creates a "no outcome detected" response object
 * @returns {Object} Outcome object with no_outcome status
 */
function createNoOutcomeResponse() {
  return {
    status: "no_outcome",
    promisedDate: null,
    reason: "No clear outcome detected",
    confidence: 0.0,
    timestamp: new Date().toISOString(),
    detectionMethod: "none",
  };
}

/**
 * Formats outcome for logging
 * @param {Object} outcome - The outcome object
 * @returns {string} Formatted outcome string for console logging
 */
export function formatOutcomeForLog(outcome) {
  if (outcome.status === "no_outcome") {
    return "No outcome detected";
  }

  let logString = `📌 Call Outcome Detected\n`;
  logString += `   Status: ${outcome.status}\n`;

  if (outcome.promisedDate) {
    logString += `   Promised Date: ${outcome.promisedDate}\n`;
  }

  logString += `   Reason: ${outcome.reason}\n`;
  logString += `   Confidence: ${(outcome.confidence * 100).toFixed(0)}%\n`;
  logString += `   Time: ${outcome.timestamp}\n`;
  logString += `   Method: ${outcome.detectionMethod}`;

  return logString;
}

/**
 * Session state management for call outcomes
 * Tracks all outcomes detected during a single call
 * 
 * @typedef {Object} SessionState
 * @property {Array} conversationHistory - Array of {role, content} objects
 * @property {Array} outcomes - Array of detected outcomes with timestamps
 * @property {Object} primaryOutcome - The main outcome of the call
 * @property {string} sessionId - Unique identifier for this call
 * @property {string} startTime - ISO timestamp when call started
 * @property {string} endTime - ISO timestamp when call ended
 * @property {number} totalMessages - Count of messages exchanged
 */

/**
 * Creates a new session state object
 * @param {string} sessionId - Unique session identifier
 * @returns {Object} Initialized session state
 */
export function createSessionState(sessionId) {
  return {
    // Beginner-friendly session state:
    // - conversationHistory: Full messages for agent context (LLM)
    // - callOutcome: Last / primary detected outcome (for analytics)
    // - timestamps: Array of outcome detection timestamps
    conversationHistory: [],
    callOutcome: {},
    timestamps: [],

    sessionId,
    startTime: new Date().toISOString(),
    endTime: null,

    // Keep counters without storing sensitive customer data
    totalMessages: 0,
  };
}

/**
 * Records an outcome in session state
 * Maintains chronological order and updates primary outcome if more definitive
 * 
 * @param {Object} sessionState - The session state to update
 * @param {Object} outcome - The outcome to record
 */
export function recordOutcomeInSession(sessionState, outcome) {
  if (!outcome || outcome.status === "no_outcome") return;

  // 1) Update the structured outcome (single primary/latest outcome)
  //    Why: beginner-friendly + easy to consume for compliance analytics.
  sessionState.callOutcome = {
    status: outcome.status,
    promisedDate: outcome.promisedDate || null,
    reason: outcome.reason,
    confidence: outcome.confidence,
    detectionMethod: outcome.detectionMethod,
    timestamp: outcome.timestamp,
  };

  // 2) Store timestamps for auditing (required shape)
  if (!Array.isArray(sessionState.timestamps)) {
    sessionState.timestamps = [];
  }
  sessionState.timestamps.push(outcome.timestamp);
}

/**
 * Closes a session and finalizes outcome data
 * @param {Object} sessionState - The session to close
 * @returns {Object} Finalized session data for storage/analytics
 */
export function closeSession(sessionState) {
  sessionState.endTime = new Date().toISOString();

  return {
    ...sessionState,
    durationSeconds:
      (new Date(sessionState.endTime) - new Date(sessionState.startTime)) /
      1000,
    outcomesDetected: Array.isArray(sessionState.timestamps)
      ? sessionState.timestamps.length
      : 0,
  };
}
