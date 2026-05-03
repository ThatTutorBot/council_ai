import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from 'react';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { ArrowRight, AudioWaveform, MoreHorizontal, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { type AdvisorPersona, ADVISORS, advisorRegionLabel } from '@/src/types';
import { saveOnboardingComplete, type OnboardingVendor } from '@/src/storage/onboardingPersistence';
import { ChatService } from '@/src/services/chatService';
import { cn } from '@/lib/utils';

/** Survives DevTools reload when `.env.local` changes; paired with Vite `watch.ignored`. */
const SESSION_UI_KEY = 'council_onboarding_session_ui_v1';

type SessionUi = { expanded: boolean; previewOpen: boolean };

function readSessionUi(): SessionUi {
  try {
    const raw = sessionStorage.getItem(SESSION_UI_KEY);
    if (!raw) return { expanded: false, previewOpen: false };
    const p = JSON.parse(raw) as { expanded?: boolean; stage?: string; previewOpen?: boolean };
    const previewOpen = Boolean(p.previewOpen) || p.stage === 'advisors';
    const expanded = Boolean(p.expanded) || previewOpen;
    return { expanded, previewOpen };
  } catch {
    return { expanded: false, previewOpen: false };
  }
}

function writeSessionUi(next: SessionUi) {
  sessionStorage.setItem(SESSION_UI_KEY, JSON.stringify(next));
}

function clearSessionUi() {
  sessionStorage.removeItem(SESSION_UI_KEY);
}

const VENDORS: { id: OnboardingVendor; label: string }[] = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'anthropic', label: 'Anthropic' },
];

/**
 * Scroll-linked 3D stage motion (perspective, rotateX/Y, Z, springs): editorial “theatre”
 * as each advisor passes through the viewport—similar in spirit to Vertical-style sites.
 */
function CouncilAdvisorPlane({
  advisor: a,
  index: i,
  scrollContainerRef,
  reduceMotion,
}: {
  advisor: AdvisorPersona;
  index: number;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  reduceMotion: boolean | null;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const off = Boolean(reduceMotion);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    container: scrollContainerRef,
    /** Longer “approach” window so the big tilt stays on screen a beat longer. */
    offset: ['start 0.97', 'start 0.16'],
  });

  /** Enter (deep / tilted) → hero (flat) → exit (recede) — tuned for bold perspective (large angles + depth). */
  const easeRange = [0, 0.48, 1];
  const zero3 = [0, 0, 0];

  const rotateXSrc = useTransform(
    scrollYProgress,
    easeRange,
    off ? zero3 : [44, 0, -26],
  );
  const rotateYSrc = useTransform(
    scrollYProgress,
    easeRange,
    off ? zero3 : [-12, 0, 11],
  );
  const zSrc = useTransform(scrollYProgress, easeRange, off ? zero3 : [-210, 0, -95]);
  const scaleSrc = useTransform(
    scrollYProgress,
    easeRange,
    off ? [1, 1, 1] : [0.78, 1, 0.9],
  );
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.28, 0.52, 1],
    off ? [1, 1, 1, 1] : [0.18, 1, 1, 0.58],
  );

  const indexXSrc = useTransform(scrollYProgress, easeRange, off ? zero3 : [38, 0, -32]);
  const headlineZSrc = useTransform(scrollYProgress, easeRange, off ? zero3 : [112, 22, 72]);

  const stiff = { stiffness: 9000, damping: 130, mass: 0.08 };
  /** Slightly tighter springs so large angles catch up quickly (still smoothed, not jittery). */
  const fluid = { stiffness: 78, damping: 16, mass: 0.52 };
  const fluidRotateY = { stiffness: 88, damping: 17, mass: 0.52 };
  const fluidIndex = { stiffness: 62, damping: 19, mass: 0.52 };
  const fluidHeadline = { stiffness: 68, damping: 16, mass: 0.52 };

  const rotateX = useSpring(rotateXSrc, off ? stiff : fluid);
  const rotateY = useSpring(rotateYSrc, off ? stiff : fluidRotateY);
  const z = useSpring(zSrc, off ? stiff : fluid);
  const scale = useSpring(scaleSrc, off ? stiff : fluid);
  const indexX = useSpring(indexXSrc, off ? stiff : fluidIndex);
  const headlineZ = useSpring(headlineZSrc, off ? stiff : fluidHeadline);

  const displayName = a.name.split(' (')[0];

  return (
    <motion.div
      ref={sectionRef}
      role="region"
      aria-label={`Advisor ${displayName}`}
      style={{
        rotateX,
        rotateY,
        z,
        opacity,
        scale,
        transformStyle: 'preserve-3d',
        transformOrigin: '50% 42%',
      }}
      className="flex flex-col gap-6 py-14 md:flex-row md:items-start md:gap-12 md:py-20 lg:gap-16 will-change-transform [backface-visibility:hidden]"
    >
      <motion.div
        className="flex shrink-0 md:w-[120px] lg:w-[140px]"
        style={{ x: indexX, transformStyle: 'preserve-3d' }}
      >
        <span className="font-mono text-[11px] tabular-nums tracking-[0.2em] text-white/35">
          {String(i + 1).padStart(2, '0')}
        </span>
      </motion.div>
      <div className="min-w-0 flex-1 space-y-6 [transform-style:preserve-3d]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-8">
          <Avatar className="relative z-10 h-16 w-16 shrink-0 rounded-full ring-1 ring-white/15 sm:h-20 sm:w-20">
            <AvatarImage src={a.avatar} className="rounded-full object-cover object-top" alt="" />
            <AvatarFallback className="rounded-full bg-white/10 text-lg text-white">
              {displayName[0]}
            </AvatarFallback>
          </Avatar>
          <motion.div
            className="min-w-0 flex-1"
            style={{
              z: headlineZ,
              transformStyle: 'preserve-3d',
            }}
          >
            <h3 className="font-sans text-[clamp(2rem,7vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.035em] text-white drop-shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
              {displayName}
            </h3>
            <p className="mt-4 max-w-md text-[11px] font-medium uppercase tracking-[0.22em] text-white/45">
              {a.title}
            </p>
            <p className="mt-2 text-[11px] tracking-[0.14em] text-white/35 uppercase">
              {advisorRegionLabel(a.id)}
            </p>
          </motion.div>
        </div>
        <p className="font-heading relative z-0 max-w-2xl text-[clamp(1rem,2.4vw,1.25rem)] italic leading-[1.65] text-white/65 md:leading-[1.7]">
          {a.bio}
        </p>
      </div>
    </motion.div>
  );
}

type Props = {
  onComplete: () => void;
};

export function OnboardingFlow({ onComplete }: Props) {
  const reduceMotion = useReducedMotion();
  const councilScrollRef = useRef<HTMLDivElement>(null);
  const initial = readSessionUi();
  const [expanded, setExpanded] = useState(initial.expanded);
  const [previewOpen, setPreviewOpen] = useState(initial.previewOpen);
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

  function openCouncilPreview() {
    setPreviewOpen(true);
    writeSessionUi({ expanded: true, previewOpen: true });
  }

  function closeCouncilPreview() {
    setPreviewOpen(false);
    writeSessionUi({ expanded, previewOpen: false });
  }

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
        writeSessionUi({ expanded: true, previewOpen: true });
        if (advanceAfterSaveRef.current) clearTimeout(advanceAfterSaveRef.current);
        const prefersReduced =
          typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const delayMs = prefersReduced ? 0 : 520;
        advanceAfterSaveRef.current = window.setTimeout(() => {
          advanceAfterSaveRef.current = null;
          setSetupHint(null);
          setPreviewOpen(true);
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
    writeSessionUi({ expanded: true, previewOpen });
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
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
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
                      setPreviewOpen(false);
                    }}
                    className="text-sm text-white/45 underline decoration-white/25 underline-offset-4 hover:text-white/80"
                  >
                    Collapse
                  </button>
                  <button
                    type="button"
                    onClick={openCouncilPreview}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-white underline decoration-white/40 underline-offset-[6px] hover:decoration-white"
                  >
                    Meet the council
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {previewOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[200] bg-black/45 cursor-default"
              onClick={closeCouncilPreview}
            />
            <motion.div
              key="council-preview"
              role="dialog"
              aria-modal="true"
              aria-labelledby="council-preview-title"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'fixed z-[210] flex flex-col overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-black text-white shadow-[0_32px_90px_-28px_rgba(0,0,0,0.55)]',
                'left-4 right-4 top-[max(1rem,env(safe-area-inset-top))] bottom-[max(1rem,env(safe-area-inset-bottom))]',
                'md:left-[max(1rem,calc(50%-min(56rem,92vw)/2))] md:right-[max(1rem,calc(50%-min(56rem,92vw)/2))]',
                'md:top-[max(2rem,calc(50%-min(42rem,75vh)/2))] md:bottom-auto md:h-[min(42rem,75vh)] md:max-h-[85vh]',
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-white/[0.08] px-5 md:px-8">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-white/40">
                    Ft. council
                  </p>
                  <h2 id="council-preview-title" className="sr-only">
                    Meet the council
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeCouncilPreview}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/50 hover:bg-white/[0.06] hover:text-white motion-safe:transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 stroke-[1.75]" />
                </button>
              </header>

              <div
                ref={councilScrollRef}
                className="flex-1 min-h-0 overflow-y-auto scroll-smooth bg-black px-5 pb-8 pt-6 md:px-12 md:pb-12 md:pt-10"
              >
                <div className="mx-auto max-w-4xl">
                  <header className="border-b border-white/[0.08] pb-12 md:pb-16">
                    <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/45">
                      Before you enter
                    </p>
                    <p className="mt-5 font-sans text-[clamp(1.85rem,5vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
                      Meet the council.
                    </p>
                  </header>

                  <div className="[perspective:1050px] [perspective-origin:50%_22%]">
                    <div className="divide-y divide-white/[0.08]">
                      {ADVISORS.map((a, i) => (
                        <div key={a.id}>
                          <CouncilAdvisorPlane
                            advisor={a}
                            index={i}
                            scrollContainerRef={councilScrollRef}
                            reduceMotion={reduceMotion}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <footer className="shrink-0 border-t border-white/[0.08] bg-black px-5 py-4 md:px-8">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={closeCouncilPreview}
                    className="text-sm font-medium text-white/45 underline decoration-white/25 underline-offset-[6px] hover:text-white/85"
                  >
                    Back to setup
                  </button>
                  <Button
                    type="button"
                    onClick={finish}
                    className="!rounded-full !border-0 !bg-white !text-black hover:!bg-white/90 !px-10 !py-6 !h-auto !text-base !font-semibold shadow-[0_16px_48px_-12px_rgba(0,0,0,0.45)] sm:min-w-[12rem]"
                  >
                    Enter the Council
                    <ArrowRight className="ml-2 h-5 w-5 inline" />
                  </Button>
                </div>
              </footer>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <p className="shrink-0 pb-8 text-center text-[11px] text-neutral-400 px-4">
        Tap the pill to expand · Blue button skips setup
      </p>
    </div>
  );
}
