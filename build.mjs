#!/usr/bin/env node

import path from "node:path";
import fse from "fs-extra";
import esbuild from "esbuild";
import kleur from "kleur";
import prettyBytes from "pretty-bytes";
import prettyMs from "pretty-ms";

// https://github.com/remix-run/remix/blob/main/packages/remix-dev/compiler/loaders.ts
const loaders = {
  ".aac": "file",
  ".avif": "file",
  ".css": "file",
  ".eot": "file",
  ".flac": "file",
  ".gif": "file",
  ".gql": "text",
  ".graphql": "text",
  ".ico": "file",
  ".jpeg": "file",
  ".jpg": "file",
  ".js": "jsx",
  ".jsx": "jsx",
  ".json": "json",
  // We preprocess md and mdx files using XDM and send through
  // the JSX for esbuild to handle
  ".md": "jsx",
  ".mdx": "jsx",
  ".mp3": "file",
  ".mp4": "file",
  ".ogg": "file",
  ".otf": "file",
  ".png": "file",
  ".sql": "text",
  ".svg": "file",
  ".ts": "ts",
  ".tsx": "tsx",
  ".ttf": "file",
  ".wav": "file",
  ".webm": "file",
  ".webmanifest": "file",
  ".webp": "file",
  ".woff": "file",
  ".woff2": "file",
  ".zip": "file",
};

let SRC_DIR = path.join(process.cwd(), "src");
let OUT_DIR = path.join(process.cwd(), "public/build");

async function build() {
  console.log(kleur.dim("clearing build directory"));
  await fse.emptyDir(OUT_DIR);

  console.log(kleur.dim("finding source files"));
  let sourceFiles = await fse.readdir(SRC_DIR);
  let entryPoints = sourceFiles.map((file) => path.join(SRC_DIR, file));

  console.log(kleur.cyan().bold("building..."));

  let start = Date.now();
  let result = await esbuild.build({
    entryPoints,
    outdir: OUT_DIR,
    splitting: true,
    bundle: true,
    format: "esm",
    platform: "browser",
    publicPath: "/build/",
    loader: loaders,
    plugins: [],
    entryNames: "[dir]/[name]-[hash]",
    chunkNames: "_shared/[name]-[hash]",
    assetNames: "_assets/[name]-[hash]",
    write: false,
  });
  let end = Date.now();

  if (result.errors.length > 0) {
    throw result.errors;
  }

  for (const file of result.outputFiles) {
    await fse.outputFile(file.path, file.contents);
    console.log(
      "👉",
      kleur.green(path.relative(process.cwd(), file.path)),
      kleur.dim(prettyBytes(file.contents.byteLength))
    );
  }

  let duration = prettyMs(end - start);

  console.log(kleur.cyan().bold(`built in ${duration}`));
}

build().then(
  () => {
    process.exit(0);
  },
  (error) => {
    console.error(kleur.red(error));
    process.exit(1);
  }
);
