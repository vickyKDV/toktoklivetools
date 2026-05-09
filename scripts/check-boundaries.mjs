import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const violations = [];

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      return walk(fullPath);
    }

    return /\.(ts|tsx|js|jsx|mjs)$/.test(entry) ? [fullPath] : [];
  });
}

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function addViolation(file, message) {
  violations.push(`${relative(file)}: ${message}`);
}

for (const file of walk(path.join(root, "src", "core"))) {
  const rel = relative(file);
  const source = readFileSync(file, "utf8");

  if (rel === "src/core/overlay/renderer.tsx") {
    continue;
  }

  if (source.includes("@/server/")) {
    addViolation(file, "core module imports server code");
  }

  if (source.includes("@/features/")) {
    addViolation(file, "core module imports feature code");
  }
}

if (violations.length > 0) {
  console.error("Boundary check failed:\n");
  console.error(violations.map((violation) => `- ${violation}`).join("\n"));
  process.exit(1);
}

console.log("Boundary check passed.");
