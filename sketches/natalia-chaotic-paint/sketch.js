let brushSelect;
let randomnessSlider;
let sizeSlider;
let colorPicker;
let lastPoint = null;

function setup() {
  // סרגל כלים
  const toolbar = createDiv();
  toolbar.style("direction", "rtl");
  toolbar.style("display", "flex");
  toolbar.style("flex-wrap", "wrap");
  toolbar.style("align-items", "center");
  toolbar.style("gap", "12px");
  toolbar.style("padding", "15px");
  toolbar.style("font-family", "Arial");
  toolbar.style("background", "#eeeae2");

  createSpan("מכחול:").parent(toolbar);

  brushSelect = createSelect();
  brushSelect.parent(toolbar);
  brushSelect.option("קו", "line");
  brushSelect.option("עיגול", "circle");
  brushSelect.option("פרח", "flower");
  brushSelect.option("טיפת מים", "drop");
  brushSelect.changed(() => lastPoint = null);

  createSpan("אקראיות:").parent(toolbar);

  randomnessSlider = createSlider(0, 250, 0, 1);
  randomnessSlider.parent(toolbar);

  createSpan("גודל:").parent(toolbar);

  sizeSlider = createSlider(5, 80, 25, 1);
  sizeSlider.parent(toolbar);

  colorPicker = createColorPicker("#db7864");
  colorPicker.parent(toolbar);

  const clearButton = createButton("ניקוי");
  clearButton.parent(toolbar);
  clearButton.mousePressed(() => {
    background("#faf7ef");
    lastPoint = null;
  });

  const saveButton = createButton("שמירת תמונה");
  saveButton.parent(toolbar);
  saveButton.mousePressed(() => {
    saveCanvas("my-painting", "png");
  });

  createCanvas(900, 600);
  background("#faf7ef");
  frameRate(30);
}

function draw() {
  // מציירים רק בזמן לחיצה בתוך הקנבס
  const insideCanvas =
    mouseX >= 0 && mouseX < width &&
    mouseY >= 0 && mouseY < height;

  if (!mouseIsPressed || !insideCanvas) {
    lastPoint = null;
    return;
  }

  const randomness = randomnessSlider.value();
  const brushSize = sizeSlider.value();

  // כיוון אקראי סביב העכבר
  const angle = random(TWO_PI);

  // ככל שהסליידר גבוה, טווח המרחקים גדל.
  // כשהערך הוא 0, אין הסטה מהעכבר.
  const offsetRadius = random(0.4, 1) * randomness;

  const x = mouseX + cos(angle) * offsetRadius;
  const y = mouseY + sin(angle) * offsetRadius;

  const paint = color(colorPicker.value());
  paint.setAlpha(180);

  switch (brushSelect.value()) {
    case "line":
      stroke(paint);
      strokeWeight(brushSize / 5);

      if (lastPoint !== null) {
        line(lastPoint.x, lastPoint.y, x, y);
      } else {
        point(x, y);
      }

      lastPoint = createVector(x, y);
      break;

    case "circle":
      noStroke();
      fill(paint);
      circle(x, y, brushSize);
      break;

    case "flower":
      drawFlower(x, y, brushSize, paint);
      break;

    case "drop":
      drawDrop(x, y, brushSize, paint);
      break;
  }
}

function drawFlower(x, y, size, paint) {
  push();
  translate(x, y);
  noStroke();
  fill(paint);

  // שישה עלי כותרת
  for (let i = 0; i < 6; i++) {
    const angle = TWO_PI * i / 6;
    const petalX = cos(angle) * size * 0.28;
    const petalY = sin(angle) * size * 0.28;

    circle(petalX, petalY, size * 0.45);
  }

  // מרכז הפרח
  fill("#f3cc65");
  circle(0, 0, size * 0.3);
  pop();
}

function drawDrop(x, y, size, paint) {
  push();
  translate(x, y);
  noStroke();
  fill(paint);

  beginShape();

  // הקצה העליון של הטיפה
  vertex(0, -size * 0.6);

  // צד ימין והחלק התחתון המעוגל
  bezierVertex(
    size * 0.15, -size * 0.25,
    size * 0.48, size * 0.05,
    size * 0.3, size * 0.32
  );

  bezierVertex(
    size * 0.18, size * 0.52,
    -size * 0.18, size * 0.52,
    -size * 0.3, size * 0.32
  );

  // צד שמאל, בחזרה לקצה
  bezierVertex(
    -size * 0.48, size * 0.05,
    -size * 0.15, -size * 0.25,
    0, -size * 0.6
  );

  endShape(CLOSE);
  pop();
}

function mouseReleased() {
  lastPoint = null;
}
