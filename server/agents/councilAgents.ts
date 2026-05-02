import { Agent } from '@openai/agents';
import { ADVISORS } from '../../src/types';
import type { AdvisorPersona } from '../../src/types';
import { bilingualResponseSchema, decideResponseSchema } from './schemas';

export type AdvisorAgent = Agent<unknown, typeof bilingualResponseSchema>;
export type CoordinatorAgent = Agent<unknown, typeof decideResponseSchema>;

function advisorInstructions(advisor: AdvisorPersona): string {
  const primary = advisor.primaryLang === 'zh' ? 'Chinese (Mandarin)' : 'English';
  const secondary = advisor.secondaryLang === 'zh' ? 'Chinese (Mandarin)' : 'English';

  return `${advisor.personaInstructions}

You reply in a mobile group chat. Stay in character. Be concise.

Your structured response must include:
- content: your reply in ${primary}
- translation: a brief ${secondary} translation or summary`;
}

/**
 * One OpenAI Agent per advisor so tools/handoffs can be attached per persona later.
 */
export function createAdvisorAgents(model: string): Map<string, AdvisorAgent> {
  const map = new Map<string, AdvisorAgent>();
  for (const persona of ADVISORS) {
    map.set(
      persona.id,
      new Agent({
        name: `advisor-${persona.id}`,
        instructions: advisorInstructions(persona),
        model,
        outputType: bilingualResponseSchema,
        handoffDescription: `${persona.shortName} (${persona.title})`,
      }),
    );
  }
  return map;
}

export function createCoordinatorAgent(model: string): CoordinatorAgent {
  return new Agent({
    name: 'coordinator',
    instructions: `You are a group chat coordinator. You receive which advisors are present and recent messages.
Decide which advisor(s) should respond next. If the user spoke last, at least one advisor must respond.
Usually pick 1 or 2 advisor ids from the active list only. Fill the ids array with valid advisor id strings.`,
    model,
    outputType: decideResponseSchema,
    handoffDescription: 'Chooses which advisors speak next in the council chat.',
  });
}
