import esbuild from "esbuild";

const isWatch = process.argv.includes("--watch");

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: "es2020",
  sourcemap: isWatch ? "inline" : false,
  outfile: "main.js",
  external: ["obsidian", "electron", "@codemirror/state", "@codemirror/view", "@codemirror/language"],
  logLevel: "info"
});

if (isWatch) {
  await context.watch();
  console.log("Dreamcatcher build running in watch mode.");
} else {
  await context.rebuild();
  await context.dispose();
}
