// একটা মূল রঙ (hex) থেকে পুরো অ্যাপের কালার প্যালেট (CSS ভ্যারিয়েবল) তৈরি করে।
// tailwind.config.js এই ভ্যারিয়েবলগুলোই ব্যবহার করে।

function hexToRgb(hex) {
  let h = String(hex || '').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [15, 121, 56]; // ভুল মান দিলে ডিফল্ট সবুজ
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

// weight = মূল রঙের ভাগ (০–১), বাকিটা base রঙের
const mix = (primary, base, weight) =>
  primary.map((c, i) => Math.round(c * weight + base[i] * (1 - weight)));

const v = (name, rgb) => `${name}:${rgb.join(' ')};`;

export function buildThemeCss(hex) {
  const p = hexToRgb(hex);
  const white = [255, 255, 255];
  const black = [0, 0, 0];

  const vars = [
    v('--c-primary', p),
    v('--c-primary-light', mix(p, white, 0.7)),
    v('--c-primary-dark', mix(p, black, 0.76)),

    v('--c-bg', mix(p, white, 0.05)),
    v('--c-bg-sidebar', mix(p, white, 0.08)),
    v('--c-border', mix(p, white, 0.11)),

    v('--c-dark-bg', mix(p, [14, 16, 15], 0.08)),
    v('--c-dark-card', mix(p, [26, 28, 27], 0.08)),
    v('--c-dark-sidebar', mix(p, [19, 22, 21], 0.08)),
    v('--c-dark-border', mix(p, [40, 44, 42], 0.08)),
  ];

  return `:root{${vars.join('')}}`;
}
