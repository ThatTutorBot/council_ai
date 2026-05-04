import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { GripHorizontal, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'council_window_bounds_v1';
const MIN_W = 520;
const MIN_H = 420;

export type WindowBounds = { left: number; top: number; width: number; height: number };

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function defaultBounds(): WindowBounds {
  if (typeof window === 'undefined') {
    return { left: 48, top: 48, width: 960, height: 640 };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = clamp(Math.min(1040, vw - 48), MIN_W, vw - 16);
  const height = clamp(Math.min(720, vh - 48), MIN_H, vh - 16);
  return {
    width,
    height,
    left: (vw - width) / 2,
    top: (vh - height) / 2,
  };
}

function loadBounds(): WindowBounds {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultBounds();
    const p = JSON.parse(raw) as Partial<WindowBounds>;
    if (
      typeof p.left === 'number' &&
      typeof p.top === 'number' &&
      typeof p.width === 'number' &&
      typeof p.height === 'number'
    ) {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
      return {
        left: p.left,
        top: p.top,
        width: clamp(p.width, MIN_W, vw - 16),
        height: clamp(p.height, MIN_H, vh - 16),
      };
    }
  } catch {
    /* ignore */
  }
  return defaultBounds();
}

function persistBounds(b: WindowBounds) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(b));
  } catch {
    /* ignore */
  }
}

function clampBounds(b: WindowBounds): WindowBounds {
  if (typeof window === 'undefined') return b;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = clamp(b.width, MIN_W, vw - 16);
  const height = clamp(b.height, MIN_H, vh - 16);
  const maxLeft = vw - 48;
  const maxTop = vh - 48;
  const left = clamp(b.left, 8, maxLeft);
  const top = clamp(b.top, 8, maxTop);
  return { left, top, width, height };
}

type Props = {
  children: ReactNode;
  className?: string;
  /** Collapse back to the root Council capsule */
  onMinimize?: () => void;
};

export function FloatingCouncilWindow({ children, className, onMinimize }: Props) {
  const [bounds, setBounds] = useState<WindowBounds>(() =>
    typeof window !== 'undefined' ? loadBounds() : defaultBounds(),
  );
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  useLayoutEffect(() => {
    setBounds((b) => clampBounds(b));
  }, []);

  useEffect(() => {
    function onWinResize() {
      setBounds((b) => clampBounds(b));
    }
    window.addEventListener('resize', onWinResize);
    return () => window.removeEventListener('resize', onWinResize);
  }, []);

  const onDragPointerDown = useCallback((e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startL = boundsRef.current.left;
    const startT = boundsRef.current.top;
    const move = (ev: PointerEvent) => {
      setBounds((p) =>
        clampBounds({
          ...p,
          left: startL + (ev.clientX - startX),
          top: startT + (ev.clientY - startY),
        }),
      );
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setBounds((b) => {
        const next = clampBounds(b);
        persistBounds(next);
        return next;
      });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }, []);

  const onResizePointerDown = useCallback((e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = boundsRef.current.width;
    const startH = boundsRef.current.height;
    const move = (ev: PointerEvent) => {
      setBounds((p) => {
        if (typeof window === 'undefined') return p;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const nw = clamp(startW + (ev.clientX - startX), MIN_W, vw - p.left - 8);
        const nh = clamp(startH + (ev.clientY - startY), MIN_H, vh - p.top - 8);
        return { ...p, width: nw, height: nh };
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setBounds((b) => {
        const next = clampBounds(b);
        persistBounds(next);
        return next;
      });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }, []);

  return (
    <div
      className={cn(
        'fixed z-[250] flex flex-col overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-black text-white shadow-[0_32px_90px_-28px_rgba(0,0,0,0.55)]',
        className,
      )}
      style={{
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
      }}
    >
      <div
        className="flex shrink-0 cursor-grab items-start justify-between gap-3 border-b border-white/[0.08] bg-black px-4 py-2.5 active:cursor-grabbing touch-none select-none"
        onPointerDown={onDragPointerDown}
      >
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2.5">
            <GripHorizontal className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-zinc-500">
              Your session
            </span>
          </div>
          <span className="block pl-6 text-[13px] font-semibold tracking-tight text-white">Council</span>
        </div>
        {onMinimize ? (
          <button
            type="button"
            data-no-drag
            aria-label="Minimize to capsule"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-white/[0.06] hover:text-white motion-safe:transition-colors"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
          >
            <Minimize2 className="h-4 w-4" strokeWidth={2} />
          </button>
        ) : null}
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-b-[1.55rem] bg-black">
        {children}
      </div>
      <button
        type="button"
        aria-label="Resize window"
        className="absolute bottom-2 right-2 z-[260] h-7 w-7 cursor-se-resize rounded-lg border border-white/15 bg-zinc-900 shadow-[inset_0_1px_0_oklch(1_0_0/0.06)] hover:bg-zinc-800 touch-none"
        onPointerDown={onResizePointerDown}
      />
    </div>
  );
}
