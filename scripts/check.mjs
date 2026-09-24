#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  "package.json",
  "openclaw.plugin.json",
  "src/index.js",
  "src/task-call-core.js",
  "docs/UPGRADING.md",
  "scripts/check-openclaw-compat.mjs",
  "scripts/apply-openclaw-seam.mjs",
];

const pkg = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
const manifest = JSON.parse(await readFile(path.join(projectRoot, "openclaw.plugin.json"), "utf8"));

if (manifest.id !== "task-call") throw new Error("manifest id must be task-call");
if (manifest.version !== pkg.version) throw new Error("manifest and package versions must match");
if (!manifest.contracts?.tools?.includes("task_call")) {
  throw new Error("manifest must declare the task_call tool contract");
}

for (const relativePath of requiredFiles) {
  await readFile(path.join(projectRoot, relativePath));
}

for (const relativePath of requiredFiles.filter((value) => value.endsWith(".js") || value.endsWith(".mjs"))) {
  const result = spawnSync(process.execPath, ["--check", path.join(projectRoot, relativePath)], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `syntax check failed: ${relativePath}`);
  }
}

console.log(`task-call checks passed (v${pkg.version})`);
