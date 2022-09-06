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

/**
 *
 * @param {import('esbuild').BuildOptions} config
 */
async function doTheBuild(config, name) {
  console.log(kleur.cyan().bold(`[${name}] building...`));

  let start = Date.now();
  let result = await esbuild.build({ ...config, write: false });
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

  console.log(kleur.cyan().bold(`[${name}] built in ${duration}`));

  return result;
}

async function build() {
  console.log(kleur.dim("clearing build directory"));
  await fse.emptyDir(OUT_DIR);

  console.log(kleur.dim("finding source files"));
  let sourceFiles = await fse.readdir(SRC_DIR);
  let entryPoints = sourceFiles.map((file) => path.join(SRC_DIR, file));

  await doTheBuild(
    {
      entryPoints,
      outdir: OUT_DIR,
      splitting: true,
      bundle: true,
      format: "esm",
      platform: "browser",
      publicPath: "/build/",
      loader: loaders,
      plugins: [bundleCssPlugin()],
      entryNames: "[dir]/[name]-[hash]",
      chunkNames: "_shared/[name]-[hash]",
      assetNames: "_assets/[name]-[hash]",
    },
    "main"
  );
}

/** @returns {import('esbuild').Plugin} */
function bundleCssPlugin() {
  return {
    name: "bundle-css",
    async setup(build) {
      let buildOptions = build.initialOptions;

      build.onLoad({ filter: /\.css$/ }, async (args) => {
        let { outfile, outdir, assetNames } = buildOptions;
        let assetDirname = path.dirname(assetNames);
        let result = await doTheBuild(
          {
            ...buildOptions,
            minifySyntax: false,
            incremental: false,
            splitting: false,
            sourcemap: false,
            write: false,
            outdir: path.join(
              outfile ? path.dirname(outfile) : outdir,
              assetDirname
            ),
            entryPoints: [args.path],
            assetNames: "[name]-[hash]",
            entryNames: "[dir]/[name]-[hash]",
            publicPath: ".",
            loader: {
              ...buildOptions.loader,
              ".css": "css",
            },
            metafile: true,
            plugins: [],
          },
          "css"
        );

        let keys = Object.keys(result.metafile.outputs);
        let entry = keys.find((key) => {
          let { entryPoint } = result.metafile.outputs[key];
          return !!entryPoint;
        });

        return {
          contents: `export default "${path.join(
            buildOptions.publicPath,
            assetDirname,
            path.basename(entry)
          )}";`,
          loader: "js",
        };
      });
    },
  };
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
