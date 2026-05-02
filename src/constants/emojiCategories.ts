/** Light UX upgrade: tabbed emoji picker (Phase 1 — no emoji-mart). */

export type EmojiCategory = { label: string; emojis: string[] };

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    label: 'Smileys',
    emojis: ['😀', '😁', '😂', '🤣', '😊', '😍', '🥰', '😘', '😎', '🤔', '😅', '🙄'],
  },
  {
    label: 'Gestures',
    emojis: ['👍', '👎', '👏', '🙏', '🤝', '✌️', '🫡', '💪', '🙌', '👋', '🔥', '💯'],
  },
  {
    label: 'Objects',
    emojis: ['📜', '📖', '🏛️', '⚔️', '🛡️', '🏮', '🍵', '🎭', '🧭', '⚙️', '📌', '✨'],
  },
  {
    label: 'Symbols',
    emojis: ['❤️', '💙', '✅', '❌', '❓', '💭', '⭐', '🌙', '☀️', '🌊', '🎯', '🏆'],
  },
];
