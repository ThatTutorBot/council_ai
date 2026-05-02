import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, AudioWaveform, MoreHorizontal, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ADVISORS } from '@/src/types';
import { saveOnboardingComplete, type OnboardingVendor } from '@/src/storage/onboardingPersistence';
import { ChatService } from '@/src/services/chatService';
import { cn } from '@/lib/utils';

type Stage = 'setup' | 'advisors';

/** Survives DevTools reload when `.env.local` changes; paired with Vite `watch.ignored`. */
const SESSION_UI_KEY = 'council_onboarding_session_ui_v1';

function readSessionUi(): { expanded: boolean; stage: Stage } {
  try {
    const raw = sessionStorage.getItem(SESSION_UI_KEY);
    if (!raw) return { expanded: false, stage: 'setup' };
    const p = JSON.parse(raw) as { expanded?: boolean; stage?: string };
    const stage: Stage = p.stage === 'advisors' ? 'advisors' : 'setup';
    const expanded = Boolean(p.expanded) || stage === 'advisors';
    return { expanded, stage };
  } catch {
    return { expanded: false, stage: 'setup' };
  }
}

function writeSessionUi(patch: { expanded: boolean; stage: Stage }) {
  sessionStorage.setItem(SESSION_UI_KEY, JSON.stringify(patch));
}

function clearSessionUi() {
  sessionStorage.removeItem(SESSION_UI_KEY);
}

const VENDORS: { id: OnboardingVendor; label: string }[] = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'anthropic', label: 'Anthropic' },
];

/** Duplicated for seamless CSS marquee loop */
const ADVISORS_MARQUEE_STRIP = [...ADVISORS, ...ADVISORS];

type Props = {
  onComplete: () => void;
};

export function OnboardingFlow({ onComplete }: Props) {
  const [expanded, setExpanded] = useState(() => readSessionUi().expanded);
  const [stage, setStage] = useState<Stage>(() => readSessionUi().stage);
  const [vendor, setVendor] = useState<OnboardingVendor>('openai');
  const [keys, setKeys] = useState({ openai: '', gemini: '', anthropic: '' });
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupHint, setSetupHint] = useState<{ ok: boolean; text: string } | null>(null);
  const [llmReady, setLlmReady] = useState(false);
  const advanceAfterSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentKey =
    vendor === 'openai' ? keys.openai : vendor === 'gemini' ? keys.gemini : keys.anthropic;

  useEffect(
    () => () => {
      if (advanceAfterSaveRef.current) clearTimeout(advanceAfterSaveRef.current);
    },
    [],
  );

  async function saveToServer() {
    setSetupHint(null);
    if (!currentKey.trim()) {
      setSetupHint({ ok: false, text: 'Paste your API key first.' });
      return;
    }
    setSetupSaving(true);
    try {
      const result = await ChatService.saveLlmSetup({
        vendor,
        openaiKey: vendor === 'openai' ? keys.openai : undefined,
        geminiKey: vendor === 'gemini' ? keys.gemini : undefined,
        anthropicKey: vendor === 'anthropic' ? keys.anthropic : undefined,
      });
      setSetupHint({
        ok: result.llmConfigured,
        text: result.llmConfigured ? 'Saved.' : result.message ?? 'Could not verify yet.',
      });
      setLlmReady(result.llmConfigured);

      if (result.llmConfigured) {
        writeSessionUi({ expanded: true, stage: 'advisors' });
        if (advanceAfterSaveRef.current) clearTimeout(advanceAfterSaveRef.current);
        const prefersReduced =
          typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const delayMs = prefersReduced ? 0 : 520;
        advanceAfterSaveRef.current = window.setTimeout(() => {
          advanceAfterSaveRef.current = null;
          setSetupHint(null);
          setStage('advisors');
        }, delayMs);
      }
    } catch (e) {
      setSetupHint({
        ok: false,
        text: e instanceof Error ? e.message : 'Could not reach the API. Start the server and try again.',
      });
      setLlmReady(false);
    } finally {
      setSetupSaving(false);
    }
  }

  const finish = () => {
    clearSessionUi();
    saveOnboardingComplete(vendor);
    onComplete();
  };

  const openExpanded = (e: MouseEvent) => {
    e.stopPropagation();
    setExpanded(true);
  };

  return (
    <div className="relative min-h-screen bg-[#f4f4f2] text-neutral-900 flex flex-col">
      <div className="h-px w-full shrink-0 bg-violet-950/35" aria-hidden />

      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        <motion.div
          layout
          transition={{ layout: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }}
          className={cn(
            'bg-black text-white shadow-[0_25px_80px_-20px_rgba(0,0,0,0.45)]',
            expanded
              ? 'w-full max-w-xl md:max-w-2xl rounded-[2rem] p-8 md:p-10'
              : 'rounded-full inline-flex max-w-[min(100%,22rem)] items-center gap-3 md:gap-4 py-3 pl-3 pr-2 cursor-pointer select-none',
          )}
          onClick={!expanded ? () => setExpanded(true) : undefined}
          role={expanded ? undefined : 'button'}
          tabIndex={expanded ? undefined : 0}
          onKeyDown={
            !expanded
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpanded(true);
                  }
                }
              : undefined
          }
        >
          {!expanded ? (
            <div className="flex items-center gap-3 md:gap-4 pr-1">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20">
                <User className="h-5 w-5 text-white/90" strokeWidth={1.75} />
              </div>
              <div className="text-left leading-tight min-w-0">
                <p className="text-[11px] font-normal tracking-wide text-white/75 md:text-xs">Hello, I&apos;m</p>
                <p className="text-lg font-semibold tracking-tight md:text-xl">Council</p>
              </div>
              <div className="ml-1 flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={openExpanded}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white shadow-md transition hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                  aria-label="Open setup"
                >
                  <AudioWaveform className="h-5 w-5" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    finish();
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                  aria-label="Skip onboarding"
                >
                  <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-8" onClick={(e) => e.stopPropagation()}>
              <AnimatePresence mode="wait">
                {stage === 'setup' && (
                  <motion.div
                    key="setup"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-6 text-left"
                  >
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">Before you enter</p>
                      <h2 className="text-2xl font-semibold tracking-tight md:text-[1.65rem] leading-snug">
                        Choose your model vendor and API key.
                      </h2>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {VENDORS.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setVendor(v.id)}
                          className={cn(
                            'rounded-full px-4 py-2 text-sm font-medium transition',
                            vendor === v.id
                              ? 'bg-white text-black'
                              : 'bg-white/10 text-white/90 ring-1 ring-white/20 hover:bg-white/15',
                          )}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <label className="block text-xs uppercase tracking-wider text-white/45">API key</label>
                      {vendor === 'openai' && (
                        <input
                          type="password"
                          autoComplete="off"
                          value={keys.openai}
                          onChange={(e) => setKeys((k) => ({ ...k, openai: e.target.value }))}
                          placeholder="sk-…"
                          className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10"
                        />
                      )}
                      {vendor === 'gemini' && (
                        <input
                          type="password"
                          autoComplete="off"
                          value={keys.gemini}
                          onChange={(e) => setKeys((k) => ({ ...k, gemini: e.target.value }))}
                          placeholder="AIza…"
                          className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10"
                        />
                      )}
                      {vendor === 'anthropic' && (
                        <input
                          type="password"
                          autoComplete="off"
                          value={keys.anthropic}
                          onChange={(e) => setKeys((k) => ({ ...k, anthropic: e.target.value }))}
                          placeholder="sk-ant-…"
                          className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10"
                        />
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 items-center">
                      <Button
                        type="button"
                        disabled={setupSaving}
                        onClick={saveToServer}
                        className="!rounded-full !bg-white !text-black hover:!bg-white/90 !px-6 !py-5 !h-auto !text-sm !font-semibold"
                      >
                        {setupSaving ? 'Saving…' : 'Save & apply'}
                      </Button>
                      {llmReady && (
                        <span className="text-xs font-medium text-emerald-400/95">Ready for chat</span>
                      )}
                    </div>
                    {setupHint && (
                      <p
                        className={cn(
                          'text-sm leading-relaxed',
                          setupHint.ok ? 'text-white/80' : 'text-amber-300/95',
                        )}
                      >
                        {setupHint.text}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          clearSessionUi();
                          setExpanded(false);
                        }}
                        className="text-sm text-white/45 underline decoration-white/25 underline-offset-4 hover:text-white/80"
                      >
                        Collapse
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          writeSessionUi({ expanded: true, stage: 'advisors' });
                          setStage('advisors');
                        }}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-white underline decoration-white/40 underline-offset-[6px] hover:decoration-white"
                      >
                        Meet the council
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {stage === 'advisors' && (
                  <motion.div
                    key="advisors"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-6 text-left"
                  >
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">Meet the council</p>

                    <div className="council-advisors-marquee-wrap relative -mx-2 md:-mx-1">
                      <div
                        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-black to-transparent md:w-14"
                        aria-hidden
                      />
                      <div
                        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-black to-transparent md:w-14"
                        aria-hidden
                      />
                      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 py-8 md:py-10">
                        <div className="flex council-advisors-marquee w-max items-end gap-8 px-6 md:gap-10 md:px-10">
                          {ADVISORS_MARQUEE_STRIP.map((a, idx) => (
                            <div
                              key={`${a.id}-${idx}`}
                              className={cn(
                                'group relative w-[10.5rem] shrink-0 outline-none md:w-[12rem]',
                                'rounded-2xl focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                              )}
                              tabIndex={0}
                            >
                              <div className="relative flex h-[min(52vh,300px)] w-full items-center justify-center overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-white/10 md:h-[340px]">
                                <img
                                  src={a.avatar}
                                  alt=""
                                  className="max-h-full max-w-full object-contain object-center select-none"
                                  draggable={false}
                                />
                                <div
                                  className={cn(
                                    'absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/88 to-black/25 p-4 opacity-0 transition-opacity duration-300 ease-out',
                                    'group-hover:opacity-100 group-focus-within:opacity-100',
                                  )}
                                >
                                  <div className="max-h-[min(42vh,240px)] min-h-0 overflow-y-auto overscroll-contain">
                                    <p className="text-sm font-semibold leading-snug text-white">{a.name}</p>
                                    <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-white/50">
                                      {a.title}
                                    </p>
                                    <p className="mt-3 text-[13px] leading-relaxed text-white/90">{a.bio}</p>
                                  </div>
                                </div>
                              </div>
                              <p className="mt-2.5 text-center text-[11px] font-medium text-white/55 line-clamp-2 md:text-xs">
                                {a.name}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          writeSessionUi({ expanded: true, stage: 'setup' });
                          setStage('setup');
                        }}
                        className="text-sm text-white/45 underline decoration-white/25 underline-offset-4 hover:text-white/80 self-start order-2 sm:order-1"
                      >
                        Back to setup
                      </button>
                      <Button
                        type="button"
                        onClick={finish}
                        className="!rounded-full !bg-white !text-black hover:!bg-white/90 !px-10 !py-6 !h-auto !text-base !font-semibold order-1 sm:order-2 sm:ml-auto w-full sm:w-auto"
                      >
                        Enter Council
                        <ArrowRight className="ml-2 h-5 w-5 inline" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>

      <p className="shrink-0 pb-8 text-center text-[11px] text-neutral-400 px-4">
        Tap the pill to expand · Blue button skips setup
      </p>
    </div>
  );
}
