import { GoogleGenAI } from '@google/genai';
import { ADVISORS } from '../../src/types';
import type { AdvisorPersona, ChatMessage } from '../../src/types';
import type { BilingualResponse } from '../agents/schemas';
import type { TrackModelCall } from './contracts';

function sanitizeText(input: unknown): string {
  return typeof input === 'string' ? input.trim().slice(0, 3000) : '';
}

function parseJsonText(text: string): Record<string, unknown> {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```\s*$/g, '');
  return JSON.parse(cleaned) as Record<string, unknown>;
}

export async function geminiGenerateBilingual(
  ai: GoogleGenAI,
  model: string,
  advisor: AdvisorPersona,
  history: ChatMessage[],
  traceContext: { sessionId?: string; eventName?: string } | undefined,
  trackModelCall: TrackModelCall,
): Promise<BilingualResponse> {
  const historyStr = history
    .map(
      (m) =>
        `${m.senderName}: ${sanitizeText(m.content)}${m.translation ? ` (${sanitizeText(m.translation)})` : ''}`,
    )
    .join('\n\n');

  const prompt = `
    ${advisor.personaInstructions}

    ACTUAL CHAT HISTORY:
    ${historyStr}

    You are responding to the latest message in the chat.
    Stay in character. Be concise as it is a mobile chat.

    RESPONSE FORMAT (strictly JSON):
    {
      "content": "Your response in ${advisor.primaryLang === 'zh' ? 'Chinese' : 'English'}",
      "translation": "A brief ${advisor.secondaryLang === 'zh' ? 'Chinese' : 'English'} translation/summary"
    }
  `;

  const startedAt = Date.now();
  const result = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });
  let raw: Record<string, unknown>;
  try {
    raw = parseJsonText(result.text ?? '{}');
  } catch {
    throw new Error(
      'Advisor reply was not valid JSON. Retry, or set GEMINI_MODEL_FAST / GEMINI_MODEL to a JSON-capable model.',
    );
  }
  const response: BilingualResponse = {
    content: sanitizeText(raw.content),
    translation: sanitizeText(raw.translation),
  };

  await trackModelCall({
    sessionId: traceContext?.sessionId,
    eventName: traceContext?.eventName ?? 'chat.advisor.response',
    provider: 'google',
    model,
    inputs: { advisorId: advisor.id, history },
    outputs: response,
    durationMs: Date.now() - startedAt,
  });

  return response;
}

export async function geminiDecide(
  ai: GoogleGenAI,
  model: string,
  history: ChatMessage[],
  activeAdvisorIds: string[],
  sessionId: string | undefined,
  trackModelCall: TrackModelCall,
): Promise<string[]> {
  const advisorContext = ADVISORS.filter((a) => activeAdvisorIds.includes(a.id))
    .map((a) => `${a.id} (${a.shortName}: ${a.title})`)
    .join(', ');

  const prompt = `
      You are a group chat coordinator.
      ADVISORS CURRENTLY IN THE GROUP: ${advisorContext}

      CONVERSATION CONTEXT (last messages):
      ${history.map((m) => `${m.senderName}: ${sanitizeText(m.content)}`).join('\n')}

      Decide which advisor(s) should respond next.
      If user spoke last, someone MUST respond. Usually pick 1 or 2 IDs.

      Output JSON only:
      {
        "ids": ["cao-cao", "zhuge-liang"]
      }
    `;

  const startedAt = Date.now();
  const result = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });
  const text = result.text ?? '{"ids": []}';
  let raw: Record<string, unknown>;
  try {
    raw = parseJsonText(text);
  } catch {
    raw = { ids: [] };
  }
  const idsFromModel = raw.ids;
  const asList = Array.isArray(idsFromModel)
    ? idsFromModel.filter((x): x is string => typeof x === 'string')
    : [];
  let ids = asList.filter((id) => activeAdvisorIds.includes(id));
  if (ids.length === 0 && activeAdvisorIds.length > 0 && history.at(-1)?.senderId === 'user') {
    ids = [activeAdvisorIds[Math.floor(Math.random() * activeAdvisorIds.length)]];
  }

  await trackModelCall({
    sessionId,
    eventName: 'chat.decide.responders',
    provider: 'google',
    model,
    inputs: { history, activeAdvisorIds },
    outputs: { ids },
    durationMs: Date.now() - startedAt,
  });

  return ids;
}
