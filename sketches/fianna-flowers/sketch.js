const flowers = [
  {
    name: 'California poppy', petals: 4, length: 126, breadth: 71, cup: 0.84,
    tip: '#ffd184', base: '#cf492c', pollen: '#ffdf83', center: '#843b31',
    inner: 0, disk: 16
  },
  {
    name: 'Blue cornflower', petals: 11, length: 123, breadth: 26, cup: 0.69,
    tip: '#a5caff', base: '#383b9f', pollen: '#b5b1ff', center: '#26204d',
    inner: 0.64, disk: 16
  },
  {
    name: 'Pink cosmos', petals: 8, length: 128, breadth: 38, cup: 0.8,
    tip: '#ffc4db', base: '#ac316d', pollen: '#ffd18a', center: '#aa613f',
    inner: 0, disk: 22
  },
  {
    name: 'Sunflower', petals: 15, length: 130, breadth: 25, cup: 0.59,
    tip: '#ffdf77', base: '#d97932', pollen: '#f2b365', center: '#653c34',
    inner: 0.82, disk: 35
  }
];

const bloomDuration = 5200;
const transitionDuration = 1200;
const chaosInterval = 180;
let stage, controls, speedSlider, variationSlider, chaosSlider;
let elapsed = 0;
let bloomNumber = 0;
let currentBloom, nextBloom;
let chaosTick = 0;
let chaosValue, chaosTarget;

function setup() {
  pixelDensity(min(displayDensity(), 2));
  stage = createDiv().style('width', 'min(100%, 920px)').style('margin', '0 auto');
  const canvas = createCanvas(1, 1).parent(stage);
  canvas.style('display', 'block').style('margin', '0');
  canvas.elt.setAttribute('role', 'img');
  canvas.elt.setAttribute('aria-label', 'Four illustrated flowers that change and sway. Use the sliders to shape their movement.');

  controls = createDiv().parent(stage).attribute('role', 'group').attribute('aria-label', 'Flower parameters');
  controls.style('display', 'grid')
    .style('grid-template-columns', 'repeat(auto-fit, minmax(min(100%, 110px), 1fr))')
    .style('gap', '8px 18px').style('padding', '10px 14px')
    .style('background', '#1e1b2a').style('color', '#fff0db')
    .style('font', '14px/1.4 system-ui, sans-serif');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  speedSlider = makeSlider('Speed', 2, reducedMotion ? 0 : 1, 0.05);
  variationSlider = makeSlider('Petal variation', 1, 0.45, 0.01);
  chaosSlider = makeSlider('Chaos', 1, 0.35, 0.01);

  currentBloom = makeBloom(0);
  nextBloom = makeBloom(1);
  chaosValue = random(0.2, 0.8);
  chaosTarget = logistic(chaosValue);
  windowResized();
}

function makeSlider(name, maximum, initial, increment) {
  const label = createElement('label', name).parent(controls).style('display', 'grid');
  return createSlider(0, maximum, initial, increment).parent(label)
    .style('width', '100%').style('min-width', '0').style('height', '28px')
    .style('margin', '0').style('accent-color', '#f3b478');
}

function windowResized() {
  resizeCanvas(max(1, stage.elt.clientWidth), max(140, min(windowHeight - controls.elt.offsetHeight - 32, 680)), true);
}

function makeBloom(number) {
  const flower = flowers[number % flowers.length];
  const petalCount = flower.petals * (flower.inner > 0 ? 2 : 1);
  // Draw random values once per bloom to give each petal a stable shape.
  const petalVariation = Array.from({ length: petalCount }, () => random(-1, 1));
  return { flower, petalVariation };
}

function logistic(value) {
  return 3.92 * value * (1 - value);
}

function draw() {
  elapsed += min(deltaTime, 100) * speedSlider.value();
  const number = floor(elapsed / bloomDuration);
  if (number > bloomNumber) {
    bloomNumber = number;
    currentBloom = nextBloom;
    nextBloom = makeBloom(bloomNumber + 1);
  }
  const index = bloomNumber % flowers.length;
  const fade = constrain((elapsed % bloomDuration - bloomDuration + transitionDuration) / transitionDuration, 0, 1);
  const bloomTransition = fade * fade * (3 - 2 * fade);

  // The logistic map is deterministic and sensitive to its starting value.
  // Interpolating its samples keeps the motion smooth between iterations.
  const tick = floor(elapsed / chaosInterval);
  while (chaosTick < tick) {
    chaosValue = chaosTarget;
    chaosTarget = logistic(chaosValue);
    chaosTick++;
  }
  const chaosProgress = (elapsed % chaosInterval) / chaosInterval;
  const easedChaosProgress = chaosProgress * chaosProgress * (3 - 2 * chaosProgress);
  const chaos = (lerp(chaosValue, chaosTarget, easedChaosProgress) - 0.5) * chaosSlider.value();
  const variation = variationSlider.value();

  const backdrop = drawingContext.createRadialGradient(width / 2, height * 0.43, 0, width / 2, height / 2, max(width, height) * 0.7);
  backdrop.addColorStop(0, '#292638');
  backdrop.addColorStop(1, '#100f1b');
  drawingContext.fillStyle = backdrop;
  drawingContext.fillRect(0, 0, width, height);

  translate(width / 2, height / 2);
  scale(min(width / 380, height / 540));
  drawPlate();

  const sway = sin(elapsed / 1350) * 0.075 + chaos * 0.45;
  const breath = 1 + 0.055 * sin(elapsed / 820);
  push();
  translate(0, -26);
  drawStem(sway);
  rotate(sway);
  drawBloom(currentBloom, 1 - bloomTransition, breath * (1 - bloomTransition * 0.12), variation, chaos);
  if (bloomTransition > 0) {
    drawBloom(nextBloom, bloomTransition, breath * (0.88 + bloomTransition * 0.12), variation, chaos);
  }
  pop();

  drawCaption(flowers[index], index, 1 - bloomTransition);
  if (bloomTransition > 0) {
    const next = (index + 1) % flowers.length;
    drawCaption(flowers[next], next, bloomTransition);
  }
}

function drawPlate() {
  noFill();
  stroke(221, 187, 152, 55);
  strokeWeight(0.7);
  rect(-177, -249, 354, 498);
  circle(0, -26, 296);
  circle(0, -26, 310);

  for (let i = 0; i < 48; i++) {
    const angle = i * TWO_PI / 48;
    const inside = i % 4 === 0 ? 142 : 147;
    line(cos(angle) * inside, -26 + sin(angle) * inside,
      cos(angle) * 148, -26 + sin(angle) * 148);
  }

  noStroke();
  fill('#d7aa8f');
  textAlign(CENTER, CENTER);
  textFont('monospace');
  textSize(9);
  text('A   B O T A N I C A L   S T U D Y', 0, -229);
  fill('#fff0db');
  textFont('Georgia');
  textSize(37);
  text('Flowers', 0, -200);
}

function drawStem(sway) {
  const bend = -sway * 210;
  noFill();
  stroke('#86a28f');
  strokeWeight(2);
  bezier(1, 198, bend - 40, 122, bend + 24, 58, 0, 0);
  drawLeaf(bend - 14, 151, -1);
  drawLeaf(bend - 7, 118, 1);
}

function drawLeaf(x, y, direction) {
  const context = drawingContext;
  push();
  translate(x, y);
  scale(direction, 1);
  context.fillStyle = '#38584f';
  context.strokeStyle = '#86a28f';
  context.lineWidth = 0.8;
  context.beginPath();
  context.moveTo(0, 0);
  context.bezierCurveTo(14, -27, 38, -39, 59, -37);
  context.bezierCurveTo(48, -12, 28, 1, 0, 0);
  context.closePath();
  context.fill();
  context.stroke();
  stroke('#86a28f');
  strokeWeight(0.8);
  noFill();
  bezier(0, 0, 14, -8, 34, -24, 59, -37);
  pop();
}

function drawBloom(bloom, opacity, size, variation, chaos) {
  const { flower } = bloom;
  push();
  drawingContext.globalAlpha = opacity;
  scale(size);
  rotate(-HALF_PI);
  drawPetalRing(bloom, 1, 0, 0, variation, chaos);
  if (flower.inner > 0) {
    drawPetalRing(bloom, flower.inner, PI / flower.petals, flower.petals, variation, chaos);
  }

  noStroke();
  fill(flower.center);
  circle(0, 0, flower.disk * 2);
  fill(flower.pollen);
  const grains = flower.disk * 3;
  for (let i = 0; i < grains; i++) {
    const angle = i * PI * (3 - sqrt(5));
    const radius = sqrt(i / grains) * flower.disk * 0.86;
    circle(cos(angle) * radius, sin(angle) * radius, 1.8 + (i % 4) * 0.28);
  }
  pop();
}

function drawPetalRing(bloom, size, offset, start, variation, chaos) {
  const { flower, petalVariation } = bloom;
  const context = drawingContext;
  for (let i = 0; i < flower.petals; i++) {
    const difference = petalVariation[start + i] * variation;
    push();
    rotate(offset + (i + 0.28 * difference + chaos * 0.34 * sin(i * 2.4)) * TWO_PI / flower.petals);
    scale(size * (1 + 0.24 * difference + chaos * 0.22 * cos(i * 2.4)), size * (1 - 0.3 * difference));
    const { length, breadth, cup } = flower;
    const gradient = context.createLinearGradient(0, 0, length, 0);
    gradient.addColorStop(0, flower.base);
    gradient.addColorStop(1, flower.tip);
    context.fillStyle = gradient;
    context.strokeStyle = 'rgba(255, 231, 208, 0.28)';
    context.lineWidth = 0.8;
    context.beginPath();
    context.moveTo(3, 0);
    context.bezierCurveTo(length * 0.35, -breadth * 0.23, length * cup, -breadth * 1.4, length, -breadth * 0.44);
    context.bezierCurveTo(length * 1.07, -breadth * 0.21, length * 1.07, breadth * 0.21, length, breadth * 0.44);
    context.bezierCurveTo(length * cup, breadth * 1.4, length * 0.35, breadth * 0.23, 3, 0);
    context.closePath();
    context.fill();
    context.stroke();
    pop();
  }
}

function drawCaption(flower, index, opacity) {
  noStroke();
  fill(255, 240, 219, opacity * 255);
  textAlign(CENTER, CENTER);
  textFont('Georgia');
  textSize(21);
  text(flower.name, 0, 204);
  fill(215, 170, 143, opacity * 255);
  textFont('monospace');
  textSize(10);
  text('0' + (index + 1) + '  /  0' + flowers.length, 0, 229);
}
