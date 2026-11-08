// WILD GARDEN / גן פרא — Bar Klein
// p5.js 2.3.3, global mode. No external assets.
let garden = [], ui = {}, surface, paused = false;
const MAX_ART = 40;

function setup() {
  surface = createCanvas(900, 600);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 100);
  strokeJoin(ROUND);
  surface.attribute('aria-label', 'קנבס גן פרא — לחצו ליצירת צורה');
  const panel = createDiv();
  panel.attribute('dir', 'rtl');
  panel.style('box-sizing', 'border-box');
  panel.style('width', '900px');
  panel.style('padding', '18px 22px');
  panel.style('background', '#141322');
  panel.style('color', '#eeeaf9');
  panel.style('font-family', 'Arial, sans-serif');
  const title = createDiv('גן פרא · WILD GARDEN');
  title.parent(panel); title.style('font-size', '24px');
  const sub = createP('Bar Klein · כל לחיצה זורעת מבנה חדש. המכוונים משפיעים רק על היצירה הבאה.');
  sub.parent(panel); sub.style('color', '#b6afc9');
  const typeLabel = createSpan('משפחת צורות: '); typeLabel.parent(panel);
  ui.kind = createSelect(); ui.kind.parent(panel);
  ui.kind.attribute('aria-label', 'משפחת צורות');
  ['הפתעה', 'שברים', 'ברקים', 'הסתעפויות', 'סרטים'].forEach(k => ui.kind.option(k));
  ui.size = makeSlider(panel, 'גודל', 30, 200, 100);
  ui.detail = makeSlider(panel, 'מורכבות', 3, 20, 10);
  ui.wild = makeSlider(panel, 'פראות גאומטרית', 0, 100, 65);
  ui.hue = makeSlider(panel, 'גוון', 0, 360, 190);
  ui.speed = makeSlider(panel, 'מהירות תנועה', 0, 100, 35);
  ui.chaos = makeSlider(panel, 'השפעת כאוס', 0, 100, 55);
  makeButton(panel, 'ביטול אחרון', () => garden.pop());
  makeButton(panel, 'ניקוי', () => { garden = []; });
  const pauseButton = makeButton(panel, 'השהיה', () => {
    paused = !paused; pauseButton.html(paused ? 'המשך' : 'השהיה');
  });
  makeButton(panel, 'שמירת PNG', () => saveCanvas('bar-klein-wild-garden', 'png'));
  ui.status = createP('הקנבס ריק. בחרו הגדרות ולחצו במקום שבו תרצו ליצור.');
  ui.status.parent(panel); ui.status.attribute('aria-live', 'polite');
  ui.status.style('color', '#b6afc9');
  surface.mousePressed(plant);
}

function makeSlider(parent, name, low, high, initial) {
  const row = createDiv(); row.parent(parent);
  row.style('display', 'flex'); row.style('align-items', 'center');
  row.style('gap', '12px'); row.style('margin', '10px 0');
  const label = createSpan(name); label.parent(row); label.style('width', '145px');
  const input = createSlider(low, high, initial, 1); input.parent(row);
  input.attribute('aria-label', name); input.style('width', '330px');
  const value = createSpan(String(initial)); value.parent(row);
  input.input(() => value.html(String(input.value())));
  return input;
}

function makeButton(parent, name, action) {
  const b = createButton(name); b.parent(parent); b.mousePressed(action);
  b.style('padding', '9px 16px'); b.style('margin', '8px 0 0 8px');
  b.style('cursor', 'pointer'); return b;
}

function plant() {
  if (mouseX < 0 || mouseX >= width || mouseY < 0 || mouseY >= height) return;
  if (garden.length >= MAX_ART) {
    ui.status.html('הגעתם ל־40 יצירות. בטלו יצירה או נקו את הקנבס כדי להוסיף.');
    return;
  }
  const settings = {};
  for (const key of ['size', 'detail', 'wild', 'hue', 'speed', 'chaos']) {
    settings[key] = Number(ui[key].value());
  }
  settings.wild /= 100; settings.speed /= 100; settings.chaos /= 100;
  let kind = ui.kind.value();
  if (kind === 'הפתעה') kind = random(['שברים', 'ברקים', 'הסתעפויות', 'סרטים']);
  garden.push(new Artwork(mouseX, mouseY, kind, Object.freeze(settings)));
  ui.status.html('נוצרה יצירה מסוג ' + kind + '. ההגדרות שלה נשמרו.');
}

function draw() {
  background(250, 35, 5);
  const seconds = Math.min(deltaTime, 50) / 1000;
  for (const art of garden) {
    if (!paused) art.update(seconds);
    art.display();
  }
}

// Lorenz system: sigma=10, rho=28, beta=8/3.
// RK4 with a fixed step keeps numerical integration stable.
function lorenz(v) {
  return [10 * (v[1] - v[0]), v[0] * (28 - v[2]) - v[1],
    v[0] * v[1] - (8 / 3) * v[2]];
}
function rk4(v, h) {
  const shift = (a, b, scale) => a.map((n, i) => n + b[i] * scale);
  const a = lorenz(v), b = lorenz(shift(v, a, h / 2));
  const c = lorenz(shift(v, b, h / 2)), d = lorenz(shift(v, c, h));
  return v.map((n, i) => n + h * (a[i] + 2*b[i] + 2*c[i] + d[i]) / 6);
}

class Artwork {
  constructor(x, y, kind, settings) {
    this.x = x; this.y = y; this.kind = kind; this.s = settings;
    this.angle = random(TWO_PI); this.parts = []; this.time = 0; this.acc = 0;
    this.state = [random(-10, 10), random(-10, 10), random(10, 30)];
    this.initial = [...this.state];
    if (kind === 'שברים') this.shards();
    if (kind === 'ברקים') this.lightning();
    if (kind === 'הסתעפויות') this.branch(0, 0.6, -HALF_PI, 0.55, 0);
    if (kind === 'סרטים') this.ribbons();
    // Normalize geometry so each family respects the size slider.
    const extent = Math.max(0.1, ...this.parts.flatMap(p =>
      p.points.map(v => Math.max(Math.abs(v.x), Math.abs(v.y)))));
    for (const p of this.parts) for (const v of p.points) {
      v.x /= extent; v.y /= extent;
    }
  }
  add(points, filled = false) {
    this.parts.push({points, filled, hue: random(-45, 45), weight: random(0.7, 2)});
  }
  shards() {
    for (let i = 0; i < this.s.detail * 2; i++) {
      const x = random(-0.8, 0.8), y = random(-0.8, 0.8);
      const a = random(TWO_PI), dx = cos(a), dy = sin(a);
      const l = random(0.2, 0.5 + this.s.wild * 0.7), w = random(0.03, 0.2);
      this.add([{x:x+dx*l,y:y+dy*l}, {x:x-dy*w,y:y+dx*w},
        {x:x-dx*l*0.3,y:y-dy*l*0.3}, {x:x+dy*w,y:y-dx*w}], true);
    }
  }
  lightning() {
    for (let j = 0; j < Math.ceil(this.s.detail / 3); j++) {
      let x = random(-0.7, 0.7), y = -1;
      const points = [{x,y}];
      for (let i = 0; i < this.s.detail; i++) {
        x += random(-1,1) * (0.08 + this.s.wild * 0.5);
        y += 2 / this.s.detail; points.push({x,y});
        if (random() < 0.4) this.add([{x,y},
          {x:x+random(-0.5,0.5),y:y+0.12}, {x:x+random(-0.8,0.8),y:y+0.4}]);
      }
      this.add(points);
    }
  }
  branch(x, y, angle, branchLength, depth) {
    const ex = x + cos(angle)*branchLength, ey = y + sin(angle)*branchLength;
    this.add([{x,y},{x:ex,y:ey}]);
    const maxDepth = Math.floor(map(this.s.detail,3,20,2,6));
    if (depth >= maxDepth) return;
    for (const direction of [-1,1]) this.branch(ex, ey,
      angle + direction*(random(0.2,0.5)+this.s.wild*random()),
      branchLength*random(0.6,0.82), depth+1);
  }
  ribbons() {
    let x = -0.8, y = 0;
    for (let i = 0; i < this.s.detail; i++) {
      const nx = x+random(-0.25,0.5), ny = y+random(-1,1)*(0.15+this.s.wild*0.7);
      const w = random(0.04,0.2);
      this.add([{x,y:y-w},{x:nx,y:ny-w},{x:nx,y:ny+w},{x,y:y+w}],true);
      x=nx; y=ny;
    }
  }
  update(seconds) {
    this.time += seconds*this.s.speed;
    this.acc += seconds*this.s.speed;
    while (this.acc >= 0.005) {
      this.state = rk4(this.state, 0.005); this.acc -= 0.005;
    }
  }
  display() {
    const s = this.s, t = this.time;
    const cx = (this.state[0]-this.initial[0])/35;
    const cy = (this.state[1]-this.initial[1])/45;
    push(); translate(this.x,this.y);
    rotate(this.angle + sin(t*0.5)*s.wild*0.12);
    scale(s.size*(1+0.06*sin(TWO_PI*t/4)));
    for (const part of this.parts) {
      // A shared spatial deformation preserves connected branch endpoints.
      const points = part.points.map(p => ({
        x:p.x+s.chaos*0.35*cx*sin(p.y*2.1)+s.wild*0.035*sin(t*2)*cos(p.y*3),
        y:p.y+s.chaos*0.35*cy*sin(p.x*2.1)+s.wild*0.035*sin(t*1.3)*sin(p.x*3)
      }));
      const hue = (s.hue+part.hue+360)%360;
      noFill(); stroke(hue,80,100,12); strokeWeight(6/s.size);
      this.path(points,part.filled);
      if (part.filled) fill(hue,75,90,24); else noFill();
      stroke(hue,55,100,85); strokeWeight(part.weight/s.size);
      this.path(points,part.filled);
    }
    pop();
  }
  path(points,closed) {
    beginShape(); for (const p of points) vertex(p.x,p.y);
    if (closed) endShape(CLOSE); else endShape();
  }
}
