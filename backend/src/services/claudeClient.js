import Anthropic from '@anthropic-ai/sdk';
import { HUB_CLAUDE_SYSTEM_PROMPT } from '../constants/hubClaudeSystemPrompt.js';

export const CLAUDE_MODEL = 'claude-sonnet-4-5';

const MAX = {
  email: 1024,
  callPrep: 1024,
  brief: 2048,
  whyNow: 256,
};

let warnedMissingKey = false;

function getKey() {
  return process.env.ANTHROPIC_API_KEY?.trim() || '';
}

export function isAnthropicConfigured() {
  return Boolean(getKey());
}

export function logAnthropicConfigWarning() {
  if (!isAnthropicConfigured() && !warnedMissingKey) {
    warnedMissingKey = true;
    console.warn('WARNING: Anthropic API key not set');
  }
}

function getClient() {
  return new Anthropic({ apiKey: getKey() });
}

function textFromResponse(message) {
  if (!message?.content?.length) return '';
  return message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

/**
 * @param {{ userMessage: string, maxTokensKind?: 'email' | 'callPrep' | 'brief' | 'whyNow' }} opts
 */
export async function callHubClaude({ userMessage, maxTokensKind = 'email' }) {
  if (!isAnthropicConfigured()) {
    throw new Error('AI service not configured');
  }
  const max_tokens = MAX[maxTokensKind] ?? MAX.email;
  const client = getClient();
  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens,
    system: HUB_CLAUDE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });
  return textFromResponse(message);
}

export { HUB_CLAUDE_SYSTEM_PROMPT };
