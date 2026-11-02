let drawingLayer;

let lineHeight = 360;
let dotSize = 10;
let rectWidth = 40;

let lineSlider;
let rectSlider;
let alphaSlider;

let lineLabel;
let rectLabel;
let alphaLabel;

let lineOscButton;
let rectOscButton;

let lineOscOn = false;
let rectOscOn = false;

let lineOscPhase = 0;
let rectOscPhase = 0;

let oscillators = [
  { color: [255, 0, 0], speed: 0.035, phase: 0 },
  { color: [0, 80, 255], speed: 0.057, phase: 1 },
  { color: [255, 220, 0], speed: 0.083, phase: 2 }
];

function setup() {
  createCanvas(600, 600);

  drawingLayer = createGraphics(width, height);
  drawingLayer.background(255);

  // Line height controls
  createSpan("Line Height: ");
  lineSlider = createSlider(20, 600, 360, 1);
  lineLabel = createSpan(" 360 ");

  lineOscButton = createButton("Oscillator OFF");
  lineOscButton.mousePressed(() => {
    lineOscOn = !lineOscOn;
    lineOscButton.html(
      lineOscOn ? "Oscillator ON" : "Oscillator OFF"
    );
  });

  createP("");

  // Rectangle size controls
  createSpan("Rectangle Size: ");
  rectSlider = createSlider(2, 60, 10, 1);
  rectLabel = createSpan(" 10 ");

  rectOscButton = createButton("Oscillator OFF");
  rectOscButton.mousePressed(() => {
    rectOscOn = !rectOscOn;
    rectOscButton.html(
      rectOscOn ? "Oscillator ON" : "Oscillator OFF"
    );
  });

  createP("");

  // Transparency controls
  createSpan("Opacity: ");
  alphaSlider = createSlider(0, 255, 100, 1);
  alphaLabel = createSpan(" 100");

  createP("");

  createButton("Clear").mousePressed(() => {
    drawingLayer.background(255);
  });

  createButton("Download PNG").mousePressed(downloadImage);
}

function draw() {
  background(255);
  image(drawingLayer, 0, 0);

  // Line height
  let baseLineHeight = lineSlider.value();

  if (lineOscOn) {
    lineHeight = baseLineHeight *
      (0.5 + 0.5 * sin(lineOscPhase));

    lineOscPhase += 0.025;
  } else {
    lineHeight = baseLineHeight;
  }

  lineLabel.html(" " + floor(lineHeight) + " ");

  // Rectangle size
  let baseRectSize = rectSlider.value();

  if (rectOscOn) {
    dotSize = max(
      1,
      baseRectSize * (0.5 + 0.5 * sin(rectOscPhase))
    );

    rectOscPhase += 0.045;
  } else {
    dotSize = baseRectSize;
  }

  rectWidth = dotSize * 4;

  rectLabel.html(" " + floor(dotSize) + " ");

  // Opacity
  let alpha = alphaSlider.value();
  alphaLabel.html(" " + alpha);

  // Vertical guide line follows mouse
  stroke(180);
  strokeWeight(1);

  line(
    mouseX,
    mouseY - lineHeight / 2,
    mouseX,
    mouseY + lineHeight / 2
  );

  // Colored oscillating rectangles
  for (let osc of oscillators) {
    let y = mouseY +
      sin(frameCount * osc.speed + osc.phase) *
      lineHeight / 2;

    // Preview
    noStroke();
    fill(...osc.color, alpha);
    rect(mouseX, y, rectWidth, dotSize);

    // Paint when mouse is pressed
    if (
      mouseIsPressed &&
      mouseX >= 0 && mouseX < width &&
      mouseY >= 0 && mouseY < height
    ) {
      drawingLayer.noStroke();
      drawingLayer.fill(...osc.color, alpha);
      drawingLayer.rect(
        mouseX,
        y,
        rectWidth,
        dotSize
      );
    }
  }
}

// Save only the artwork
function downloadImage() {
  saveCanvas(
    drawingLayer.canvas,
    "oscillating-rectangles",
    "png"
  );
}
