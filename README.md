# p5 Gallery

A tiny gallery of small [p5.js](https://p5js.org) sketches. Flip between them with the ← → buttons (or the arrow keys).

**Live:** https://omrialloro.github.io/p5-gallery/ (updates automatically after each merge to `main`)

**Class 2 gallery:** https://omrialloro.github.io/p5-gallery/class-2/ shows full web apps. Each app is a folder `class-2/apps/<name>/` with its own `index.html`, found automatically like the sketches.

## Run it locally

Clone the repo and serve the folder with Python's built-in server, which is how the gallery finds the sketches locally. Opening `index.html` directly from disk won't work.

```bash
git clone https://github.com/omrialloro/p5-gallery.git
cd p5-gallery
python3 -m http.server 8123
```

Then open http://localhost:8123.

## Add your sketch

1. Create a new folder inside `sketches/`, with a short, lowercase, dash-separated name, e.g. `sketches/my-sketch/`. The folder name becomes the sketch's name in the gallery ("My sketch").
2. Save your p5 script in that folder as `sketch.js`. Write it as a normal global-mode sketch with `setup()` and `draw()`, exactly as you would in the p5 web editor. Images or other files your sketch uses go in the same folder.
3. Check it in the browser, then open a pull request.

The gallery finds your folder automatically. Each sketch runs in its own iframe ([runner.html](runner.html)), so your variable and function names can't clash with anyone else's.

## Contributing

- **Fork** this repo on GitHub, make your changes on a branch, and open a **pull request**.
- **Only add your own folder inside `sketches/`.** Don't change `index.html` or any other file, and don't edit other people's sketches.

## Project layout

```
index.html                  the gallery page
runner.html                 loads p5 and runs one sketch
sketches/<name>/sketch.js   one folder per sketch
.github/workflows/          lists the sketches and deploys the live site
```

## License

[MIT](LICENSE)
