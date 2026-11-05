let angle = 0;
let lineLength = 20;
let rotationSpeed = 0.15;

let drawingLayer;

let lengthSlider;
let lengthLabel;
let oscillatorButton;

let oscillatorOn = false;
let oscillatorPhase = 0;

function setup() {
  createCanvas(600, 600);

  drawingLayer = createGraphics(width, height);
  drawingLayer.background(255);

  createSpan("Line Length: ");
  lengthSlider = createSlider(2, 150, 20, 1);
  lengthLabel = createSpan(" 20");

  createP("");

  oscillatorButton = createButton("Oscillator OFF");
  oscillatorButton.mousePressed(toggleOscillator);

  createButton("Clear").mousePressed(() => {
    drawingLayer.background(255);
  });
}

function draw() {
  background(255);
  image(drawingLayer, 0, 0);

  let baseLength = lengthSlider.value();

  if (oscillatorOn) {
    lineLength = baseLength * (0.5 + 0.5 * sin(oscillatorPhase));
    oscillatorPhase += 0.05;
  } else {
    lineLength = baseLength;
  }

  lengthLabel.html(" " + floor(lineLength));

  // Draw permanently when pressed
  if (mouseIsPressed && mouseY < height && mouseX < width) {
    drawSpinningLine(drawingLayer);
  }

  // Always visible preview
  drawSpinningLine(window);

  angle += rotationSpeed;
}

function drawSpinningLine(g) {
  if (g === window) {
    push();
    translate(mouseX, mouseY);
    rotate(angle);
    stroke(0);
    strokeWeight(1);
    line(-lineLength / 2, 0, lineLength / 2, 0);
    pop();
  } else {
    g.push();
    g.translate(mouseX, mouseY);
    g.rotate(angle);
    g.stroke(0);
    g.strokeWeight(1);
    g.line(-lineLength / 2, 0, lineLength / 2, 0);
    g.pop();
  }
}

function toggleOscillator() {
  oscillatorOn = !oscillatorOn;
  oscillatorButton.html(
    oscillatorOn ? "Oscillator ON" : "Oscillator OFF"
  );
}
