let drawingLayer;
let rectangles = [];
let controls = [];

const canvasSize = 600;
const amplitude = 230;

let mediaRecorder = null;
let recordedChunks = [];
let recording = false;
let recordButton;
let canvasElement;

function setup() {
  let layout = createDiv();
  layout.style("display", "flex");
  layout.style("align-items", "flex-start");
  layout.style("gap", "20px");

  let canvasContainer = createDiv();
  canvasContainer.parent(layout);

  let canvas = createCanvas(canvasSize, canvasSize);
  canvas.parent(canvasContainer);
  canvasElement = canvas.elt;

  pixelDensity(1);
  frameRate(60);

  drawingLayer = createGraphics(width, height);
  drawingLayer.pixelDensity(1);
  drawingLayer.background(255);

  let sidebar = createDiv();
  sidebar.parent(layout);
  sidebar.style("width", "320px");
  sidebar.style("font-family", "sans-serif");
  sidebar.style("font-size", "13px");

  rectangles = [
    { phase: 0 },
    { phase: TWO_PI / 3 },
    { phase: 2 * TWO_PI / 3 }
  ];

  let initialColors = [
    [255, 40, 40],
    [40, 100, 255],
    [255, 220, 0]
  ];

  for (let i = 0; i < 3; i++) {
    let group = createDiv();
    group.parent(sidebar);
    group.style("margin-bottom", "15px");
    group.style("padding-bottom", "10px");
    group.style("border-bottom", "1px solid #ccc");

    let title = createP("Rectangle " + (i + 1));
    title.parent(group);
    title.style("font-weight", "bold");
    title.style("margin", "0 0 8px 0");

    controls[i] = {
      height: createControl("Height", 1, 600, 25, 1, group),
      speed: createControl(
        "Speed", 0, 0.15, 0.015 + i * 0.01, 0.001, group
      ),
      r: createControl("Red", 0, 255, initialColors[i][0], 1, group),
      g: createControl("Green", 0, 255, initialColors[i][1], 1, group),
      b: createControl("Blue", 0, 255, initialColors[i][2], 1, group),
      alpha: createControl("Opacity", 0, 255, 100, 1, group)
    };
  }

  let buttons = createDiv();
  buttons.parent(sidebar);
  buttons.style("display", "flex");
  buttons.style("gap", "8px");
  buttons.style("flex-wrap", "wrap");

  createButton("Clear")
    .parent(buttons)
    .mousePressed(() => {
      drawingLayer.background(255);
    });

  createButton("Download PNG")
    .parent(buttons)
    .mousePressed(() => {
      saveCanvas(drawingLayer.canvas, "rgb-rectangles", "png");
    });

  recordButton = createButton("Record Video");
  recordButton.parent(buttons);
  recordButton.mousePressed(toggleRecording);

  let info = createP(
    "Hold mouse on canvas to paint. Video recording captures the full animation."
  );
  info.parent(sidebar);
  info.style("color", "#666");
}

function createControl(label, minVal, maxVal, initial, step, parent) {
  let row = createDiv();
  row.parent(parent);
  row.style("display", "flex");
  row.style("align-items", "center");
  row.style("gap", "5px");
  row.style("margin", "4px 0");

  let name = createSpan(label);
  name.parent(row);
  name.style("width", "52px");

  let slider = createSlider(minVal, maxVal, initial, step);
  slider.parent(row);
  slider.style("width", "110px");

  let valueLabel = createSpan("" + initial);
  valueLabel.parent(row);
  valueLabel.style("width", "38px");
  valueLabel.style("font-size", "11px");

  let button = createButton("Osc OFF");
  button.parent(row);
  button.style("font-size", "10px");
  button.style("padding", "3px 5px");

  let control = {
    slider,
    valueLabel,
    button,
    oscillatorOn: false,
    phase: random(TWO_PI),
    value: initial,
    minVal,
    maxVal
  };

  button.mousePressed(() => {
    control.oscillatorOn = !control.oscillatorOn;
    button.html(control.oscillatorOn ? "Osc ON" : "Osc OFF");
  });

  return control;
}

function updateControl(c) {
  if (c.oscillatorOn) {
    c.phase += 0.025;
    c.value = map(sin(c.phase), -1, 1, c.minVal, c.maxVal);
  } else {
    c.value = c.slider.value();
  }

  c.valueLabel.html(" " + nf(c.value, 1, 1));
}

function draw() {
  background(255);
  image(drawingLayer, 0, 0);

  for (let group of controls) {
    for (let name of ["height", "speed", "r", "g", "b", "alpha"]) {
      updateControl(group[name]);
    }
  }

  let painting =
    mouseIsPressed &&
    mouseX >= 0 && mouseX < width &&
    mouseY >= 0 && mouseY < height;

  for (let i = 0; i < 3; i++) {
    let r = rectangles[i];
    let c = controls[i];

    r.phase += c.speed.value;

    let y = height / 2 + sin(r.phase) * amplitude;
    let h = c.height.value;

    let red = c.r.value;
    let green = c.g.value;
    let blue = c.b.value;
    let alpha = c.alpha.value;

    if (painting) {
      drawingLayer.noStroke();
      drawingLayer.fill(red, green, blue, alpha);
      drawingLayer.rect(0, y - h / 2, width, h);
    }

    noStroke();
    fill(red, green, blue, alpha);
    rect(0, y - h / 2, width, h);
  }
}

function toggleRecording() {
  if (recording) {
    mediaRecorder.stop();
    recording = false;
    recordButton.html("Record Video");
    return;
  }

  if (!canvasElement.captureStream || !window.MediaRecorder) {
    alert("Video recording is not supported in this browser.");
    return;
  }

  let stream = canvasElement.captureStream(60);

  let mimeType = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm"
  ].find(type => MediaRecorder.isTypeSupported(type));

  if (!mimeType) {
    alert("WebM recording is not supported in this browser.");
    stream.getTracks().forEach(track => track.stop());
    return;
  }

  recordedChunks = [];

  mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 8000000
  });

  mediaRecorder.ondataavailable = event => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    let blob = new Blob(recordedChunks, { type: mimeType });
    let url = URL.createObjectURL(blob);

    let a = document.createElement("a");
    a.href = url;
    a.download = "rgb-rectangles.webm";
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    stream.getTracks().forEach(track => track.stop());
  };

  mediaRecorder.start();
  recording = true;
  recordButton.html("Stop Recording");
}
