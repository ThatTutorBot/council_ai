import { type MouseEvent } from 'react';
import { motion } from 'motion/react';
import { AudioWaveform, MoreHorizontal, User } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Root “Council” pill on `/` — same two-button row as the collapsed {@link OnboardingFlow} pill:
 * Settings (orange) · Chat (blue). Tap the label row for Settings.
 */
type Props = {
  variant: 'needs-keys' | 'ready';
  onSettings: () => void;
  /** Enter chat: skips welcome when you have not finished intro; reopens the shell when intro is done. */
  onChat: () => void;
};

export function CouncilCapsule({ variant, onSettings, onChat }: Props) {
  const openSettings = (e: MouseEvent) => {
    e.stopPropagation();
    onSettings();
  };

  const openChat = (e: MouseEvent) => {
    e.stopPropagation();
    onChat();
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#f4f4f2] text-neutral-900">
      <div className="h-px w-full shrink-0 bg-violet-950/35" aria-hidden />
      <div className="flex flex-1 items-center justify-center p-6 md:p-10">
        <motion.div
          layout
          transition={{ layout: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }}
          className={cn(
            'inline-flex max-w-[min(100%,22rem)] cursor-pointer select-none items-center gap-3 rounded-full bg-black py-3 pl-3 pr-2 text-white shadow-[0_25px_80px_-20px_rgba(0,0,0,0.45)] md:gap-4',
          )}
          role="button"
          tabIndex={0}
          onClick={() => onSettings()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSettings();
            }
          }}
        >
          <div className="flex items-center gap-3 pr-1 md:gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20">
              <User className="h-5 w-5 text-white/90" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 text-left leading-tight">
              <p className="text-[11px] font-normal tracking-wide text-white/75 md:text-xs">Hello, I&apos;m</p>
              <p className="text-lg font-semibold tracking-tight md:text-xl">Council</p>
            </div>
            <div className="ml-1 flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={openSettings}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white shadow-md transition hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                aria-label="Settings"
                title="Settings"
              >
                <AudioWaveform className="h-5 w-5" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={openChat}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                aria-label="Chat"
                title="Chat"
              >
                <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      <p className="shrink-0 pb-8 text-center text-[11px] text-neutral-400 px-4">
        {variant === 'ready'
          ? 'Settings: welcome & Meet the council · Chat: open Council · Drag the floating window by its header'
          : 'Tap the pill or Settings for setup · Chat skips to chat'}
      </p>
    </div>
  );
}
