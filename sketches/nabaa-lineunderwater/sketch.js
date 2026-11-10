// ===== Underwater Chalk Lines – p5.js =====
// Draw with the mouse or a finger (phone / iPad).
// The last 3px of each line stay fixed; the rest moves like a hair in water:
// it takes random steps RIGHT (1–50px) then LEFT (1–50px), each step built on the
// previous one, forever. The motion travels from the fixed end along the hair.
// Lines that touch push each other – the collision spreads along both lines.
// The side panel sets the NEXT line only – lines already drawn keep their own settings.
// Paste into editor.p5js.org and press Play.

// ---------- PARAMETERS ----------
const BG_COLOR   = '#F5F0E6';
const INK        = [9, 37, 28];   // #09251C
const LINE_W     = 4;             // px – total chalk line width
const ALPHA_START = 1.0;          // opacity at the start of the line (100%)
const ALPHA_END   = 0.3;          // opacity at the end of the line (30%)

const SPACING    = 4;             // px between stored points
const FIXED_LEN  = 3;             // px at the end of the line that never move
const RAMP_LEN   = 120;           // px over which the motion grows from 0 to full

// motion – these are the panel defaults; each line saves its own copy
const DEFAULTS = {
  stepMax: 50,     // px – biggest random step right/left        (slider)
  speed:   20,     // px per second the hair travels per step     (slider)
  flow:    6,      // ms per px – how slowly the motion travels along the hair (slider)
  drift:   120,    // px – the hair never wanders further than this from its drawn place (slider)
  hit:     0.6,    // how strongly touching lines push            (slider)
};
const STEP_MIN   = 1;             // px – smallest step
const UPDOWN     = 0.2;           // a little up–down movement too (0 = only left–right)
const HIT_DIST   = 8;             // px – lines closer than this "touch"
const STIFFNESS  = 0.08;          // how closely the hair follows its steps
const SPRING     = 0.15;          // how much a push spreads along the line
const DAMPING    = 0.85;          // 0..1 – energy kept each frame

// chalk texture
const STRANDS    = 3;             // thin strands that make one chalk line
const SKIP_CHANCE = 0.12;         // chance a strand skips a segment (chalk gaps)
const GRAIN      = 2;             // dust dots per point

// ---------- STATE ----------
let lines = [];
let current = null;
let drawing = false;
let panel, sliders = {};

function setup() {
  const c = createCanvas(windowWidth, windowHeight);
  c.style('touch-action', 'none');       // no scrolling/zoom while drawing on touch screens
  pixelDensity(min(2, pixelDensity()));
  buildPanel();
}

function draw() {
  background(BG_COLOR);

  if (drawing) addPoint(mouseX, mouseY);

  collide();
  for (const L of lines) updateLine(L);
  for (const L of lines) renderLine(L);
}

// ---------- BUILDING LINES ----------
function startLine() {
  if (drawing || overPanel()) return;
  drawing = true;
  const params = {};
  for (const k in sliders) params[k] = sliders[k].value();   // frozen for this line
  const now = millis() / 1000;
  current = {
    pts: [],
    params,
    walkX: makeWalker(now, params.stepMax, params.drift),
    walkY: makeWalker(now, params.stepMax * UPDOWN, params.drift * UPDOWN),
  };
  lines.push(current);
  addPoint(mouseX, mouseY, true);
}

function endLine() {
  drawing = false;
  current = null;
}

function addPoint(x, y, force) {
  const P = current.pts;
  const last = P[P.length - 1];
  if (!force && last && dist(x, y, last.x, last.y) < SPACING) return;
  // fill gaps when the pen moves fast
  const steps = last ? max(1, floor(dist(x, y, last.x, last.y) / SPACING)) : 1;
  for (let k = 1; k <= steps; k++) {
    const px = last ? lerp(last.x, x, k / steps) : x;
    const py = last ? lerp(last.y, y, k / steps) : y;
    const prev = P[P.length - 1];
    const s = prev ? prev.s + dist(px, py, prev.x, prev.y) : 0;
    P.push(makePoint(px, py, s));
  }
}

function makePoint(x, y, s) {
  const p = { x, y, s, dx: 0, dy: 0, vx: 0, vy: 0, w: 0, strands: [], grain: [] };
  for (let k = 0; k < STRANDS; k++) {
    p.strands.push({
      ox: random(-LINE_W / 2.5, LINE_W / 2.5),
      oy: random(-LINE_W / 2.5, LINE_W / 2.5),
      weight: random(1.2, 2.4),
      alpha: random(0.45, 0.9),
      skip: random() < SKIP_CHANCE,
    });
  }
  for (let g = 0; g < GRAIN; g++) {
    p.grain.push({ ox: random(-LINE_W, LINE_W), oy: random(-LINE_W, LINE_W), alpha: random(0.2, 0.6) });
  }
  return p;
}

// ---------- MOTION ----------
// A walker = the saved history of steps: right, left, right, left…
// every new step starts where the previous one ended.
function makeWalker(now, stepMax, drift) {
  return { keys: [{ t: now, v: 0 }], dir: random() < 0.5 ? 1 : -1, stepMax, drift };
}

function extendWalker(W, untilT, speed) {
  let last = W.keys[W.keys.length - 1];
  while (last.t < untilT) {
    const size = random(STEP_MIN, max(STEP_MIN, W.stepMax));
    let v = last.v + W.dir * size;
    if (abs(v) > W.drift) v = last.v - W.dir * size;   // too far: bounce back instead
    const dur = max(0.3, abs(v - last.v) / max(1, speed)) * random(0.8, 1.4);
    last = { t: last.t + dur, v };
    W.keys.push(last);
    W.dir *= -1;                                        // next step goes the other way
  }
}

function sampleWalker(W, t) {
  const K = W.keys;
  if (t <= K[0].t) return K[0].v;
  // binary search for the step that contains time t
  let lo = 0, hi = K.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (K[mid].t <= t) lo = mid; else hi = mid;
  }
  const a = K[lo], b = K[hi];
  const u = constrain((t - a.t) / (b.t - a.t), 0, 1);
  const e = u * u * (3 - 2 * u);                      // ease in/out – soft like water
  return lerp(a.v, b.v, e);
}

function updateLine(L) {
  const P = L.pts;
  if (P.length < 2) return;
  const total = P[P.length - 1].s;
  const now = millis() / 1000;
  const prm = L.params;
  extendWalker(L.walkX, now + 1, prm.speed);
  extendWalker(L.walkY, now + 1, prm.speed * UPDOWN);

  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    // mobility: 0 for the last 3px, growing gradually along the hair
    const fromEnd = total - p.s;
    let w = constrain((fromEnd - FIXED_LEN) / RAMP_LEN, 0, 1);
    p.w = w * w * (3 - 2 * w);

    // the step reaches this point later the further it is from the fixed end
    const tp = now - fromEnd * prm.flow / 1000;
    const tx = sampleWalker(L.walkX, tp) * p.w;
    const ty = sampleWalker(L.walkY, tp) * p.w;

    let ax = (tx - p.dx) * STIFFNESS;
    let ay = (ty - p.dy) * STIFFNESS;

    // neighbors pull each other, so a push travels along the line
    const a = P[max(0, i - 1)], b = P[min(P.length - 1, i + 1)];
    ax += ((a.dx + b.dx) / 2 - p.dx) * SPRING;
    ay += ((a.dy + b.dy) / 2 - p.dy) * SPRING;

    p.vx = (p.vx + ax) * DAMPING * p.w;
    p.vy = (p.vy + ay) * DAMPING * p.w;
    p.dx += p.vx;
    p.dy += p.vy;
    if (p.w === 0) { p.dx = 0; p.dy = 0; }
  }
}

// lines that touch push each other and share their movement
function collide() {
  const cell = HIT_DIST;
  const grid = new Map();
  lines.forEach((L, li) => L.pts.forEach((p, i) => {
    const k = floor((p.x + p.dx) / cell) + ',' + floor((p.y + p.dy) / cell);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push([li, i]);
  }));

  lines.forEach((L, li) => L.pts.forEach((p, i) => {
    const X = p.x + p.dx, Y = p.y + p.dy;
    const cx = floor(X / cell), cy = floor(Y / cell);
    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      for (let gy = cy - 1; gy <= cy + 1; gy++) {
        const list = grid.get(gx + ',' + gy);
        if (!list) continue;
        for (const [lj, j] of list) {
          if (lj < li || (lj === li && j <= i + 8)) continue; // each pair once, skip own neighbors
          const q = lines[lj].pts[j];
          const ddx = (q.x + q.dx) - X, ddy = (q.y + q.dy) - Y;
          const d = Math.hypot(ddx, ddy);
          if (d >= HIT_DIST || d === 0) continue;
          const f = (1 - d / HIT_DIST) * (L.params.hit + lines[lj].params.hit) / 2;
          const nx = ddx / d, ny = ddy / d;
          // push apart
          p.vx -= nx * f; p.vy -= ny * f;
          q.vx += nx * f; q.vy += ny * f;
          // share movement
          const mx = (p.vx + q.vx) / 2, my = (p.vy + q.vy) / 2;
          p.vx = lerp(p.vx, mx, 0.2); p.vy = lerp(p.vy, my, 0.2);
          q.vx = lerp(q.vx, mx, 0.2); q.vy = lerp(q.vy, my, 0.2);
        }
      }
    }
  }));
}

// ---------- CHALK RENDERING ----------
function renderLine(L) {
  const P = L.pts;
  const ctx = drawingContext;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const n = P.length;
  if (n === 1) {
    noStroke(); fill(INK[0], INK[1], INK[2], 255 * ALPHA_START);
    circle(P[0].x, P[0].y, LINE_W);
    return;
  }

  // strands: drawn in short chunks so opacity can fade along the line
  const CHUNK = 6;
  for (let k = 0; k < STRANDS; k++) {
    for (let c = 1; c < n; c += CHUNK) {
      const end = min(n - 1, c + CHUNK - 1);
      const tA = (c + end) / 2 / (n - 1);
      const lineAlpha = lerp(ALPHA_START, ALPHA_END, tA);
      const st = P[c].strands[k];
      ctx.strokeStyle = `rgba(${INK[0]},${INK[1]},${INK[2]},${lineAlpha * st.alpha})`;
      ctx.lineWidth = st.weight;
      ctx.beginPath();
      let penDown = false;
      for (let i = c; i <= end; i++) {
        const a = P[i - 1], b = P[i];
        const s = b.strands[k];
        if (s.skip) { penDown = false; continue; }
        const sa = a.strands[k];
        if (!penDown) { ctx.moveTo(a.x + a.dx + sa.ox, a.y + a.dy + sa.oy); penDown = true; }
        ctx.lineTo(b.x + b.dx + s.ox, b.y + b.dy + s.oy);
      }
      ctx.stroke();
    }
  }

  // chalk dust
  noStroke();
  for (let i = 0; i < n; i++) {
    const p = P[i];
    const lineAlpha = lerp(ALPHA_START, ALPHA_END, i / (n - 1));
    for (const g of p.grain) {
      fill(INK[0], INK[1], INK[2], 255 * lineAlpha * g.alpha);
      rect(p.x + p.dx + g.ox, p.y + p.dy + g.oy, 1, 1);
    }
  }
}

// ---------- INPUT (mouse + touch) ----------
function mousePressed()  { startLine(); }
function mouseReleased() { endLine(); }
function touchStarted()  { startLine(); return overPanel(); }   // false = stop page scrolling
function touchEnded()    { endLine();   return overPanel(); }
function touchMoved()    { return overPanel(); }

// ---------- CONTROL PANEL ----------
function buildPanel() {
  panel = createDiv();
  panel.position(12, 12);
  panel.style('font-family', 'sans-serif');
  panel.style('font-size', '12px');
  panel.style('color', '#09251C');
  panel.style('background', 'rgba(245,240,230,0.85)');
  panel.style('padding', '10px 12px');
  panel.style('border-radius', '10px');
  panel.style('border', '1px solid rgba(9,37,28,0.2)');

  const note = createDiv('settings for the next line');
  note.parent(panel);
  note.style('opacity', '0.6');
  note.style('margin-bottom', '6px');
  sliders.stepMax = addSlider('step (px)',   1, 100, DEFAULTS.stepMax, 1);
  sliders.speed   = addSlider('speed',       2, 80,  DEFAULTS.speed, 1);
  sliders.flow    = addSlider('softness',    0, 20,  DEFAULTS.flow, 0.5);
  sliders.drift   = addSlider('max drift',   10, 300, DEFAULTS.drift, 5);
  sliders.hit     = addSlider('collision',   0, 2,   DEFAULTS.hit, 0.05);

  const clearBtn = createButton('clear');
  clearBtn.parent(panel);
  clearBtn.style('margin-top', '6px');
  clearBtn.style('border', 'none');
  clearBtn.style('background', '#09251C');
  clearBtn.style('color', '#F5F0E6');
  clearBtn.style('padding', '6px 14px');
  clearBtn.style('border-radius', '14px');
  clearBtn.mousePressed(() => { lines = []; });
}

function addSlider(label, mn, mx, val, step) {
  const row = createDiv();
  row.parent(panel);
  const txt = createSpan(label + ': ' + val);
  txt.parent(row);
  const s = createSlider(mn, mx, val, step);
  s.parent(row);
  s.style('width', '140px');
  s.style('display', 'block');
  s.input(() => txt.html(label + ': ' + s.value()));
  return s;
}

function overPanel() {
  const r = panel.elt.getBoundingClientRect();
  return mouseX >= r.left && mouseX <= r.right && mouseY >= r.top && mouseY <= r.bottom;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
