import type { LlmVendor } from './vendors';

export function modelForAdvisor(v: LlmVendor): string {
  switch (v) {
    case 'openai':
      return (
        process.env.OPENAI_MODEL_FAST ??
        process.env.OPENAI_DEFAULT_MODEL ??
        'gpt-4.1-mini'
      );
    case 'gemini':
      return process.env.GEMINI_MODEL_FAST ?? process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
    case 'anthropic':
      return (
        process.env.ANTHROPIC_MODEL_FAST ??
        process.env.ANTHROPIC_MODEL ??
        'claude-3-5-sonnet-20241022'
      );
  }
}

export function modelForDecide(v: LlmVendor): string {
  switch (v) {
    case 'openai':
      return (
        process.env.OPENAI_MODEL_DECIDE ??
        process.env.OPENAI_DEFAULT_MODEL ??
        process.env.OPENAI_MODEL_FAST ??
        'gpt-4.1-mini'
      );
    case 'gemini':
      return (
        process.env.GEMINI_MODEL_DECIDE ?? process.env.GEMINI_MODEL ?? process.env.GEMINI_MODEL_FAST ?? 'gemini-2.0-flash'
      );
    case 'anthropic':
      return (
        process.env.ANTHROPIC_MODEL_DECIDE ??
        process.env.ANTHROPIC_MODEL ??
        process.env.ANTHROPIC_MODEL_FAST ??
        'claude-3-5-sonnet-20241022'
      );
  }
}
