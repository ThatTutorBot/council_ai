import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';
import { start as startHoneyHiveSession, log as logHoneyHiveEvent } from '@honeyhive/logger';
import { ADVISORS } from '../src/types';
import type { AdvisorPersona, ChatMessage } from '../src/types';

dotenv.config({ path: '.env.local' });
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('Missing GEMINI_API_KEY in environment.');
}

const ai = new GoogleGenAI({ apiKey });
const app = express();
const port = Number(process.env.PORT ?? 3001);
const fastModel = process.env.GEMINI_MODEL_FAST ?? 'gemini-3-flash-preview';
const decideModel = process.env.GEMINI_MODEL_DECIDE ?? fastModel;
const honeyHiveApiKey = process.env.HONEYHIVE_API_KEY;
const honeyHiveProject = process.env.HONEYHIVE_PROJECT ?? 'Great Council';
const honeyHiveSource = process.env.HONEYHIVE_SOURCE ?? process.env.NODE_ENV ?? 'dev';

app.use(express.json({ limit: '1mb' }));
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

function sanitizeText(input: unknown): string {
  return typeof input === 'string' ? input.trim().slice(0, 3000) : '';
}

function parseJsonText(text: string): Record<string, unknown> {
  const cleaned = text.trim().replace(/^```json/, '').replace(/```$/, '');
  return JSON.parse(cleaned) as Record<string, unknown>;
}

function advisorById(advisorId: string): AdvisorPersona {
  const advisor = ADVISORS.find((a) => a.id === advisorId);
  if (!advisor) {
    throw new Error(`Unknown advisor id: ${advisorId}`);
  }
  return advisor;
}

async function trackModelCall(params: {
  sessionId?: string;
  eventName: string;
  provider: string;
  model: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  durationMs: number;
}) {
  if (!honeyHiveApiKey) return;
  try {
    await logHoneyHiveEvent({
      apiKey: honeyHiveApiKey,
      project: honeyHiveProject,
      sessionId: params.sessionId,
      source: honeyHiveSource,
      eventName: params.eventName,
      eventType: 'model',
      config: {
        provider: params.provider,
        model: params.model,
      },
      inputs: params.inputs,
      outputs: params.outputs,
      metadata: params.metadata,
      durationMs: params.durationMs,
    });
  } catch (error) {
    console.error('HoneyHive event logging failed:', error);
  }
}

async function startTraceSession(userQuestion: string): Promise<string | undefined> {
  if (!honeyHiveApiKey) return undefined;
  try {
    return await startHoneyHiveSession({
      apiKey: honeyHiveApiKey,
      project: honeyHiveProject,
      source: honeyHiveSource,
      sessionName: `council-${new Date().toISOString()}`,
      inputs: { userQuestion },
      metadata: { app: 'council-ai' },
    });
  } catch (error) {
    console.error('HoneyHive session start failed:', error);
    return undefined;
  }
}

async function generateBilingualResponse(
  advisor: AdvisorPersona,
  history: ChatMessage[],
  traceContext?: {
    sessionId?: string;
    eventName?: string;
  },
): Promise<{ content: string; translation: string }> {
  const model = fastModel;
  const historyStr = history
    .map((m) => `${m.senderName}: ${sanitizeText(m.content)}${m.translation ? ` (${sanitizeText(m.translation)})` : ''}`)
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
  const raw = parseJsonText(result.text ?? '{}');
  const response = {
    content: sanitizeText(raw.content),
    translation: sanitizeText(raw.translation),
  };
  await trackModelCall({
    sessionId: traceContext?.sessionId,
    eventName: traceContext?.eventName ?? 'chat.advisor.response',
    provider: 'google',
    model,
    inputs: {
      advisorId: advisor.id,
      history,
    },
    outputs: response,
    durationMs: Date.now() - startedAt,
  });

  return response;
}

app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.post('/api/chat/respond', async (req, res) => {
  try {
    const advisorId = sanitizeText(req.body?.advisorId);
    const history = ((req.body?.history ?? []) as ChatMessage[]).slice(-20);
    const sessionId = sanitizeText(req.body?.sessionId) || (await startTraceSession(history.at(-1)?.content ?? ''));
    const advisor = advisorById(advisorId);
    const response = await generateBilingualResponse(advisor, history, {
      sessionId,
      eventName: 'chat.advisor.response',
    });
    const message: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      senderId: advisor.id,
      senderName: advisor.shortName,
      avatar: advisor.avatar,
      content: response.content,
      translation: response.translation,
      timestamp: Date.now(),
    };
    res.status(200).json({
      message,
      ...(sessionId ? { sessionId } : {}),
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Request failed' });
  }
});

app.post('/api/chat/decide', async (req, res) => {
  try {
    const sessionId = sanitizeText(req.body?.sessionId) || undefined;
    const history = ((req.body?.history ?? []) as ChatMessage[]).slice(-5);
    const activeAdvisorIds = ((req.body?.activeAdvisorIds ?? []) as string[]).filter((id) =>
      ADVISORS.some((a) => a.id === id),
    );
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
      model: decideModel,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const text = result.text ?? '{"ids": []}';
    const parsed = JSON.parse(text) as { ids?: string[] };
    let ids = (parsed.ids ?? []).filter((id) => activeAdvisorIds.includes(id));
    if (ids.length === 0 && activeAdvisorIds.length > 0 && history.at(-1)?.senderId === 'user') {
      ids = [activeAdvisorIds[Math.floor(Math.random() * activeAdvisorIds.length)]];
    }
    await trackModelCall({
      sessionId,
      eventName: 'chat.decide.responders',
      provider: 'google',
      model: decideModel,
      inputs: {
        history,
        activeAdvisorIds,
      },
      outputs: { ids },
      durationMs: Date.now() - startedAt,
    });
    res.status(200).json({ ids });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Request failed' });
  }
});

app.listen(port, () => {
  console.log(`Council API running on port ${port}`);
});
