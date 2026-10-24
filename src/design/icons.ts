// Line icons on a 24 grid drawn in currentColor; replace a path here to restyle it everywhere. See docs/design.md
export const icons: Record<string, string> = {
  qr: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM18 18h3v3h-3z",
  words: "M4 6h16M4 12h16M4 18h10",
  plus: "M12 5v14M5 12h14",
  shield: "M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6zM9 12l2 2 4-4",
  lock: "M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 11V8a4 4 0 0 1 8 0v3",
  alert: "M12 4l9 16H3zM12 10v4M12 17h.01",
  check: "M5 12.5l4.5 4.5L19 7",
  chevron: "M9 6l6 6-6 6",
  back: "M15 6l-6 6 6 6",
  signature: "M4 17c2-6 4-9 5-9s0 6 2 6 3-4 4-4 1 3 3 3M4 20h16",
  key: "M11 11l8-8M16 6l2 2M14 8l2 2M12 14a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
};
export const icon = (name: string, size = 24) =>
  `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name]}"/></svg>`;
