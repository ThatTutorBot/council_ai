import { ChatMessage } from '../types';

type DecideResponse = { ids: string[] };
type AdvisorResponse = { message: ChatMessage; sessionId?: string };

export class ChatService {
  private static sessionId?: string;

  private static async callApi<T>(route: string, payload: unknown): Promise<T> {
    const response = await fetch(`/api/chat/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const fallback = `Chat API request failed (${response.status}).`;
      try {
        const body = await response.json();
        throw new Error(body?.error ?? fallback);
      } catch {
        throw new Error(fallback);
      }
    }
    return response.json() as Promise<T>;
  }

  static async getAdvisorResponse(advisorId: string, history: ChatMessage[]): Promise<ChatMessage> {
    const response = await this.callApi<AdvisorResponse>('respond', {
      advisorId,
      history,
      sessionId: this.sessionId,
    });
    if (response.sessionId) {
      this.sessionId = response.sessionId;
    }
    return response.message;
  }

  static async decideWhoResponds(history: ChatMessage[], activeAdvisorIds: string[]): Promise<string[]> {
    const response = await this.callApi<DecideResponse>('decide', {
      history,
      activeAdvisorIds,
      sessionId: this.sessionId,
    });
    return response.ids ?? [];
  }
}
