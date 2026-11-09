// ============================================================
//  סטודיו פוסטר ניאון – p5.js
//  Neon Poster Studio: rotating text brushes with a depth trail
//
//  הטקסט הוא המברשת: הוא מסתובב סביב העכבר, מאחוריו נגרר שובל
//  של מלבנים במעבר הצבעים של המילה, ומקדימה נוחת הטקסט החד
//  עם שוליים שחורים או לבנים.
//
//  מקשים:  S  שמירת הפוסטר כ-PNG   ·  Z  ביטול פעולה
//          C  ניקוי                ·  רווח  עצירת הסיבוב
//
//  The sketch loads its own fonts and styles: only sketch.js is needed.
// ============================================================

const W = 600, H = 800;                 // poster size
const TAU = Math.PI * 2;
let bgLayer, paintLayer;                // background and drawing are separate layers
let panel, tool, bgMode = 'purple';
let t = 0, speed = 1, paused = false, saveRequested = false;
const history = [];

const NEON = ['#ff3fd2', '#b14bff', '#3f7bff', '#2ee6ff', '#3dff9e', '#fff04f', '#ff8a3d', '#ffffff'];
const RAINBOW = ['#2ec4ff', '#4b5bff', '#a83cff', '#ff3fa8', '#ff6a3d', '#ffc23d'];

// fonts come from Google Fonts (see index.html); the rest are fallbacks
const FONTS = {
  script: '"Mr Dafoe", "Brush Script MT", cursive',
  lines:  'Monoton, Impact, sans-serif',
  block:  'Bungee, Impact, sans-serif',
  round:  'Audiowide, "Arial Black", sans-serif',
};
const STYLE_FONT = { tube: 'script', swoosh: 'script', disco: 'lines', rainbow: 'block', rings: 'round' };

// ------------------------------------------------------------
//  the 5 text brushes
// ------------------------------------------------------------
const BRUSHES = [
  { id: 'tube',    name: 'צינור ניאון', style: 'tube',    text: 'Neon Dreams', t1: '#ff3fd2', t2: '#ffffff', size: 70, orbitR: 110, orbitSpeed: .22 },
  { id: 'disco',   name: 'קווי דיסקו',  style: 'disco',   text: 'DISCO',       t1: '#ff3fd2', t2: '#3f7bff', size: 80, orbitR: 90,  orbitSpeed: -.3 },
  { id: 'rainbow', name: 'קשת רטרו',    style: 'rainbow', text: 'RADICAL',     t1: '#ffffff', t2: '#ff3fa8', size: 85, orbitR: 70,  orbitSpeed: .18 },
  { id: 'rings',   name: 'טבעות כרום',  style: 'rings',   text: '1984',        t1: '#ffffff', t2: '#ff3fd2', size: 60, orbitR: 130, orbitSpeed: .3 },
  { id: 'swoosh',  name: 'כתב מברשת',   style: 'swoosh',  text: 'Totally 80s', t1: '#ff3fd2', t2: '#fff04f', size: 75, orbitR: 100, orbitSpeed: -.2 },
].map(d => Object.assign({
  kind: 'brush',
  // face (the crisp text in front)
  angle: 0, spin: 0, align: false, glow: 1, alpha: .95, outline: 'auto', outlineW: .12,
  // trail (the depth behind the text)
  sliceShape: 'rect', sliceColor: 'word', g1: '#b43cff', g2: '#ffd23f', g3: '#3fa7ff',
  rectW: 1, rectH: 1.1, sliceSpin: .35, sliceAlpha: .6, spacing: 2.6, depthShrink: .35, midAmp: .35, midPer: 2.3,
  // oscillators – each with its own period
  sizeAmp: .2, sizePer: 1.9, angAmp: 10, angPer: 2.6, orbitAmp: 0, orbitPer: 2.71, speedWob: 0, wobPer: 3.37,
  // chaos
  rnd: 0, rtype: 'walk', pull: .04, jitAngle: 0, jitSize: 0, letterChaos: 0,
  // running state
  phi: Math.random() * TAU, spinA: 0, sliceSpinA: 0, dx: 0, dy: 0, vx: 0, vy: 0, prevPt: null, tacc: 0, head: null,
}, d));

// ------------------------------------------------------------
//  the 3 stamps
// ------------------------------------------------------------
const STAMPS = [
  { id: 'diamond',  name: 'חותמת: יהלום ניאון', c1: '#b14bff', c2: '#2ee6ff', size: 180 },
  { id: 'ring',     name: 'חותמת: טבעת ופסים',  c1: '#2ee6ff', c2: '#3f7bff', size: 200 },
  { id: 'cassette', name: 'חותמת: קסטה',        c1: '#ff3fd2', c2: '#fff04f', size: 150 },
].map(d => Object.assign({ kind: 'stamp', angle: 0, glow: 1 }, d));

// ============================================================
//  p5
// ============================================================
function setup() {
  injectStyle();                                   // fonts + panel look (no index.html needed)
  const wrap = createDiv('').class('nps-wrap');    // canvas on one side, controls on the other
  const stage = createDiv('').parent(wrap).class('nps-stage');
  const cnv = createCanvas(W, H);
  cnv.parent(stage);
  bgLayer = createGraphics(W, H);
  paintLayer = createGraphics(W, H);
  tool = BRUSHES[0];
  drawBackground();
  panel = createDiv('').parent(wrap).id('nps-panel');
  buildUI();
}

// the sketch brings its own fonts and styles, so it runs anywhere with just sketch.js
function injectStyle() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700&family=Mr+Dafoe&family=Monoton&family=Bungee&family=Audiowide&display=swap';
  document.head.appendChild(link);
  const css = document.createElement('style');
  css.textContent = `
    .nps-wrap { display: flex; gap: 16px; padding: 16px; width: fit-content; margin: 16px auto; background: #0b0812; border-radius: 8px; color: #f2ecff; font-family: Assistant, sans-serif; }
    .nps-stage canvas { display: block; margin: 0; box-shadow: 0 10px 50px rgba(0,0,0,.6); cursor: crosshair; }
    #nps-panel { direction: rtl; text-align: right; width: 340px; height: ${H}px; overflow: auto; background: #140e20;
                 border: 1px solid rgba(255,63,210,.25); border-radius: 6px; padding: 10px 14px; box-sizing: border-box; font-size: 13px; }
    #nps-panel .title { font-size: 18px; font-weight: 700; color: #fff; text-shadow: 0 0 10px #ff3fd2; }
    #nps-panel .hint { color: #a99fbd; font-size: 12px; margin: 2px 0 6px; }
    #nps-panel .h { font-weight: 700; margin: 14px 0 4px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,.12); }
    #nps-panel .row { margin: 6px 0; color: #c8bfdc; }
    #nps-panel .row .v { float: left; font-family: monospace; color: #fff; }
    #nps-panel .row input[type=range] { width: 100%; direction: ltr; accent-color: #ff3fd2; }
    #nps-panel .inline { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    #nps-panel select, #nps-panel .txt { background: #0d0916; color: #fff; border: 1px solid rgba(255,255,255,.2); border-radius: 3px; padding: 4px 6px; font: inherit; }
    #nps-panel .txt { width: 100%; box-sizing: border-box; direction: ltr; font-size: 15px; }
    #nps-panel .chk { margin: 6px 0; color: #c8bfdc; }
    #nps-panel .btns { display: flex; gap: 6px; margin: 8px 0; }
    #nps-panel button { flex: 1; background: transparent; color: #fff; border: 1px solid rgba(255,255,255,.25); border-radius: 3px; padding: 6px; font: inherit; cursor: pointer; }
    #nps-panel button:hover { border-color: #ff3fd2; }
    #nps-panel .sub { color: #a99fbd; font-size: 12.5px; line-height: 1.45; margin: 2px 0 6px; }
    #nps-panel .group { font-weight: 700; letter-spacing: 1px; color: #a99fbd; margin: 12px 0 6px; font-size: 12px; }
    #nps-panel .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    #nps-panel .card { flex: none; display: block; padding: 3px 2px 6px; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.13);
                       border-radius: 5px; font-size: 11.5px; line-height: 1.2; color: #f2ecff; text-align: center; }
    #nps-panel .card canvas { display: block; width: 100%; height: 44px; margin: 0 0 3px; box-shadow: none; }
    #nps-panel .card.on { border-color: #ff3fd2; background: rgba(255,63,210,.14); box-shadow: 0 0 10px rgba(255,63,210,.35); }`;
  document.head.appendChild(css);
}

function draw() {
  const dt = Math.min(deltaTime / 1000, .05);
  const sp = paused ? 0 : speed;
  t += dt * sp;

  const inside = mouseX >= 0 && mouseX <= W && mouseY >= 0 && mouseY <= H;
  if (tool.kind === 'brush') stepBrush(tool, dt, sp, ptr.down);

  image(bgLayer, 0, 0, W, H);
  image(paintLayer, 0, 0, W, H);

  if (saveRequested) { saveCanvas('neon-poster', 'png'); saveRequested = false; return; }
  if (inside || ptr.down) drawOverlay(drawingContext);
}

// ------------------------------------------------------------
//  mouse and keys
// ------------------------------------------------------------
const ptr = { down: false, px: null, py: null };
const insideCanvas = () => mouseX >= 0 && mouseX <= W && mouseY >= 0 && mouseY <= H;

function mousePressed() {
  if (!insideCanvas()) return;                // clicks on the panel are ignored
  pushUndo();
  if (tool.kind === 'stamp') { placeStamp(tool, mouseX, mouseY); return; }
  ptr.down = true; ptr.px = mouseX; ptr.py = mouseY;
  Object.assign(tool, { prevPt: null, tacc: 0, head: null });
}
function mouseReleased() {
  if (ptr.down) commitHead(tool);
  ptr.down = false;
}
function keyPressed() {
  if (document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement.type === 'text') return;
  if (key === 's' || key === 'S') saveRequested = true;
  if (key === 'z' || key === 'Z') undo();
  if (key === 'c' || key === 'C') clearPaint();
  if (key === ' ') { paused = !paused; return false; }
}

// ============================================================
//  helpers
// ============================================================
const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const mixHex = (a, b, f) => { const A = hexRGB(a), B = hexRGB(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * f)).join(',')})`; };
const lum = h => { const [r, g, b] = hexRGB(h); return (.299 * r + .587 * g + .114 * b) / 255; };
const R1 = () => Math.random() * 2 - 1;

// neon line: a wide glowing pass + a thin bright core
function neon(g, path, color, w, glow) {
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  g.shadowColor = color; g.shadowBlur = (w * 3 + 6) * glow;
  g.strokeStyle = color; g.lineWidth = w; path(); g.stroke();
  g.shadowBlur = (w + 2) * glow * .6; g.strokeStyle = mixHex(color, '#ffffff', .65); g.lineWidth = Math.max(.6, w * .32); path(); g.stroke();
  g.restore();
}

// font size that makes `str` exactly `width` wide
function fitFont(g, str, fam, width) {
  g.save(); g.font = `100px ${fam}`; const w = g.measureText(str).width || 100; g.restore();
  return Math.max(4, 100 * width / w);
}

// draw a word letter by letter; with chaos > 0 each letter jumps, tilts and scales on its own.
// the randomness is seeded so the outline and the face scatter the same way.
let LSEED = 7;
function letters(g, str, fs, chaos, drawFn) {
  g.textAlign = 'left'; g.textBaseline = 'middle';
  const total = g.measureText(str).width;
  if (!(chaos > 0)) { drawFn(str, -total / 2, 0); return; }
  let sd = LSEED; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647 * 2 - 1; };
  let x = -total / 2;
  for (const ch of str) {
    const cw = g.measureText(ch).width;
    g.save();
    g.translate(x + cw / 2 + r() * fs * .45 * chaos, r() * fs * .7 * chaos);
    g.rotate(r() * 1.1 * chaos);
    const k = 1 + r() * .45 * chaos; g.scale(k, k);
    drawFn(ch, -cw / 2, 0);
    g.restore();
    x += cw;
  }
}

// ============================================================
//  text styles (s = half the width of the word)
// ============================================================
const TEXT_STYLES = {
  tube(g, str, s, c1, c2, b) {                       // glowing tube script
    const fs = fitFont(g, str, FONTS.script, 2 * s);
    g.font = `${fs}px ${FONTS.script}`;
    g.shadowColor = c1; g.shadowBlur = fs * .35 * b.glow;
    letters(g, str, fs, b.letterChaos, (c, x, y) => { g.fillStyle = c1; g.fillText(c, x, y); });
    g.shadowBlur = fs * .08 * b.glow; g.globalAlpha *= .75;
    letters(g, str, fs, b.letterChaos, (c, x, y) => { g.fillStyle = mixHex(c1, '#ffffff', .7); g.fillText(c, x, y); });
  },
  disco(g, str, s, c1, c2, b) {                      // multi-line letters with a gradient
    const fs = fitFont(g, str, FONTS.lines, 2 * s);
    g.font = `${fs}px ${FONTS.lines}`;
    const gr = g.createLinearGradient(0, -fs * .5, 0, fs * .5); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    g.shadowColor = c1; g.shadowBlur = fs * .3 * b.glow;
    letters(g, str, fs, b.letterChaos, (c, x, y) => { g.fillStyle = gr; g.fillText(c, x, y); });
  },
  rainbow(g, str, s, c1, c2, b) {                    // rainbow extrusion behind a white face
    const fs = fitFont(g, str, FONTS.block, 2 * s);
    g.font = `${fs}px ${FONTS.block}`;
    const d = fs * .07;
    letters(g, str, fs, b.letterChaos, (c, x, y) => {
      for (let i = RAINBOW.length - 1; i >= 0; i--) { g.shadowBlur = 0; g.fillStyle = RAINBOW[i]; g.fillText(c, x + d * (i + 1) * .6, y + d * (i + 1)); }
      g.shadowColor = c1; g.shadowBlur = fs * .08 * b.glow; g.fillStyle = c1; g.fillText(c, x, y);
    });
  },
  rings(g, str, s, c1, c2, b) {                      // outline as nested neon strokes
    const fs = fitFont(g, str, FONTS.round, 2 * s);
    g.font = `${fs}px ${FONTS.round}`; g.lineJoin = 'round';
    const w = Math.max(1, fs * .05);
    letters(g, str, fs, b.letterChaos, (c, x, y) => {
      g.shadowColor = c2; g.shadowBlur = fs * .25 * b.glow; g.strokeStyle = c2; g.lineWidth = w * 3.2; g.strokeText(c, x, y);
      g.shadowBlur = 0; g.strokeStyle = '#000'; g.lineWidth = w * 2; g.strokeText(c, x, y);
      g.shadowColor = c1; g.shadowBlur = fs * .12 * b.glow; g.strokeStyle = c1; g.lineWidth = w; g.strokeText(c, x, y);
      g.shadowBlur = 0; g.strokeStyle = '#fff'; g.lineWidth = w * .35; g.strokeText(c, x, y);
    });
  },
  swoosh(g, str, s, c1, c2, b) {                     // brush script with a swoosh
    const fs = fitFont(g, str, FONTS.script, 2 * s);
    g.save(); g.rotate(-.14);
    g.font = `${fs}px ${FONTS.script}`;
    g.shadowColor = c1; g.shadowBlur = fs * .2 * b.glow;
    letters(g, str, fs, b.letterChaos, (c, x, y) => { g.fillStyle = c1; g.fillText(c, x, y); });
    g.strokeStyle = c2; g.shadowColor = c2; g.lineCap = 'round'; g.lineWidth = Math.max(1.5, fs * .07);
    g.beginPath(); g.moveTo(-s * .95, fs * .42); g.quadraticCurveTo(0, fs * .26, s * 1.08, fs * .32); g.stroke();
    g.restore();
  },
};

// ============================================================
//  brush engine
// ============================================================
// random push on the brush position
function disturb(b, k) {
  const J = b.rnd; if (J <= 0 && !b.dx && !b.dy) return;
  if (b.rtype === 'walk') {                // random walk with memory
    const kk = Math.sqrt(k), damp = Math.pow(.94, k);
    b.vx = (b.vx + R1() * 3.4 * J * kk) * damp; b.vy = (b.vy + R1() * 3.4 * J * kk) * damp;
    b.dx += b.vx * k; b.dy += b.vy * k;
  } else if (b.rtype === 'shake') {        // no memory at all
    b.dx = R1() * 50 * J; b.dy = R1() * 50 * J; return;
  } else if (Math.random() < .1 * J * k) { // sudden jumps
    const a = Math.random() * TAU, r = 30 + Math.random() * 150 * J;
    b.dx += Math.cos(a) * r; b.dy += Math.sin(a) * r;
  }
  b.dx -= b.dx * b.pull * k * 4; b.dy -= b.dy * b.pull * k * 4;
}

// one frame of the brush: move around the mouse in small sub-steps
function stepBrush(b, dt, sp, drawing) {
  const SUB = 12, pts = b.prevPt ? [b.prevPt] : [];
  const fx = ptr.px ?? mouseX, fy = ptr.py ?? mouseY, t0 = t - dt * sp;
  for (let s = 1; s <= SUB; s++) {
    const k = s / SUB, tt = t0 + dt * sp * k;
    // rotation around the mouse (its speed oscillates)
    b.phi += TAU * b.orbitSpeed * (1 + b.speedWob * Math.sin(TAU * tt / b.wobPer)) * dt * sp / SUB;
    b.spinA += TAU * b.spin * dt * sp / SUB;
    b.sliceSpinA += TAU * b.sliceSpin * dt * sp / SUB;
    disturb(b, 60 * dt * sp / SUB);
    const mx = fx + (mouseX - fx) * k, my = fy + (mouseY - fy) * k;
    const oR = b.orbitR * Math.max(0, 1 + b.orbitAmp * Math.sin(TAU * tt / b.orbitPer));   // radius oscillates
    const x = mx + oR * Math.cos(b.phi) + b.dx, y = my + oR * Math.sin(b.phi) + b.dy;
    b.pos = { x, y };
    if (drawing) pts.push({ x, y });
  }
  if (drawing) { drawTrail(b, pts); ptr.px = mouseX; ptr.py = mouseY; }
  b.prevPt = drawing ? pts[pts.length - 1] : null;
}

// position, size and angle of the face at time tt
function headPose(b, x, y, tang, tt) {
  const k = Math.max(.05, 1 + b.sizeAmp * Math.sin(TAU * tt / b.sizePer));
  const ang = (b.angle + b.angAmp * Math.sin(TAU * tt / b.angPer)) * Math.PI / 180 + b.spinA + (b.align ? tang : 0);
  return { x, y, ang, k, tt };
}

// the word's own colours, used for its trail
function wordStops(b) { return b.style === 'rainbow' ? RAINBOW : [b.t1, mixHex(b.t1, b.t2, .5), b.t2]; }

// the trail: a slice every few pixels; newer slices cover older ones → depth
function drawTrail(b, pts) {
  if (pts.length < 2 || !b.text) return;
  const g = paintLayer.drawingContext;
  const fam = FONTS[STYLE_FONT[b.style]];
  const fs = fitFont(g, b.text, fam, 2 * b.size);
  const gap = Math.max(1, b.spacing * 2.2);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], c = pts[i], L = Math.hypot(c.x - a.x, c.y - a.y); if (!L) continue;
    const tang = Math.atan2(c.y - a.y, c.x - a.x);
    let pos = 0;
    while (pos + (gap - b.tacc) <= L) {
      pos += gap - b.tacc; b.tacc = 0;
      const x = a.x + (c.x - a.x) * pos / L, y = a.y + (c.y - a.y) * pos / L;
      const h = headPose(b, x, y, tang, t);
      drawSlice(g, b, h, fs, fam);
      b.head = h;
    }
    b.tacc += L - pos;
  }
}

function drawSlice(g, b, h, fs, fam) {
  const kk = h.k * (1 - b.depthShrink * .25) * Math.max(.1, 1 + R1() * b.jitSize * .3);
  const rect = b.sliceShape === 'rect';
  const W2 = b.size * (rect ? b.rectW : 1), H2 = fs * (rect ? b.rectH : .5);
  g.save();
  g.translate(h.x, h.y);
  g.rotate(h.ang + (rect ? b.sliceSpinA : 0) + R1() * b.jitAngle * Math.PI / 360);
  g.scale(kk, kk);
  // fill: gradient across the slice; the middle colour slides back and forth
  const stops = b.sliceColor === 'word' ? wordStops(b) : [b.g1, b.g2, b.g3];
  const gr = g.createLinearGradient(-W2, 0, W2, 0);
  if (stops.length === 3) {
    const m = Math.min(.95, Math.max(.05, .5 + b.midAmp * .45 * Math.sin(TAU * t / b.midPer)));
    gr.addColorStop(0, stops[0]); gr.addColorStop(m, stops[1]); gr.addColorStop(1, stops[2]);
  } else stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
  g.globalAlpha = b.alpha * b.sliceAlpha; g.fillStyle = gr;
  if (rect) g.fillRect(-W2, -H2 / 2, W2 * 2, H2);
  else { g.font = `${fs}px ${fam}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(b.text, 0, 0); }
  g.restore();
}

// the crisp word in front, with a black or white margin that separates it from the trail
function outlineColor(b) {
  if (b.outline === 'black') return '#000000';
  if (b.outline === 'white') return '#ffffff';
  const L = b.style === 'rainbow' ? lum(b.t1) : (lum(b.t1) + lum(b.t2)) / 2;
  return L > .45 ? '#000000' : '#ffffff';
}
function drawFace(g, b, h) {
  g.save(); g.translate(h.x, h.y); g.rotate(h.ang); g.globalAlpha = b.alpha;
  if (b.outline !== 'none' && b.outlineW > 0) {
    const fam = FONTS[STYLE_FONT[b.style]], fs = fitFont(g, b.text, fam, 2 * b.size * h.k), oc = outlineColor(b);
    g.save(); if (b.style === 'swoosh') g.rotate(-.14);
    g.font = `${fs}px ${fam}`; g.lineJoin = 'round'; g.lineCap = 'round';
    g.fillStyle = oc; g.strokeStyle = oc; g.lineWidth = fs * b.outlineW * 2;
    const ex = b.style === 'rainbow' ? fs * .07 * RAINBOW.length * .6 : 0, ey = b.style === 'rainbow' ? fs * .07 * RAINBOW.length : 0;
    LSEED = 7;
    letters(g, b.text, fs, b.letterChaos, (c, x, y) => {
      g.strokeText(c, x, y); g.fillText(c, x, y);
      if (ex) { g.strokeText(c, x + ex, y + ey); g.fillText(c, x + ex, y + ey); }
    });
    if (b.style === 'swoosh') {
      g.lineWidth = Math.max(1.5, fs * .07) + fs * b.outlineW * 2;
      g.beginPath(); g.moveTo(-b.size * h.k * .95, fs * .42); g.quadraticCurveTo(0, fs * .26, b.size * h.k * 1.08, fs * .32); g.stroke();
    }
    g.restore();
  }
  LSEED = 7;
  TEXT_STYLES[b.style](g, b.text, b.size * h.k, b.t1, b.t2, b);
  g.restore();
}
// when the stroke ends, the face lands on the poster on top of its trail
function commitHead(b) {
  if (b && b.kind === 'brush' && b.head) drawFace(paintLayer.drawingContext, b, b.head);
  if (b) b.head = null;
}

// ============================================================
//  stamps
// ============================================================
const STAMP_DRAW = {
  diamond(g, s, c1, c2, glow) {
    const sq = k => () => { g.beginPath(); g.moveTo(0, -s * k); g.lineTo(s * k, 0); g.lineTo(0, s * k); g.lineTo(-s * k, 0); g.closePath(); };
    neon(g, sq(1), c1, Math.max(2, s * .035), glow);
    neon(g, sq(.84), c2, Math.max(1.5, s * .025), glow);
    neon(g, () => { g.beginPath(); g.moveTo(-s * .25, -s * .62); g.lineTo(s * .25, -s * .62); g.moveTo(-s * .25, s * .62); g.lineTo(s * .25, s * .62); }, c2, Math.max(1.5, s * .025), glow);
  },
  ring(g, s, c1, c2, glow) {
    neon(g, () => { g.beginPath(); g.ellipse(0, 0, s * .92, s * .82, -.15, 0, TAU); }, c1, Math.max(2, s * .04), glow);
    for (let i = 0; i < 4; i++) {
      const y = -s * .45 + i * s * .3, x0 = -s * 1.15 + i * s * .05;
      neon(g, () => { g.beginPath(); for (let k = 0; k < 3; k++) { const a = x0 + k * s * .8, bb = a + s * .5; g.moveTo(a, y + (a + s) * .35); g.lineTo(bb, y + (bb + s) * .35); } }, c2, Math.max(1.5, s * .03), glow);
    }
  },
  cassette(g, s, c1, c2, glow) {
    const w = s * 1.6, h = s * 1.02, lw = Math.max(1.5, s * .03);
    const rr = (x, y, ww, hh) => () => { g.beginPath(); g.rect(x, y, ww, hh); };
    neon(g, rr(-w / 2, -h / 2, w, h), c1, lw * 1.3, glow);
    neon(g, rr(-w * .42, -h * .38, w * .84, h * .5), c2, lw, glow);
    for (const sx of [-1, 1]) {
      const cx = sx * w * .2, cy = -h * .13, R = h * .13;
      neon(g, () => { g.beginPath(); g.arc(cx, cy, R, 0, TAU); }, c1, lw, glow);
      neon(g, () => { g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; g.moveTo(cx + Math.cos(a) * R * .35, cy + Math.sin(a) * R * .35); g.lineTo(cx + Math.cos(a) * R * .7, cy + Math.sin(a) * R * .7); } }, c1, lw * .7, glow);
    }
    neon(g, rr(-w * .1, -h * .2, w * .2, h * .14), c2, lw * .8, glow);
    neon(g, () => { g.beginPath(); g.moveTo(-w * .3, h * .5); g.lineTo(-w * .24, h * .25); g.lineTo(w * .24, h * .25); g.lineTo(w * .3, h * .5); }, c1, lw, glow);
  },
};
function placeStamp(s, x, y) {
  const g = paintLayer.drawingContext;
  g.save(); g.translate(x, y); g.rotate(s.angle * Math.PI / 180);
  STAMP_DRAW[s.id](g, s.size / 2, s.c1, s.c2, s.glow);
  g.restore();
}

// ============================================================
//  overlay: orbit, live face, stamp preview (not part of the poster)
// ============================================================
function drawOverlay(g) {
  g.save();
  if (tool.kind === 'brush') {
    const b = tool;
    if (b.orbitR > 2) {
      g.strokeStyle = b.t1; g.globalAlpha = .35; g.setLineDash([3, 6]); g.lineWidth = 1;
      g.beginPath(); g.arc(mouseX, mouseY, b.orbitR, 0, TAU); g.stroke(); g.setLineDash([]);
    }
    g.globalAlpha = 1;
    if (b.head) drawFace(g, b, b.head);
    if (b.pos) { g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.beginPath(); g.arc(b.pos.x, b.pos.y, 6, 0, TAU); g.stroke(); }
  } else {
    g.globalAlpha = .45; g.translate(mouseX, mouseY); g.rotate(tool.angle * Math.PI / 180);
    STAMP_DRAW[tool.id](g, tool.size / 2, tool.c1, tool.c2, .3);
  }
  g.restore();
}

// ============================================================
//  backgrounds
// ============================================================
const BGS = {
  purple: ['סגול לילה', g => { const gr = g.createRadialGradient(W / 2, H * .45, 0, W / 2, H * .45, H * .8); gr.addColorStop(0, '#2a0d40'); gr.addColorStop(1, '#06020b'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }],
  black:  ['שחור', g => { g.fillStyle = '#050308'; g.fillRect(0, 0, W, H); }],
  bricks: ['קיר לבנים', g => {
    g.fillStyle = '#0d0709'; g.fillRect(0, 0, W, H);
    for (let y = 0, row = 0; y < H; y += 26, row++)
      for (let x = -(row % 2) * 32; x < W; x += 64) { g.fillStyle = `hsl(${350 + Math.random() * 15},35%,${10 + Math.random() * 9}%)`; g.fillRect(x + 2, y + 2, 60, 22); }
    const v = g.createRadialGradient(W / 2, H / 2, H * .2, W / 2, H / 2, H * .75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.8)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }],
  stars:  ['כוכבים', g => {
    g.fillStyle = '#04030a'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < W * H / 2500; i++) { g.fillStyle = `rgba(255,255,255,${.3 + Math.random() * .7})`; g.beginPath(); g.arc(Math.random() * W, Math.random() * H, Math.random() < .08 ? 1.6 : .7, 0, TAU); g.fill(); }
  }],
  synth:  ['רשת אופק', g => {
    const sky = g.createLinearGradient(0, 0, 0, H * .62); sky.addColorStop(0, '#07020f'); sky.addColorStop(1, '#3a0b4a');
    g.fillStyle = sky; g.fillRect(0, 0, W, H); g.fillStyle = '#05020a'; g.fillRect(0, H * .62, W, H);
    const hy = H * .62; g.save(); g.strokeStyle = '#ff3fd2'; g.shadowColor = '#ff3fd2'; g.shadowBlur = 10; g.lineWidth = 1.5;
    for (let i = -12; i <= 12; i++) { g.beginPath(); g.moveTo(W / 2 + i * 14, hy); g.lineTo(W / 2 + i * 130, H); g.stroke(); }
    for (let k = 1; k < 12; k++) { const y = hy + (H - hy) * Math.pow(k / 11, 2.2); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.restore();
  }],
  memphis:['ממפיס', g => {
    g.fillStyle = '#0a0710'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 2; g.lineCap = 'round';
    for (let i = 0; i < W * H / 700; i++) {
      const x = Math.random() * W, y = Math.random() * H, a = Math.random() * TAU, l = 7 + Math.random() * 10;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 1) * l, y + Math.sin(a + 1) * l, x + Math.cos(a) * l * 1.4, y + Math.sin(a) * l * 1.4); g.stroke();
    }
  }],
};
function drawBackground() { BGS[bgMode][1](bgLayer.drawingContext); }

// ============================================================
//  undo / clear (copies of the paint layer)
// ============================================================
function pushUndo() {
  const src = paintLayer.elt, c = document.createElement('canvas');
  c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0);
  history.push(c); if (history.length > 12) history.shift();
}
function restoreFrom(c) {
  const g = paintLayer.drawingContext;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, paintLayer.elt.width, paintLayer.elt.height);
  if (c) g.drawImage(c, 0, 0);
  g.restore();
}
function undo() { const c = history.pop(); if (c) restoreFrom(c); }
function clearPaint() { pushUndo(); restoreFrom(null); }

// ============================================================
//  control panel (p5 DOM)
// ============================================================
function heading(txt) { createDiv(txt).parent(panel).class('h'); }
function slider(label, obj, key, min, max, step) {
  const row = createDiv('').parent(panel).class('row');
  createSpan(label).parent(row);
  const out = createSpan(String(+obj[key].toFixed(2))).parent(row).class('v');
  const s = createSlider(min, max, obj[key], step).parent(row);
  s.input(() => { obj[key] = +s.value(); out.html(String(+obj[key].toFixed(2))); });
}
function colorPick(label, obj, key) {
  const row = createDiv('').parent(panel).class('row inline');
  createSpan(label).parent(row);
  const cp = createColorPicker(obj[key]).parent(row);
  cp.input(() => { obj[key] = cp.value(); });
}
function choice(label, obj, key, options, rebuild) {
  const row = createDiv('').parent(panel).class('row inline');
  createSpan(label).parent(row);
  const sel = createSelect().parent(row);
  options.forEach(([v, l]) => sel.option(l, v));
  sel.selected(obj[key]);
  sel.changed(() => { obj[key] = sel.value(); if (rebuild) buildUI(); });
}
function check(label, obj, key) {
  const cb = createCheckbox(' ' + label, obj[key]).parent(panel).class('chk');
  cb.changed(() => { obj[key] = cb.checked(); });
}
function button(label, fn, parent) { createButton(label).parent(parent || panel).mousePressed(fn); }

function buildUI() {
  panel.html('');
  createDiv('סטודיו פוסטר ניאון').parent(panel).class('title');
  createDiv('S שמירה · Z ביטול · C ניקוי · רווח עצירה').parent(panel).class('hint');

  createDiv('הטקסט הוא המברשת. מקדימה הטקסט החד, ומאחוריו שובל שנותן לו עומק. המברשת מסתובבת סביב העכבר, ואוסילטורים וכאוס משנים אותה כל הזמן. החותמות נוחתות בלחיצה אחת.').parent(panel).class('sub');

  // tool picker: cards with a small preview of each brush and stamp
  createDiv('מברשות').parent(panel).class('group');
  toolCards(BRUSHES);
  createDiv('חותמות').parent(panel).class('group');
  toolCards(STAMPS);

  const o = tool;
  if (o.kind === 'brush') {
    heading('הטקסט');
    const inp = createInput(o.text).parent(panel).class('txt');
    inp.input(() => { o.text = inp.value(); });
    slider('גודל', o, 'size', 10, 260, 1);
    colorPick('צבע', o, 't1'); colorPick('צבע שני', o, 't2');
    choice('שוליים', o, 'outline', [['auto', 'אוטומטי'], ['black', 'שחור'], ['white', 'לבן'], ['none', 'בלי']]);
    slider('עובי שוליים', o, 'outlineW', 0, .4, .005);
    slider('זווית', o, 'angle', -180, 180, 1);
    slider('סיבוב עצמי', o, 'spin', -2, 2, .01);
    check('מסתובב עם כיוון הקו', o, 'align');
    slider('זוהר', o, 'glow', 0, 2, .01);

    heading('הסיבוב סביב העכבר');
    slider('רדיוס', o, 'orbitR', 0, 320, 1);
    slider('מהירות וכיוון', o, 'orbitSpeed', -2, 2, .01);

    heading('שובל העומק');
    choice('צורה', o, 'sliceShape', [['rect', 'מלבנים'], ['font', 'צורת הפונט']], true);
    choice('צבעים', o, 'sliceColor', [['word', 'צבעי המילה'], ['free', '3 צבעים חופשי']], true);
    if (o.sliceColor === 'free') { colorPick('צבע 1', o, 'g1'); colorPick('צבע 2', o, 'g2'); colorPick('צבע 3', o, 'g3'); }
    slider('צפיפות (קטן = צפוף)', o, 'spacing', .2, 10, .1);
    if (o.sliceShape === 'rect') {
      slider('רוחב מלבן', o, 'rectW', .1, 3, .01);
      slider('גובה מלבן', o, 'rectH', .1, 4, .01);
      slider('סיבוב המלבנים', o, 'sliceSpin', -3, 3, .01);
    }
    slider('שקיפות השובל', o, 'sliceAlpha', .03, 1, .01);
    slider('עומק', o, 'depthShrink', 0, 1, .01);
    slider('צבע אמצעי זז', o, 'midAmp', 0, 1, .01);
    slider('מחזור', o, 'midPer', .2, 8, .01);

    heading('אוסילטורים');
    slider('גודל מתנודד', o, 'sizeAmp', 0, .95, .01); slider('מחזור', o, 'sizePer', .2, 8, .01);
    slider('זווית מתנדנדת', o, 'angAmp', 0, 180, 1);   slider('מחזור', o, 'angPer', .2, 8, .01);
    slider('רדיוס מתנודד', o, 'orbitAmp', 0, 1, .01);  slider('מחזור', o, 'orbitPer', .2, 8, .01);
    slider('מהירות מתנודדת', o, 'speedWob', 0, 2, .01); slider('מחזור', o, 'wobPer', .2, 8, .01);

    heading('כאוס');
    choice('סוג שיבוש', o, 'rtype', [['walk', 'הילוך מקרי'], ['shake', 'רעד'], ['jump', 'קפיצות']]);
    slider('שיבוש המיקום', o, 'rnd', 0, 1, .01);
    slider('משיכה חזרה', o, 'pull', 0, .2, .001);
    slider('זווית אקראית', o, 'jitAngle', 0, 180, 1);
    slider('גודל אקראי', o, 'jitSize', 0, .9, .01);
    slider('פירוק האותיות', o, 'letterChaos', 0, 1, .01);
    const r = createDiv('').parent(panel).class('btns');
    button('כאוס אקראי', () => { makeChaotic(o); buildUI(); }, r);
    button('בלי כאוס', () => { Object.assign(o, { rnd: 0, orbitAmp: 0, speedWob: 0, jitAngle: 0, jitSize: 0, letterChaos: 0, dx: 0, dy: 0 }); buildUI(); }, r);
  } else {
    heading(o.name);
    slider('גודל', o, 'size', 30, 600, 1);
    slider('זווית', o, 'angle', -180, 180, 1);
    slider('זוהר', o, 'glow', 0, 2, .01);
    colorPick('צבע 1', o, 'c1'); colorPick('צבע 2', o, 'c2');
  }

  heading('הפוסטר');
  const bg = { v: bgMode };
  choice('רקע', bg, 'v', Object.entries(BGS).map(([k, v]) => [k, v[0]]));
  panel.elt.lastChild.querySelector('select').addEventListener('change', e => { bgMode = e.target.value; drawBackground(); });
  const sp = { v: speed };
  slider('מהירות כללית', sp, 'v', 0, 3, .01);
  panel.elt.lastChild.querySelector('input').addEventListener('input', e => { speed = +e.target.value; });
  const r2 = createDiv('').parent(panel).class('btns');
  button('ביטול', undo, r2);
  button('ניקוי', clearPaint, r2);
  button('שמירה כ-PNG', () => { saveRequested = true; }, r2);
}

// a grid of cards; clicking one picks that tool
function toolCards(list) {
  const grid = createDiv('').parent(panel).class('cards');
  for (const x of list) {
    const card = createButton('').parent(grid).class('card' + (x === tool ? ' on' : ''));
    const cv = document.createElement('canvas');
    card.elt.appendChild(cv);
    card.elt.appendChild(document.createTextNode(x.name.replace('חותמת: ', '')));
    card.mousePressed(() => { commitHead(tool); tool = x; buildUI(); });
    drawPreview(cv, x);
  }
}
// draw a tool's preview into a small canvas (again once the fonts have loaded)
function drawPreview(cv, x) {
  const paint = () => {
    const r = window.devicePixelRatio || 1, w = 100, h = 44;
    cv.width = w * r; cv.height = h * r;
    const g = cv.getContext('2d'); g.setTransform(r, 0, 0, r, 0, 0); g.clearRect(0, 0, w, h);
    g.save(); g.translate(w / 2, h / 2);
    if (x.kind === 'brush') TEXT_STYLES[x.style](g, x.text, w * .42, x.t1, x.t2, Object.assign({}, x, { letterChaos: 0, glow: .6 }));
    else STAMP_DRAW[x.id](g, h * .42, x.c1, x.c2, .5);
    g.restore();
  };
  paint();
  if (document.fonts) document.fonts.ready.then(paint);
}

// random chaos with periods that don't line up
function makeChaotic(b) {
  const per = () => +(.7 + Math.random() * 4.3).toFixed(2) + .13;
  Object.assign(b, {
    rnd: +(.2 + Math.random() * .5).toFixed(2), rtype: ['walk', 'shake', 'jump'][Math.floor(Math.random() * 3)],
    orbitAmp: +(.2 + Math.random() * .6).toFixed(2), orbitPer: per(),
    speedWob: +(.3 + Math.random() * 1.2).toFixed(2), wobPer: per(),
    sizeAmp: +(.2 + Math.random() * .5).toFixed(2), sizePer: per(),
    angAmp: Math.round(10 + Math.random() * 50), angPer: per(),
    jitAngle: Math.round(Math.random() * 50), jitSize: +(Math.random() * .4).toFixed(2),
    letterChaos: +(.1 + Math.random() * .5).toFixed(2),
  });
}