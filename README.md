# p5 Gallery

A tiny gallery of small [p5.js](https://p5js.org) sketches. Flip between them with the ← → buttons (or the arrow keys).

**Live:** https://omrialloro.github.io/p5-gallery/ (updates automatically after each merge to `main`)

## Run it locally

Clone the repo and serve the folder with any static server. Opening `index.html` directly from disk won't work, because browsers block loading the sketches over `file://`.

```bash
git clone https://github.com/omrialloro/p5-gallery.git
cd p5-gallery
python3 -m http.server 8123
```

Then open http://localhost:8123.

## Add your sketch

1. Put your p5 script in `sketches/`, e.g. `sketches/my-sketch.js`. Write it as a normal global-mode sketch with `setup()` and `draw()`, exactly as you would in the p5 web editor. No changes needed.
2. Add one line to the `SKETCHES` list in `index.html`:

   ```js
   { name: 'My sketch', file: 'sketches/my-sketch.js' },
   ```

3. Check it in the browser, then open a pull request.

Each sketch runs in its own iframe ([runner.html](runner.html)), so your variable and function names can't clash with anyone else's.

## Contributing

- **Fork** this repo on GitHub, make your changes on a branch, and open a **pull request**.
- One sketch per file. Give the file a short, lowercase, dash-separated name.
- Please don't edit other people's sketches without asking them.

## Project layout

```
index.html     the gallery page and the list of sketches
runner.html    loads p5 and runs one sketch
sketches/      one .js file per sketch
```

## License

[MIT](LICENSE)
