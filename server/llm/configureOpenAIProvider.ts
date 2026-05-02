import { setDefaultModelProvider } from '@openai/agents-core';
import { OpenAIProvider, setDefaultOpenAIKey } from '@openai/agents-openai';

/**
 * Point the OpenAI Agents SDK at an OpenAI-compatible API — including a
 * [LiteLLM](https://docs.litellm.ai/docs/proxy/quick_start) proxy — so `OPENAI_MODEL_*`
 * can be any model name your proxy supports (e.g. `gemini/gemini-2.0-flash`, `openai/gpt-4o-mini`).
 *
 * - If `LITELLM_BASE_URL` or `OPENAI_BASE_URL` is set, the SDK uses that `baseURL` (and `OPENAI_API_KEY` as the key the proxy expects, often a LiteLLM key).
 * - If neither is set, the official OpenAI API is used via `setDefaultOpenAIKey` only.
 */
export function configureOpenAIProviderFromEnv(): { baseURL?: string } {
  const baseURL = process.env.LITELLM_BASE_URL?.trim() || process.env.OPENAI_BASE_URL?.trim();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY in environment.');
  }

  if (baseURL) {
    /** LiteLLM proxies often expose Chat Completions first; set `LITELLM_USE_RESPONSES=true` if your proxy serves the Responses API. */
    const useResponsesEnv =
      process.env.LITELLM_USE_RESPONSES?.trim().toLowerCase() ??
      process.env.OPENAI_USE_RESPONSES?.trim().toLowerCase();
    const useResponses = useResponsesEnv === 'true';

    setDefaultModelProvider(
      new OpenAIProvider({
        apiKey,
        baseURL,
        useResponses,
        cacheResponsesWebSocketModels: false,
      }),
    );
    return { baseURL };
  }

  setDefaultOpenAIKey(apiKey);
  return {};
}
