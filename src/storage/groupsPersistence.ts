import type { ChatGroup } from '../types';
import { ADVISORS } from '../types';

export const GROUPS_STORAGE_KEY = 'council-ai-chat-groups-v1';

export type PersistedGroupsState = {
  version: 1;
  activeGroupId: string;
  groups: ChatGroup[];
};

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `g-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const validAdvisorIds = () => new Set(ADVISORS.map((a) => a.id));

function sanitizeGroups(groups: ChatGroup[]): ChatGroup[] {
  const valid = validAdvisorIds();
  return groups.map((g) => {
    const memberIds = g.activeAdvisorIds.filter((id) => valid.has(id));
    return {
      ...g,
      /** Keep empty roster when user chose no advisors (add later in settings). */
      activeAdvisorIds: memberIds,
    };
  });
}

export function createSeedState(): PersistedGroupsState {
  const id = newId();
  return {
    version: 1,
    activeGroupId: id,
    groups: [
      {
        id,
        name: 'History Masterminds',
        messages: [],
        activeAdvisorIds: ADVISORS.map((a) => a.id),
      },
    ],
  };
}

export function loadPersistedGroupsState(): PersistedGroupsState {
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as Partial<PersistedGroupsState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.groups) || typeof parsed.activeGroupId !== 'string') {
      return createSeedState();
    }
    let groups = sanitizeGroups(parsed.groups as ChatGroup[]);
    if (groups.length === 0) return createSeedState();
    const ids = new Set(groups.map((g) => g.id));
    let activeGroupId = parsed.activeGroupId;
    if (!ids.has(activeGroupId)) activeGroupId = groups[0].id;
    return { version: 1, activeGroupId, groups };
  } catch {
    return createSeedState();
  }
}

export function savePersistedGroupsState(state: PersistedGroupsState): void {
  try {
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save chat groups (quota or private mode):', e);
  }
}

export { newId };
