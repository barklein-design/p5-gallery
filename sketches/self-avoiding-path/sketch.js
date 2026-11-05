let particle = null;
let visited = new Set();

let canvasSize = 520;
let cellSize = 2;

let speedSlider;
let speedLabel;
let cellSizeSlider;
let cellSizeLabel;
let statusText;

let directions = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
];

function setup() {
  createCanvas(canvasSize, canvasSize);
  pixelDensity(1);
  background(255);
  frameRate(60);

  createSpan("Speed: ");
  speedSlider = createSlider(1, 1000, 100, 1);
  speedLabel = createSpan(" 100");

  createP("");

  createSpan("Cell Size: ");
  cellSizeSlider = createSlider(1, 10, 2, 1);
  cellSizeLabel = createSpan(" 2");

  cellSizeSlider.input(() => {
    cellSize = cellSizeSlider.value();
    cellSizeLabel.html(" " + cellSize);
  });

  createP("");

  createButton("Clear").mousePressed(resetSketch);

  createButton("Download Image").mousePressed(downloadImage);

  statusText = createP("Click the canvas to start");
}

function draw() {
  let speed = speedSlider.value();
  speedLabel.html(" " + speed);

  if (!particle) return;

  for (let i = 0; i < speed; i++) {
    if (!particle) break;

    particle.update();

    if (particle.stopped) {
      particle = null;
      statusText.html("Dead end! Click a free position");
      break;
    }

    particle.show();
  }
}

function cellKey(x, y) {
  return x + "," + y;
}

function markVisited(x, y) {
  visited.add(cellKey(round(x), round(y)));
}

// Collision detection in pixel coordinates
function isFree(x, y, currentX = -1, currentY = -1) {
  if (
    x < 0 || x >= width ||
    y < 0 || y >= height
  ) {
    return false;
  }

  let spacing = cellSize;

  for (let dx = -spacing; dx <= spacing; dx++) {
    for (let dy = -spacing; dy <= spacing; dy++) {
      if (abs(dx) + abs(dy) > spacing) continue;

      let nx = round(x + dx);
      let ny = round(y + dy);

      if (
        abs(nx - currentX) < 1 &&
        abs(ny - currentY) < 1
      ) {
        continue;
      }

      if (visited.has(cellKey(nx, ny))) {
        return false;
      }
    }
  }

  return true;
}

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    this.direction = random(directions);
    this.stepsLeft = floor(random(5, 30));
    this.stopped = false;

    markVisited(this.x, this.y);
  }

  update() {
    if (this.stopped) return;

    if (this.stepsLeft <= 0) {
      this.direction = random(directions);
      this.stepsLeft = floor(random(5, 30));
    }

    let step = cellSize;

    let nx = this.x + this.direction[0] * step;
    let ny = this.y + this.direction[1] * step;

    if (!isFree(nx, ny, this.x, this.y)) {
      let freeDirections = directions.filter(d =>
        isFree(
          this.x + d[0] * step,
          this.y + d[1] * step,
          this.x,
          this.y
        )
      );

      if (freeDirections.length === 0) {
        this.stopped = true;
        return;
      }

      this.direction = random(freeDirections);
      this.stepsLeft = floor(random(5, 30));

      nx = this.x + this.direction[0] * step;
      ny = this.y + this.direction[1] * step;
    }

    this.x = nx;
    this.y = ny;

    markVisited(this.x, this.y);
    this.stepsLeft--;
  }

  show() {
    noStroke();
    fill(0);

    if (this.direction[1] !== 0) {
      // Moving up/down: horizontal strip
      rect(this.x - 2, this.y, 4, 1);
    } else {
      // Moving left/right: vertical strip
      rect(this.x, this.y - 2, 1, 4);
    }
  }
}

// Start a new particle with a mouse click
function mousePressed() {
  if (particle) return;

  if (
    mouseX < 0 || mouseX >= width ||
    mouseY < 0 || mouseY >= height
  ) {
    return;
  }

  let x = floor(mouseX);
  let y = floor(mouseY);

  if (isFree(x, y)) {
    particle = new Particle(x, y);
    particle.show();
    statusText.html("Particle moving...");
  }
}

// Clear canvas
function resetSketch() {
  particle = null;
  visited.clear();
  background(255);
  statusText.html("Click the canvas to start");
}

// Download PNG with an opaque white background
function downloadImage() {
  let img = createGraphics(width, height);
  img.pixelDensity(1);

  // Solid white background
  img.background(255);

  // Copy the current canvas
  img.image(get(), 0, 0);

  // Save as PNG
  saveCanvas(img.canvas, "generative-strips", "png");

  img.remove();
}
