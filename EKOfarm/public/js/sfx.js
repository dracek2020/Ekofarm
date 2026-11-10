// EKOfarm – zvuky skládané přímo v prohlížeči (WebAudio), žádné zvukové soubory ani cizí licence.

let actx = null;
let on = true;
try { on = localStorage.getItem('ekofarm_sound') !== 'off'; } catch { /* bez úložiště */ }

export const soundOn = () => on;
export function setSound(v) {
  on = v;
  try { localStorage.setItem('ekofarm_sound', v ? 'on' : 'off'); } catch { /* nevadí */ }
}

function audio() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC();
  }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
// zvuk smí začít až po dotyku – odemknout při prvním klepnutí
window.addEventListener('pointerdown', () => { if (on) audio(); }, { once: true });

// jeden tón: f = Hz, t = začátek (s), d = délka (s)
function tone(c, f, t, d, type = 'sine', vol = 0.18, slide = 0) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, c.currentTime + t);
  if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, c.currentTime + t + d);
  g.gain.setValueAtTime(0.0001, c.currentTime + t);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t + d);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + t);
  o.stop(c.currentTime + t + d + 0.02);
}

const SOUNDS = {
  tap: c => tone(c, 660, 0, 0.05, 'triangle', 0.08),
  plant: c => tone(c, 300, 0, 0.08, 'triangle', 0.1, 0.7),
  harvest: c => { tone(c, 520, 0, 0.07, 'triangle', 0.14); tone(c, 780, 0.05, 0.08, 'triangle', 0.12); },
  coin: c => { tone(c, 988, 0, 0.07, 'square', 0.06); tone(c, 1319, 0.07, 0.18, 'square', 0.06); },
  build: c => { tone(c, 180, 0, 0.09, 'square', 0.08); tone(c, 140, 0.1, 0.12, 'square', 0.08); },
  level: c => [523, 659, 784, 1047].forEach((f, i) => tone(c, f, i * 0.11, 0.22, 'triangle', 0.14)),
  error: c => tone(c, 200, 0, 0.16, 'sawtooth', 0.06, 0.8),
  engine: c => tone(c, 90, 0, 0.5, 'sawtooth', 0.05, 1.3),
};

let last = {};
export function sfx(name) {
  if (!on || !SOUNDS[name]) return;
  const c = audio();
  if (!c) return;
  const now = performance.now();
  if (now - (last[name] || 0) < 45) return;   // při tažení přes pole nehrát 20 zvuků naráz
  last[name] = now;
  try { SOUNDS[name](c); } catch { /* zvuk není důležitý */ }
}
