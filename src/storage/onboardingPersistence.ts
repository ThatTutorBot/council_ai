const KEY = 'council_onboarding_v1';

export type OnboardingVendor = 'openai' | 'gemini' | 'anthropic';

export type OnboardingState = {
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
 * GitHub Pages / iframe shells should load expanded (`embed=1`) so visitors see the UI without the
 * root capsule step. Product URLs use plain `/`.
 */
export function isEmbedPreview(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('embed') === '1';
}

export function saveOnboardingComplete(vendorHint?: OnboardingVendor): void {
  const next: OnboardingState = { complete: true, vendorHint };
  localStorage.setItem(KEY, JSON.stringify(next));
}

/** Dev / support: reopen welcome from settings. */
export function resetOnboarding(): void {
  localStorage.removeItem(KEY);
}
