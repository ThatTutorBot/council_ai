/** HoneyHive-compatible model event payload (shared by native providers). */
export type TrackModelCall = (params: {
  sessionId?: string;
  eventName: string;
  provider: string;
  model: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  durationMs: number;
}) => Promise<void>;
