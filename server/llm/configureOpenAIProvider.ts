import { setDefaultModelProvider } from '@openai/agents-core';
import { OpenAIProvider, setDefaultOpenAIKey } from '@openai/agents-openai';

function resolveApiKey(hasProxy: boolean): string | undefined {
  if (hasProxy) {
    return process.env.LITELLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  }
  return process.env.OPENAI_API_KEY?.trim() || process.env.LITELLM_API_KEY?.trim();
}

/**
 * Point the OpenAI Agents SDK at an OpenAI-compatible API — including a
 * [LiteLLM](https://docs.litellm.ai/docs/proxy/quick_start) proxy — so `OPENAI_MODEL_*`
 * can be any model name your proxy supports (e.g. `gemini/gemini-2.0-flash`, `openai/gpt-4o-mini`).
 *
 * - With a proxy URL: prefer **`LITELLM_API_KEY`** (LiteLLM master/virtual key), then **`OPENAI_API_KEY`**.
 * - Direct OpenAI only: prefer **`OPENAI_API_KEY`**, then **`LITELLM_API_KEY`**.
 */
export function configureOpenAIProviderFromEnv(): { baseURL?: string } {
  const baseURL = process.env.LITELLM_BASE_URL?.trim() || process.env.OPENAI_BASE_URL?.trim();
  const apiKey = resolveApiKey(Boolean(baseURL));
  if (!apiKey) {
    throw new Error(
      'Missing LLM API key. Set LITELLM_API_KEY (recommended with LiteLLM) or OPENAI_API_KEY.',
    );
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

/** Only wires OpenAI / LiteLLM when at least one route uses the Agents SDK (`openai` vendor). */
export function configureOpenAIProviderIfNeeded(needOpenAiAgents: boolean): { baseURL?: string } {
  if (!needOpenAiAgents) {
    return {};
  }
  return configureOpenAIProviderFromEnv();
}
