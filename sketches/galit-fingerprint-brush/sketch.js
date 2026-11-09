// מברשת טביעת אצבע
// יוצרת: Galit Rossman
// אקראיות (random), רעש (noise), עיצוב פרמטרי (סליידרים) ואוסילטור (sin)
// גררו את העכבר על הקנווס. מקש C מנקה, מקש S שומר תמונה.

const AUTHOR = 'Galit Rossman'; // השם מופיע בפינת הקנווס

let sizeSlider, ridgesSlider, wobbleSlider, gapSlider, spacingSlider, pulseSlider;
let hueRangeSlider, hueSpeedSlider;
let lastX = null;
let lastY = null;

function setup() {
  createCanvas(800, 600);
  background(245, 240, 230);

  const panel = createDiv();
  panel.style('font-family', 'sans-serif');
  panel.style('font-size', '14px');
  panel.style('direction', 'rtl');

  sizeSlider    = addSlider(panel, 'גודל הטביעה', 20, 200, 80, 1);
  ridgesSlider  = addSlider(panel, 'מספר רכסים', 4, 30, 14, 1);
  wobbleSlider  = addSlider(panel, 'עיוות (רעש)', 0, 1, 0.35, 0.01);
  gapSlider     = addSlider(panel, 'שברים בקווים', 0, 0.6, 0.25, 0.01);
  spacingSlider = addSlider(panel, 'מרווח בין טביעות', 5, 150, 45, 1);
  pulseSlider   = addSlider(panel, 'פעימה (אוסילטור)', 0, 0.6, 0.2, 0.01);
  hueRangeSlider = addSlider(panel, 'טווח גוונים', 0, 360, 60, 1);
  hueSpeedSlider = addSlider(panel, 'מהירות שינוי הגוון', 0, 0.05, 0.01, 0.001);
}

function addSlider(parent, label, min, max, value, step) {
  const row = createDiv().parent(parent);
  createSpan(label + ' ').parent(row);
  return createSlider(min, max, value, step).parent(row);
}

function draw() {
  drawSignature();

  const insideCanvas = mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height;
  if (!mouseIsPressed || !insideCanvas) return;

  // טביעה ראשונה, או שהעכבר התרחק מספיק מהטביעה הקודמת
  if (lastX === null) {
    stamp(mouseX, mouseY, random(TWO_PI));
    lastX = mouseX;
    lastY = mouseY;
  } else if (dist(mouseX, mouseY, lastX, lastY) >= spacingSlider.value()) {
    const direction = atan2(mouseY - lastY, mouseX - lastX); // הטביעה מסתובבת לכיוון התנועה
    stamp(mouseX, mouseY, direction);
    lastX = mouseX;
    lastY = mouseY;
  }
}

function stamp(x, y, angle) {
  // אוסילטור: הגודל פועם לאורך הזמן
  const pulse = 1 + pulseSlider.value() * sin(frameCount * 0.08);
  const size = sizeSlider.value() * pulse;
  const ridges = ridgesSlider.value();
  const wobble = wobbleSlider.value();
  const gap = gapSlider.value();
  const seed = random(1000); // כל טביעה מקבלת רעש משלה, ולכן היא ייחודית

  push();
  translate(x, y);
  rotate(angle + HALF_PI + random(-0.2, 0.2));
  noFill();

  // אוסילטור: גוון הבסיס נע לאט סביב גלגל הצבעים
  const baseHue = 180 + 180 * sin(frameCount * hueSpeedSlider.value());
  // אקראיות: כל טביעה מקבלת גוון אקראי בתוך הטווח שסביב גוון הבסיס
  const range = hueRangeSlider.value();
  const inkHue = (baseHue + random(-range / 2, range / 2) + 360) % 360;

  // HSB: גוון, רוויה, בהירות, שקיפות
  colorMode(HSB, 360, 100, 100, 255);
  stroke(inkHue, random(55, 90), random(45, 85), 180);
  strokeWeight(max(0.6, size / (ridges * 4)));

  for (let i = 1; i <= ridges; i++) {
    const r = (i / ridges) * size / 2;
    const steps = floor(24 + r * 1.5);
    const coreShift = (1 - i / ridges) * size * 0.08; // הרכסים הפנימיים זזים מעט ויוצרים "לולאה"
    let drawing = false;

    for (let j = 0; j <= steps; j++) {
      const a = (j / steps) * TWO_PI;

      // שבר בקו: אזור שבו הרעש נמוך מהסף מורם "עט"
      const breakNoise = noise(seed + 50 + j * 0.25, i * 0.7);
      if (breakNoise < gap) {
        if (drawing) {
          endShape();
          drawing = false;
        }
        continue;
      }

      // עיוות הרדיוס בעזרת רעש פרלין
      const n = noise(seed + cos(a) * 1.5, seed + sin(a) * 1.5, i * 0.15);
      const rr = r * (1 + wobble * (n - 0.5));

      // צורה אליפטית ומעט ביצית, כמו קצה אצבע
      const px = rr * cos(a) * 0.72 * (1 + 0.15 * sin(a)) + coreShift;
      const py = rr * sin(a);

      if (!drawing) {
        beginShape();
        drawing = true;
      }
      vertex(px, py);
    }
    if (drawing) endShape();
  }
  pop();
}

// החתימה מצוירת בכל פריים, ולכן היא תמיד נשארת מעל הציור
function drawSignature() {
  push();
  colorMode(RGB);
  noStroke();
  fill(245, 240, 230);
  rect(width - 190, height - 36, 180, 26, 6);
  fill(60);
  textSize(14);
  textAlign(RIGHT, CENTER);
  text(AUTHOR, width - 20, height - 23);
  pop();
}

function mouseReleased() {
  lastX = null;
  lastY = null;
}

function keyPressed() {
  if (key === 'c' || key === 'C') background(245, 240, 230);
  if (key === 's' || key === 'S') saveCanvas('fingerprints', 'png');
}
