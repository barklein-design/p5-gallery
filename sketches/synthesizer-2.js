let drawingLayer;
let elements = [];
let controls = [];

const canvasSize = 600;
const amplitude = 230;

let mediaRecorder = null;
let recordedChunks = [];
let recording = false;
let recordButton;
let canvasElement;
let videoStatus;

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
  sidebar.style("width", "340px");
  sidebar.style("font-family", "sans-serif");
  sidebar.style("font-size", "13px");
  sidebar.style("max-height", "600px");
  sidebar.style("overflow-y", "auto");

  let initialColors = [
    [255, 40, 40],
    [40, 100, 255],
    [255, 220, 0],
    [30, 200, 150],
    [180, 40, 220],
    [255, 120, 40]
  ];

  let types = [
    "rectangle",
    "rectangle",
    "rectangle",
    "triangles",
    "triangles",
    "circles"
  ];

  for (let i = 0; i < types.length; i++) {
    let type = types[i];

    elements.push({
      type: type,
      phase: i * TWO_PI / types.length
    });

    let group = createDiv();
    group.parent(sidebar);
    group.style("margin-bottom", "15px");
    group.style("padding-bottom", "10px");
    group.style("border-bottom", "1px solid #ccc");

    let titleText;

    if (type === "rectangle") {
      titleText = "Rectangle " + (i + 1);
    } else if (type === "triangles") {
      titleText = "Triangle Row " + (i - 2);
    } else {
      titleText = "Circle Row 1";
    }

    let title = createP(titleText);
    title.parent(group);
    title.style("font-weight", "bold");
    title.style("margin", "0 0 8px 0");

    let c = {};

    if (type === "rectangle") {
      c.height = createControl(
        "Height", 1, 600, 25, 1, group
      );
    } else {
      c.count = createControl(
        "Count", 1, 60, 12, 1, group
      );

      c.size = createControl(
        "Size", 2, 150, 35, 1, group
      );
    }

    c.speed = createControl(
      "Speed", 0, 0.15, 0.015 + i * 0.01, 0.001, group
    );

    c.r = createControl(
      "Red", 0, 255, initialColors[i][0], 1, group
    );

    c.g = createControl(
      "Green", 0, 255, initialColors[i][1], 1, group
    );

    c.b = createControl(
      "Blue", 0, 255, initialColors[i][2], 1, group
    );

    c.alpha = createControl(
      "Opacity", 0, 255, 100, 1, group
    );

    controls.push(c);
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
      saveCanvas(
        drawingLayer.canvas,
        "generative-composition",
        "png"
      );
    });

  recordButton = createButton("Record Video");
  recordButton.parent(buttons);
  recordButton.mousePressed(toggleRecording);

  videoStatus = createP("Hold mouse on canvas to paint.");
  videoStatus.parent(sidebar);
  videoStatus.style("color", "#666");
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

    c.value = map(
      sin(c.phase),
      -1, 1,
      c.minVal, c.maxVal
    );
  } else {
    c.value = c.slider.value();
  }

  c.valueLabel.html(" " + nf(c.value, 1, 1));
}

function draw() {
  background(255);
  image(drawingLayer, 0, 0);

  for (let group of controls) {
    for (let name in group) {
      updateControl(group[name]);
    }
  }

  let painting =
    mouseIsPressed &&
    mouseX >= 0 && mouseX < width &&
    mouseY >= 0 && mouseY < height;

  for (let i = 0; i < elements.length; i++) {
    let e = elements[i];
    let c = controls[i];

    e.phase += c.speed.value;

    let y = height / 2 + sin(e.phase) * amplitude;

    let red = c.r.value;
    let green = c.g.value;
    let blue = c.b.value;
    let alpha = c.alpha.value;

    if (painting) {
      drawElement(
        drawingLayer, e, c, y,
        red, green, blue, alpha
      );
    }

    drawElement(
      null, e, c, y,
      red, green, blue, alpha
    );
  }
}

function drawElement(g, e, c, y, red, green, blue, alpha) {
  if (g) {
    g.noStroke();
    g.fill(red, green, blue, alpha);
  } else {
    noStroke();
    fill(red, green, blue, alpha);
  }

  if (e.type === "rectangle") {
    let h = c.height.value;

    if (g) {
      g.rect(0, y - h / 2, width, h);
    } else {
      rect(0, y - h / 2, width, h);
    }

  } else {
    let count = max(1, round(c.count.value));
    let size = c.size.value;

    for (let j = 0; j < count; j++) {
      let x = (j + 0.5) * width / count;

      if (e.type === "triangles") {
        if (g) {
          g.triangle(
            x, y - size / 2,
            x - size / 2, y + size / 2,
            x + size / 2, y + size / 2
          );
        } else {
          triangle(
            x, y - size / 2,
            x - size / 2, y + size / 2,
            x + size / 2, y + size / 2
          );
        }

      } else if (e.type === "circles") {
        if (g) {
          g.circle(x, y, size);
        } else {
          circle(x, y, size);
        }
      }
    }
  }
}

function toggleRecording() {
  if (recording) {
    mediaRecorder.stop();
    recording = false;
    recordButton.html("Record Video");
    videoStatus.html("Saving video...");
    return;
  }

  if (!canvasElement.captureStream || !window.MediaRecorder) {
    videoStatus.html("Video recording is not supported.");
    return;
  }

  let stream = canvasElement.captureStream(60);

  let mimeType = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm"
  ].find(type => MediaRecorder.isTypeSupported(type));

  if (!mimeType) {
    videoStatus.html("WebM recording is not supported.");
    stream.getTracks().forEach(track => track.stop());
    return;
  }

  recordedChunks = [];

  mediaRecorder = new MediaRecorder(stream, {
    mimeType: mimeType,
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
    a.download = "generative-composition.webm";
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    stream.getTracks().forEach(track => track.stop());
    videoStatus.html("Video downloaded.");
  };

  mediaRecorder.start();
  recording = true;
  recordButton.html("Stop Recording");
  videoStatus.html("Recording video...");
}
