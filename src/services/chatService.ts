import { ChatMessage } from '../types';

type DecideResponse = { ids: string[] };
type AdvisorResponse = { message: ChatMessage; sessionId?: string };

/**
 * Stateless API client. Pass `sessionId` from the active {@link ChatGroup} for trace continuity;
 * use the returned `sessionId` from advisor responses to update the group.
 */
export type LlmSetupPayload = {
  vendor: 'openai' | 'gemini' | 'anthropic';
  openaiKey?: string;
  geminiKey?: string;
  anthropicKey?: string;
};

export type LlmSetupResult = {
  ok: boolean;
  llmConfigured: boolean;
  message?: string;
};

export class ChatService {
  /** Saves vendor + keys into `.env.local` via the local API (dev / localhost only). */
  static async saveLlmSetup(payload: LlmSetupPayload): Promise<LlmSetupResult> {
    const response = await fetch('/api/setup/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as LlmSetupResult & { error?: string };
    if (!response.ok) {
      throw new Error(typeof body.error === 'string' && body.error ? body.error : `Setup failed (${response.status}).`);
    }
    return body;
  }

  private static async callApi<T>(route: string, payload: unknown): Promise<T> {
    const response = await fetch(`/api/chat/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      let message = `Chat API request failed (${response.status}).`;
      try {
        const body = (await response.json()) as { error?: unknown };
        if (typeof body?.error === 'string' && body.error.length > 0) {
          message = body.error;
        }
      } catch {
        /* non-JSON error body */
      }
      throw new Error(message);
    }
    return response.json() as Promise<T>;
  }

  static async getAdvisorResponse(
    advisorId: string,
    history: ChatMessage[],
    sessionId?: string,
  ): Promise<{ message: ChatMessage; sessionId?: string }> {
    const response = await this.callApi<AdvisorResponse>('respond', {
      advisorId,
      history,
      sessionId,
    });
    return {
      message: response.message,
      sessionId: response.sessionId,
    };
  }

  static async decideWhoResponds(
    history: ChatMessage[],
    activeAdvisorIds: string[],
    sessionId?: string,
  ): Promise<string[]> {
    const response = await this.callApi<DecideResponse>('decide', {
      history,
      activeAdvisorIds,
      sessionId,
    });
    return response.ids ?? [];
  }
}
