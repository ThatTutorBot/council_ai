const KEY = 'council_onboarding_v1';

export type OnboardingVendor = 'openai' | 'gemini' | 'anthropic';

export type OnboardingState = {
  complete: boolean;
  /** Last chosen vendor; informs env snippet only (server still uses .env.local). */
  vendorHint?: OnboardingVendor;
};

export function loadOnboardingState(): OnboardingState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { complete: false };
    const parsed = JSON.parse(raw) as OnboardingState;
    return typeof parsed.complete === 'boolean' ? parsed : { complete: false };
  } catch {
    return { complete: false };
  }
}

/**
 * Whether the main chat shell should show (onboarding already finished).
 * Survives restarts: completion is in localStorage, not the server.
 * Force the welcome flow with URL `?onboarding` or `?setup`, or (dev) `VITE_SHOW_ONBOARDING=1` in `.env.local`.
 */
export function isOnboardingCompleteForSession(): boolean {
  if (typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search);
    if (q.has('onboarding') || q.has('setup')) return false;
    if (import.meta.env.DEV && import.meta.env.VITE_SHOW_ONBOARDING === '1') return false;
  }
  return loadOnboardingState().complete;
}

export function saveOnboardingComplete(vendorHint?: OnboardingVendor): void {
  const next: OnboardingState = { complete: true, vendorHint };
  localStorage.setItem(KEY, JSON.stringify(next));
}

/** Dev / support: let users reopen onboarding from the UI later if we add a button. */
export function resetOnboarding(): void {
  localStorage.removeItem(KEY);
}
