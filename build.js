#!/usr/bin/env node

const esbuild = require("esbuild");

esbuild.build({
  entryPoints: ["./src/index.js"],
  outdir: "./dist",
  splitting: true,
  bundle: true,
  format: "esm",
  loader: {
    ".css": "css", // using `css` copies the fonts, but doesn't return the url
    ".woff": "file",
    ".woff2": "file",
  },
});
