const KEY = 'council_onboarding_v1';

/** Matches `OnboardingFlow`; cleared on each visit so the welcome flow starts clean. */
const SESSION_UI_KEY = 'council_onboarding_session_ui_v1';

/** Clears scroll/stage session from the onboarding theatre UI (same tab only). */
export function clearOnboardingSessionUiCache(): void {
  try {
    sessionStorage.removeItem(SESSION_UI_KEY);
  } catch {
    /* ignore */
  }
}

export type OnboardingVendor = 'openai' | 'gemini' | 'anthropic';

export type OnboardingState = {
  /** Legacy field — no longer used to skip onboarding on reload (see below). */
  complete: boolean;
  /** Last chosen vendor; informs env snippet only (server still uses `.env.local`). */
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
 * Whether the main chat shell should show on **initial load**.
 *
 * **Product default:** every **full page load** opens the welcome flow (`complete` is **not** read from
 * localStorage). After the user finishes onboarding in-session, `App` keeps them in the shell until refresh.
 *
 * **Overrides:**
 * - `?onboarding` or `?setup` — force welcome (already default except embed).
 * - `?demo=1` or `?embed=1` — skip welcome for embedded previews (e.g. iframe shells using `?embed=1`).
 * - Dev: `VITE_SHOW_ONBOARDING=1` — force welcome every dev reload (when paired with implementation in App).
 */
export function isOnboardingCompleteForSession(): boolean {
  if (typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search);
    if (q.has('onboarding') || q.has('setup')) return false;
    if (q.get('demo') === '1' || q.get('embed') === '1') return true;
    if (import.meta.env.DEV && import.meta.env.VITE_SHOW_ONBOARDING === '1') return false;
  }
  return false;
}

export function saveOnboardingComplete(vendorHint?: OnboardingVendor): void {
  try {
    const prev = loadOnboardingState();
    const next: OnboardingState = {
      complete: false,
      vendorHint: vendorHint ?? prev.vendorHint,
    };
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    if (vendorHint) {
      localStorage.setItem(KEY, JSON.stringify({ complete: false, vendorHint }));
    }
  }
}

/** Clears vendor hint and onboarding UI keys when revisiting welcome from settings. */
export function resetOnboarding(): void {
  localStorage.removeItem(KEY);
  clearOnboardingSessionUiCache();
}
