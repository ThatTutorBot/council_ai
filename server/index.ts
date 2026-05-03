import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import type { Request } from 'express';
import rateLimit from 'express-rate-limit';
import type { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
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
import { anthropicDecide, anthropicGenerateBilingual } from './llm/anthropicNative';
import { configureOpenAIProviderIfNeeded } from './llm/configureOpenAIProvider';
import { geminiDecide, geminiGenerateBilingual } from './llm/geminiNative';
import { modelForAdvisor, modelForDecide } from './llm/models';
import {
  type LlmVendor,
  resolveAdvisorVendor,
  resolveDecideVendor,
  usesOpenAiAgents,
} from './llm/vendors';
import { getLlmEnvValidationError } from './llm/validateLlmEnv';
import { mergeIntoEnvLocal } from './mergeEnvLocal';

dotenv.config({ path: '.env.local' });
dotenv.config();

let advisorVendor: LlmVendor;
let decideVendor: LlmVendor;
let llmEndpoint: { baseURL?: string } = {};
let openAiFastModel: string;
let openAiDecideModel: string;
let advisorAgents: ReturnType<typeof createAdvisorAgents> | null = null;
let coordinatorAgent: ReturnType<typeof createCoordinatorAgent> | null = null;
let geminiAi: GoogleGenAI | null = null;
let anthropicClient: Anthropic | null = null;
let advisorModelId: string;
let decideModelId: string;

function initCouncilLlm(): void {
  advisorVendor = resolveAdvisorVendor();
  decideVendor = resolveDecideVendor();
  const envErr = getLlmEnvValidationError(advisorVendor, decideVendor);

  llmEndpoint = {};
  geminiAi = null;
  anthropicClient = null;
  advisorAgents = null;
  coordinatorAgent = null;

  openAiFastModel = modelForAdvisor('openai');
  openAiDecideModel = modelForDecide('openai');
  advisorModelId = modelForAdvisor(advisorVendor);
  decideModelId = modelForDecide(decideVendor);

  if (envErr) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(envErr);
    }
    console.warn('[council] LLM not configured:', envErr);
    return;
  }

  try {
    llmEndpoint = configureOpenAIProviderIfNeeded(usesOpenAiAgents(advisorVendor, decideVendor));
  } catch (e) {
    console.warn('[council] OpenAI provider setup failed:', e);
    llmEndpoint = {};
  }

  try {
    advisorAgents =
      advisorVendor === 'openai' ? createAdvisorAgents(openAiFastModel) : null;
    coordinatorAgent =
      decideVendor === 'openai' ? createCoordinatorAgent(openAiDecideModel) : null;
  } catch (e) {
    console.warn('[council] OpenAI agent graph init failed:', e);
    advisorAgents = null;
    coordinatorAgent = null;
  }

  try {
    geminiAi =
      advisorVendor === 'gemini' || decideVendor === 'gemini'
        ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
        : null;
  } catch (e) {
    console.warn('[council] Gemini client init failed:', e);
    geminiAi = null;
  }

  try {
    anthropicClient =
      advisorVendor === 'anthropic' || decideVendor === 'anthropic'
        ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
        : null;
  } catch (e) {
    console.warn('[council] Anthropic client init failed:', e);
    anthropicClient = null;
  }
}

initCouncilLlm();

function allowRuntimeSetup(req: Request): boolean {
  if (process.env.COUNCIL_ALLOW_SETUP_API === 'true') return true;
  if (process.env.NODE_ENV === 'production') return false;
  const ip = req.ip || req.socket.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

function getLlmNotReadyReason(): string | null {
  const v = getLlmEnvValidationError(advisorVendor, decideVendor);
  if (v) return v;
  if (advisorVendor === 'openai' && !advisorAgents) {
    return 'OpenAI advisors are not initialized. Save your API key in setup or set OPENAI_API_KEY in .env.local.';
  }
  if (decideVendor === 'openai' && !coordinatorAgent) {
    return 'Coordinator agent is not initialized. Check OPENAI_API_KEY and vendor settings.';
  }
  if ((advisorVendor === 'gemini' || decideVendor === 'gemini') && !geminiAi) {
    return 'Gemini client is not initialized.';
  }
  if ((advisorVendor === 'anthropic' || decideVendor === 'anthropic') && !anthropicClient) {
    return 'Anthropic client is not initialized.';
  }
  return null;
}

const app = express();

const rawPort = process.env.PORT?.trim() || '3001';
const port = Number.parseInt(rawPort, 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`[council] Invalid PORT="${rawPort}" — use an integer between 1 and 65535 (default 3001).`);
  process.exit(1);
}

if (process.env.GEMINI_MODEL_SYNTHESIS?.trim() && !process.env.GEMINI_MODEL_DECIDE?.trim()) {
  console.warn(
    '[council] GEMINI_MODEL_SYNTHESIS is ignored; use GEMINI_MODEL_DECIDE for the coordinator (see .env.example).',
  );
}

const honeyHiveApiKey = process.env.HONEYHIVE_API_KEY;
const honeyHiveProject = process.env.HONEYHIVE_PROJECT ?? 'Great Council';
const honeyHiveSource = process.env.HONEYHIVE_SOURCE ?? process.env.NODE_ENV ?? 'dev';

app.use(express.json({ limit: '1mb' }));

app.post('/api/setup/llm', (req, res) => {
  if (!allowRuntimeSetup(req)) {
    res.status(403).json({ error: 'Setup API is only available in development from localhost, or when COUNCIL_ALLOW_SETUP_API=true.' });
    return;
  }
  const b = req.body as {
    vendor?: string;
    openaiKey?: string;
    geminiKey?: string;
    anthropicKey?: string;
  };
  const vendor = b?.vendor?.trim().toLowerCase();
  if (vendor !== 'openai' && vendor !== 'gemini' && vendor !== 'anthropic') {
    res.status(400).json({ error: 'Body must include vendor: openai | gemini | anthropic' });
    return;
  }

  const updates: Record<string, string> = {
    LLM_VENDOR_ADVISOR: vendor,
    LLM_VENDOR_DECIDE: vendor,
  };
  if (typeof b.openaiKey === 'string' && b.openaiKey.trim()) {
    updates.OPENAI_API_KEY = b.openaiKey.trim();
  }
  if (typeof b.geminiKey === 'string' && b.geminiKey.trim()) {
    updates.GEMINI_API_KEY = b.geminiKey.trim();
  }
  if (typeof b.anthropicKey === 'string' && b.anthropicKey.trim()) {
    updates.ANTHROPIC_API_KEY = b.anthropicKey.trim();
  }

  try {
    mergeIntoEnvLocal(process.cwd(), updates);
    dotenv.config({ path: path.join(process.cwd(), '.env.local'), override: true });
    initCouncilLlm();
    const err = getLlmEnvValidationError(advisorVendor, decideVendor);
    const ready = err === null && getLlmNotReadyReason() === null;
    res.status(200).json({
      ok: true,
      llmConfigured: ready,
      message: ready
        ? 'Saved to .env.local and loaded. You can chat now.'
        : err ?? getLlmNotReadyReason() ?? 'Still missing credentials for the selected vendor.',
    });
  } catch (e) {
    console.error('[POST /api/setup/llm]', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to save configuration' });
  }
});

app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/setup/llm' && req.method === 'POST',
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
  switch (advisorVendor) {
    case 'gemini': {
      if (!geminiAi) throw new Error('Gemini client not initialized.');
      return geminiGenerateBilingual(
        geminiAi,
        advisorModelId,
        advisor,
        history,
        traceContext,
        trackModelCall,
      );
    }
    case 'anthropic': {
      if (!anthropicClient) throw new Error('Anthropic client not initialized.');
      return anthropicGenerateBilingual(
        anthropicClient,
        advisorModelId,
        advisor,
        history,
        traceContext,
        trackModelCall,
      );
    }
    case 'openai': {
      if (!advisorAgents) throw new Error('OpenAI advisor agents not initialized.');
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
          model: openAiFastModel,
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
  }
}

async function runDecide(
  history: ChatMessage[],
  activeAdvisorIds: string[],
  sessionId: string | undefined,
): Promise<string[]> {
  switch (decideVendor) {
    case 'gemini': {
      if (!geminiAi) throw new Error('Gemini client not initialized.');
      return geminiDecide(geminiAi, decideModelId, history, activeAdvisorIds, sessionId, trackModelCall);
    }
    case 'anthropic': {
      if (!anthropicClient) throw new Error('Anthropic client not initialized.');
      return anthropicDecide(
        anthropicClient,
        decideModelId,
        history,
        activeAdvisorIds,
        sessionId,
        trackModelCall,
      );
    }
    case 'openai': {
      if (!coordinatorAgent) throw new Error('OpenAI coordinator agent not initialized.');
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
          model: openAiDecideModel,
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
  }
}

app.get('/healthz', (_req, res) => {
  const ready = getLlmNotReadyReason();
  res.status(200).json({
    ok: true,
    llmConfigured: ready === null,
    llm: { advisor: advisorVendor, decide: decideVendor },
    ...(ready ? {} : { llmSetupHint: ready }),
    ...(llmEndpoint.baseURL ? { llmProxy: llmEndpoint.baseURL } : {}),
  });
});

app.post('/api/chat/respond', async (req, res) => {
  try {
    const notReady = getLlmNotReadyReason();
    if (notReady) {
      res.status(503).json({ error: notReady, code: 'LLM_NOT_READY' });
      return;
    }
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
    console.error('[POST /api/chat/respond]', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Request failed' });
  }
});

app.post('/api/chat/decide', async (req, res) => {
  try {
    const notReady = getLlmNotReadyReason();
    if (notReady) {
      res.status(503).json({ error: notReady, code: 'LLM_NOT_READY' });
      return;
    }
    const sessionId = sanitizeText(req.body?.sessionId) || undefined;
    const history = ((req.body?.history ?? []) as ChatMessage[]).slice(-5);
    const activeAdvisorIds = ((req.body?.activeAdvisorIds ?? []) as string[]).filter((id) =>
      ADVISORS.some((a) => a.id === id),
    );
    const ids = await runDecide(history, activeAdvisorIds, sessionId);
    res.status(200).json({ ids });
  } catch (error) {
    console.error('[POST /api/chat/decide]', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Request failed' });
  }
});

const distDir = path.join(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(path.join(distDir, 'index.html'), (err) => next(err));
  });
}

app.listen(port, () => {
  console.log(
    `Council API on port ${port} (advisor=${advisorVendor}, decide=${decideVendor})` +
      (fs.existsSync(distDir) ? '; also serving Vite app from dist/' : ''),
  );
});
