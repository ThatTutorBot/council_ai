import Anthropic from '@anthropic-ai/sdk';
import { ADVISORS } from '../../src/types';
import type { AdvisorPersona, ChatMessage } from '../../src/types';
import type { BilingualResponse } from '../agents/schemas';
import type { TrackModelCall } from './contracts';

function sanitizeText(input: unknown): string {
  return typeof input === 'string' ? input.trim().slice(0, 3000) : '';
}

function parseJsonFromAssistant(text: string): Record<string, unknown> {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  return JSON.parse(cleaned) as Record<string, unknown>;
}

function assistantText(message: Anthropic.Messages.Message): string {
  const blocks = message.content;
  if (!Array.isArray(blocks)) return '';
  return blocks
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

export async function anthropicGenerateBilingual(
  client: Anthropic,
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

  const prompt = `${advisor.personaInstructions}

ACTUAL CHAT HISTORY:
${historyStr}

You are responding to the latest message in the chat.
Stay in character. Be concise as it is a mobile chat.

Respond with JSON only (no markdown fences):
{
  "content": "Your response in ${advisor.primaryLang === 'zh' ? 'Chinese' : 'English'}",
  "translation": "A brief ${advisor.secondaryLang === 'zh' ? 'Chinese' : 'English'} translation/summary"
}`;

  const startedAt = Date.now();
  const message = await client.messages.create({
    model,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });
  const raw = parseJsonFromAssistant(assistantText(message));
  const response: BilingualResponse = {
    content: sanitizeText(raw.content),
    translation: sanitizeText(raw.translation),
  };

  await trackModelCall({
    sessionId: traceContext?.sessionId,
    eventName: traceContext?.eventName ?? 'chat.advisor.response',
    provider: 'anthropic',
    model,
    inputs: { advisorId: advisor.id, history },
    outputs: response,
    durationMs: Date.now() - startedAt,
  });

  return response;
}

export async function anthropicDecide(
  client: Anthropic,
  model: string,
  history: ChatMessage[],
  activeAdvisorIds: string[],
  sessionId: string | undefined,
  trackModelCall: TrackModelCall,
): Promise<string[]> {
  const advisorContext = ADVISORS.filter((a) => activeAdvisorIds.includes(a.id))
    .map((a) => `${a.id} (${a.shortName}: ${a.title})`)
    .join(', ');

  const prompt = `You are a group chat coordinator.
ADVISORS CURRENTLY IN THE GROUP: ${advisorContext}

CONVERSATION CONTEXT (last messages):
${history.map((m) => `${m.senderName}: ${sanitizeText(m.content)}`).join('\n')}

Decide which advisor(s) should respond next.
If the user spoke last, someone MUST respond. Usually pick 1 or 2 IDs.

Respond with JSON only (no markdown fences):
{"ids": ["zhuge-liang", "cao-cao"]}`;

  const startedAt = Date.now();
  const message = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });
  const raw = parseJsonFromAssistant(assistantText(message));
  const idsRaw = raw.ids;
  const parsedIds = Array.isArray(idsRaw) ? idsRaw.filter((x): x is string => typeof x === 'string') : [];
  let ids = parsedIds.filter((id) => activeAdvisorIds.includes(id));
  if (ids.length === 0 && activeAdvisorIds.length > 0 && history.at(-1)?.senderId === 'user') {
    ids = [activeAdvisorIds[Math.floor(Math.random() * activeAdvisorIds.length)]];
  }

  await trackModelCall({
    sessionId,
    eventName: 'chat.decide.responders',
    provider: 'anthropic',
    model,
    inputs: { history, activeAdvisorIds },
    outputs: { ids },
    durationMs: Date.now() - startedAt,
  });

  return ids;
}
