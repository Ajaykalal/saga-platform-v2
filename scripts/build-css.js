/* eslint-disable */
const { compile } = require("@tailwindcss/node");
const fs = require("fs");
const path = require("path");

function walk(dir) {
  let files = [];
  try {
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) {
        files = files.concat(walk(full));
      } else if (full.endsWith(".tsx") || full.endsWith(".ts") || full.endsWith(".jsx") || full.endsWith(".js") || full.endsWith(".html")) {
        files.push(full);
      }
    }
  } catch {
    // Directory might not exist
  }
  return files;
}

async function buildCss() {
  const inputCssPath = path.join(process.cwd(), "app/globals.css");
  const outputCssPath = path.join(process.cwd(), "app/globals-compiled.css");

  const rawCss = fs.readFileSync(inputCssPath, "utf8");
  const compiler = await compile(rawCss, {
    base: process.cwd(),
    onDependency: () => {},
  });

  const sourceFiles = [
    ...walk(path.join(process.cwd(), "app")),
    ...walk(path.join(process.cwd(), "components")),
    ...walk(path.join(process.cwd(), "lib")),
  ];

  const candidates = new Set();

  for (const file of sourceFiles) {
    if (file === outputCssPath) continue;
    const content = fs.readFileSync(file, "utf8");
    // Extract candidate words that could be Tailwind classes
    const matches = content.match(/[A-Za-z0-9_\-\/:\.\[\]#%]+/g) || [];
    for (const match of matches) {
      candidates.add(match);
    }
  }

  const compiledCss = compiler.build(Array.from(candidates));

  fs.writeFileSync(outputCssPath, compiledCss, "utf8");
  console.log(`[SAGA CSS] Compiled ${compiledCss.length} bytes of Tailwind CSS with ${candidates.size} candidates to app/globals-compiled.css`);
}

buildCss().catch((err) => {
  console.error("[SAGA CSS] Build error:", err);
  process.exit(1);
});
