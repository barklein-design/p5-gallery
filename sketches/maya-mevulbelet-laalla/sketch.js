
let particles = [];
let noiseScaleSlider, speedSlider, jitterSlider, countSlider;
let modeSelect, clearBtn, saveBtn;

function setup() {
  // יצירת קנבס לצד פנל השליטה
  let canvas = createCanvas(750, 600);
  canvas.position(230, 20);
  colorMode(HSB, 360, 100, 100, 100);
  background(15);

  // יצירת ממשק בקרת פרמטרים (UI)
  createUI();
  
  // אתחול החלקיקים
  initParticles();
}

function createUI() {
  let panel = createDiv();
  panel.position(15, 20);
  panel.style('width', '190px');
  panel.style('color', '#ffffff');
  panel.style('font-family', 'sans-serif');
  panel.style('background', '#1e1e2e');
  panel.style('padding', '15px');
  panel.style('border-radius', '10px');
  panel.style('box-shadow', '0 4px 10px rgba(0,0,0,0.3)');

  panel.child(createElement('h3', 'בקרת פרמטרים').style('margin-top', '0'));

  // 1. בחירת מצב כאוס
  panel.child(createElement('label', 'מצב אלגוריתמי:'));
  modeSelect = createSelect();
  modeSelect.option('שדה זרימה (Perlin Flow)');
  modeSelect.option('הליכה אקראית גאוסיאנית');
  modeSelect.option('מברשת כאוס אינטראקטיבית');
  panel.child(modeSelect);
  panel.child(createElement('br')); panel.child(createElement('br'));

  // 2. קנה מידה של רעש פרלין
  panel.child(createElement('label', 'קנה מידה של רעש (Noise Scale):'));
  noiseScaleSlider = createSlider(0.002, 0.05, 0.01, 0.001);
  panel.child(noiseScaleSlider);
  panel.child(createElement('br'));

  // 3. מהירות / עוצמת כאוס
  panel.child(createElement('label', 'מהירות ותנועה (Speed):'));
  speedSlider = createSlider(0.5, 6, 2.5, 0.1);
  panel.child(speedSlider);
  panel.child(createElement('br'));

  // 4. אקראיות גאוסיאנית (Jitter)
  panel.child(createElement('label', 'סטייה גאוסיאנית (Jitter):'));
  jitterSlider = createSlider(0, 4, 0.8, 0.1);
  panel.child(jitterSlider);
  panel.child(createElement('br'));

  // 5. כמות חלקיקים
  panel.child(createElement('label', 'כמות חלקיקים:'));
  countSlider = createSlider(50, 1000, 400, 25);
  countSlider.changed(initParticles);
  panel.child(countSlider);
  panel.child(createElement('br')); panel.child(createElement('br'));

  // כפתור ניקוי
  clearBtn = createButton('ניקוי קנבס');
  clearBtn.mousePressed(() => background(15));
  panel.child(clearBtn);

  panel.child(createElement('span', ' '));

  // כפתור שמירה
  saveBtn = createButton('שמירת תמונה');
  saveBtn.mousePressed(() => saveCanvas('generative_chaos', 'png'));
  panel.child(saveBtn);
}

function initParticles() {
  particles = [];
  let num = countSlider ? countSlider.value() : 400;
  for (let i = 0; i < num; i++) {
    particles.push(new Particle());
  }
}

function draw() {
  // שקיפות עדינה ליצירת שובל (Trail Effect)
  fill(15, 15, 15, 7);
  rect(0, 0, width, height);

  let mode = modeSelect.value();
  let ns = noiseScaleSlider.value();
  let spd = speedSlider.value();
  let jit = jitterSlider.value();

  // עדכון והצגת החלקיקים
  for (let p of particles) {
    p.update(mode, ns, spd, jit);
    p.display();
    p.edges();
  }

  // ציור אינטראקטיבי בגרירת העכבר
  if (mouseIsPressed && mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    for (let i = 0; i < 4; i++) {
      let rx = randomGaussian(mouseX, 12 * jit);
      let ry = randomGaussian(mouseY, 12 * jit);
      let angle = noise(rx * ns, ry * ns, frameCount * 0.02) * TWO_PI * 2;
      
      stroke((frameCount * 2 + i * 30) % 360, 85, 100, 70);
      strokeWeight(random(1, 3.5));
      line(rx, ry, rx + cos(angle) * 15, ry + sin(angle) * 15);
    }
  }
}

// מחלקת חלקיק
class Particle {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.hue = random(360);
  }

  update(mode, ns, spd, jit) {
    if (mode === 'שדה זרימה (Perlin Flow)') {
      // גזירת זווית מתוך רעש פרלין 2D/3D
      let angle = noise(this.pos.x * ns, this.pos.y * ns, frameCount * 0.003) * TWO_PI * 4;
      let force = p5.Vector.fromAngle(angle);
      force.setMag(0.25);
      this.acc.add(force);
    } else if (mode === 'הליכה אקראית גאוסיאנית') {
      // הליכה אקראית המשלבת כיוון אקראי ופיזור גאוסיאני
      let angle = random(TWO_PI);
      let force = p5.Vector.fromAngle(angle).mult(spd * 0.5);
      this.acc.add(force);
    } else {
      // מברשת כאוס
      let angle = noise(this.pos.x * ns, this.pos.y * ns) * TWO_PI * 2;
      let force = p5.Vector.fromAngle(angle).setMag(0.1);
      this.acc.add(force);
    }

    // הוספת סטייה גאוסיאנית (Gaussian Jitter) לתנועה
    if (jit > 0) {
      this.pos.x += randomGaussian(0, jit * 0.4);
      this.pos.y += randomGaussian(0, jit * 0.4);
    }

    this.vel.add(this.acc);
    this.vel.limit(spd);
    this.pos.add(this.vel);
    this.acc.mult(0);

    // שינוי צבע דינמי ברצף HSB
    this.hue = (this.hue + 0.4) % 360;
  }

  display() {
    stroke(this.hue, 75, 95, 65);
    strokeWeight(1.8);
    point(this.pos.x, this.pos.y);
  }

  edges() {
    if (this.pos.x < 0) this.pos.x = width;
    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.y < 0) this.pos.y = height;
    if (this.pos.y > height) this.pos.y = 0;
  }
}
