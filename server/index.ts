import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import type { z } from 'zod';
import { run, MaxTurnsExceededError } from '@openai/agents';
import { start as startHoneyHiveSession, log as logHoneyHiveEvent } from '@honeyhive/logger';
import { ADVISORS } from '../src/types';
import type { AdvisorPersona, ChatMessage } from '../src/types';
import { createAdvisorAgents, createCoordinatorAgent } from './agents/councilAgents';
import {
  bilingualResponseSchema,
  decideResponseSchema,
  type BilingualResponse,
  type DecideResponse,
} from './agents/schemas';
import { configureOpenAIProviderFromEnv } from './llm/configureOpenAIProvider';

dotenv.config({ path: '.env.local' });
dotenv.config();

const llmEndpoint = configureOpenAIProviderFromEnv();

const fastModel = process.env.OPENAI_MODEL_FAST ?? process.env.OPENAI_DEFAULT_MODEL ?? 'gpt-4.1-mini';
const decideModel =
  process.env.OPENAI_MODEL_DECIDE ?? process.env.OPENAI_DEFAULT_MODEL ?? fastModel;

const advisorAgents = createAdvisorAgents(fastModel);
const coordinatorAgent = createCoordinatorAgent(decideModel);

const app = express();
const port = Number(process.env.PORT ?? 3001);
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

function advisorById(advisorId: string): AdvisorPersona {
  const advisor = ADVISORS.find((a) => a.id === advisorId);
  if (!advisor) {
    throw new Error(`Unknown advisor id: ${advisorId}`);
  }
  return advisor;
}

function formatHistoryForPrompt(history: ChatMessage[]): string {
  return history
    .map(
      (m) =>
        `${m.senderName}: ${sanitizeText(m.content)}${m.translation ? ` (${sanitizeText(m.translation)})` : ''}`,
    )
    .join('\n\n');
}

function parseStructuredOutput<T>(schema: z.ZodType<T>, raw: unknown, label: string): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid ${label} output from model`);
  }
  return parsed.data;
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
): Promise<BilingualResponse> {
  const agent = advisorAgents.get(advisor.id);
  if (!agent) {
    throw new Error(`No agent configured for advisor: ${advisor.id}`);
  }

  const userTurn = `ACTUAL CHAT HISTORY:

${formatHistoryForPrompt(history)}

You are responding to the latest message in the chat.`;

  const startedAt = Date.now();
  try {
    const result = await run(agent, userTurn, { maxTurns: 10 });
    const structured = parseStructuredOutput(
      bilingualResponseSchema,
      result.finalOutput,
      'advisor response',
    );
    const response: BilingualResponse = {
      content: sanitizeText(structured.content),
      translation: sanitizeText(structured.translation),
    };

    await trackModelCall({
      sessionId: traceContext?.sessionId,
      eventName: traceContext?.eventName ?? 'chat.advisor.response',
      provider: 'openai',
      model: fastModel,
      inputs: {
        advisorId: advisor.id,
        history,
      },
      outputs: response,
      durationMs: Date.now() - startedAt,
    });

    return response;
  } catch (error) {
    if (error instanceof MaxTurnsExceededError) {
      throw new Error('Advisor response exceeded maximum turns; try again.');
    }
    throw error;
  }
}

async function runDecide(
  history: ChatMessage[],
  activeAdvisorIds: string[],
  sessionId: string | undefined,
): Promise<string[]> {
  const advisorContext = ADVISORS.filter((a) => activeAdvisorIds.includes(a.id))
    .map((a) => `${a.id} (${a.shortName}: ${a.title})`)
    .join(', ');

  const userTurn = `ADVISORS CURRENTLY IN THE GROUP: ${advisorContext}

CONVERSATION CONTEXT (last messages):
${history.map((m) => `${m.senderName}: ${sanitizeText(m.content)}`).join('\n')}

Decide which advisor(s) should respond next.
If the user spoke last, someone MUST respond. Usually pick 1 or 2 ids from the active list only.`;

  const startedAt = Date.now();
  try {
    const result = await run(coordinatorAgent, userTurn, { maxTurns: 10 });
    const structured = parseStructuredOutput(decideResponseSchema, result.finalOutput, 'decide');
    const parsed: DecideResponse = { ids: structured.ids ?? [] };

    let ids = (parsed.ids ?? []).filter((id) => activeAdvisorIds.includes(id));
    if (ids.length === 0 && activeAdvisorIds.length > 0 && history.at(-1)?.senderId === 'user') {
      ids = [activeAdvisorIds[Math.floor(Math.random() * activeAdvisorIds.length)]];
    }

    await trackModelCall({
      sessionId,
      eventName: 'chat.decide.responders',
      provider: 'openai',
      model: decideModel,
      inputs: {
        history,
        activeAdvisorIds,
      },
      outputs: { ids },
      durationMs: Date.now() - startedAt,
    });

    return ids;
  } catch (error) {
    if (error instanceof MaxTurnsExceededError) {
      throw new Error('Coordinator exceeded maximum turns; try again.');
    }
    throw error;
  }
}

app.get('/healthz', (_req, res) => {
  res.status(200).json({
    ok: true,
    ...(llmEndpoint.baseURL ? { llmProxy: llmEndpoint.baseURL } : {}),
  });
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
    const ids = await runDecide(history, activeAdvisorIds, sessionId);
    res.status(200).json({ ids });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Request failed' });
  }
});

app.listen(port, () => {
  console.log(`Council API running on port ${port}`);
});
