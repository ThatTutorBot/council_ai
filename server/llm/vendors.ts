/** Which upstream API handles advisor replies / coordinator (native keys; LiteLLM optional for openai only). */

export type LlmVendor = 'openai' | 'gemini' | 'anthropic';

const ALLOWED = new Set<LlmVendor>(['openai', 'gemini', 'anthropic']);

function parseVendor(raw: string | undefined, fallback: LlmVendor): LlmVendor {
  const v = raw?.trim().toLowerCase();
  if (!v) return fallback;
  if (ALLOWED.has(v as LlmVendor)) return v as LlmVendor;
  throw new Error(`Invalid LLM vendor "${raw}". Use openai, gemini, or anthropic.`);
}

/** Per-route vendor, or `LLM_VENDOR` for both, default openai. */
export function resolveAdvisorVendor(): LlmVendor {
  return parseVendor(
    process.env.LLM_VENDOR_ADVISOR ?? process.env.LLM_VENDOR,
    'openai',
  );
}

export function resolveDecideVendor(): LlmVendor {
  return parseVendor(
    process.env.LLM_VENDOR_DECIDE ?? process.env.LLM_VENDOR,
    'openai',
  );
}

export function usesOpenAiAgents(advisor: LlmVendor, decide: LlmVendor): boolean {
  return advisor === 'openai' || decide === 'openai';
}
