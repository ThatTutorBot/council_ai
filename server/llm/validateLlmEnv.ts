import type { LlmVendor } from './vendors';
import { usesOpenAiAgents } from './vendors';

function openAiClientKeyPresent(): boolean {
  const baseURL = process.env.LITELLM_BASE_URL?.trim() || process.env.OPENAI_BASE_URL?.trim();
  const key = baseURL
    ? process.env.LITELLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()
    : process.env.OPENAI_API_KEY?.trim() || process.env.LITELLM_API_KEY?.trim();
  return Boolean(key);
}

/**
 * Fail fast with clear errors when a vendor is selected but its credential is missing.
 */
export function validateLlmEnv(advisorVendor: LlmVendor, decideVendor: LlmVendor): void {
  if (usesOpenAiAgents(advisorVendor, decideVendor) && !openAiClientKeyPresent()) {
    throw new Error(
      'OpenAI-compatible path selected (LLM_VENDOR / *_ADVISOR / *_DECIDE) but no API key. Set OPENAI_API_KEY, or LITELLM_API_KEY when using LITELLM_BASE_URL.',
    );
  }
  if (advisorVendor === 'gemini' || decideVendor === 'gemini') {
    if (!process.env.GEMINI_API_KEY?.trim()) {
      throw new Error('GEMINI_API_KEY is required when LLM_VENDOR uses gemini for advisor or decide.');
    }
  }
  if (advisorVendor === 'anthropic' || decideVendor === 'anthropic') {
    if (!process.env.ANTHROPIC_API_KEY?.trim()) {
      throw new Error('ANTHROPIC_API_KEY is required when LLM_VENDOR uses anthropic for advisor or decide.');
    }
  }
}
