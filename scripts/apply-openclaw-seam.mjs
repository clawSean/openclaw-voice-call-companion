#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { projectPath, readOpenClawVersion, resolveOpenClawTarget } from "./openclaw-target.mjs";

const argv = process.argv.slice(2);
const target = resolveOpenClawTarget(argv);
const shouldApply = argv.includes("--apply");
const patchPath = projectPath("patches", "openclaw-voice-call-task-seam.patch");
const indexPath = path.join(target, "extensions/voice-call/index.ts");

if (readFileSync(indexPath, "utf8").includes('"voicecall.inspect"')) {
  console.log(`Voice Call seam is already present in OpenClaw ${readOpenClawVersion(target)}.`);
  process.exit(0);
}

const check = spawnSync(
  "patch",
  ["--dry-run", "--forward", "--silent", "-p1", "-d", target, "-i", patchPath],
  { encoding: "utf8" },
);
if (check.status !== 0) {
  console.error(check.stdout || check.stderr || "Patch compatibility check failed.");
  process.exit(2);
}

if (!shouldApply) {
  console.log(
    `Patch applies cleanly to OpenClaw ${readOpenClawVersion(target)}. Re-run with --apply to modify ${target}.`,
  );
  process.exit(0);
}

const applied = spawnSync("patch", ["--forward", "-p1", "-d", target, "-i", patchPath], {
  encoding: "utf8",
});
if (applied.status !== 0) {
  console.error(applied.stdout || applied.stderr || "Patch application failed.");
  process.exit(2);
}

console.log(applied.stdout.trim());
console.log("Seam applied. Run npm run compat, then the focused OpenClaw tests. No restart was performed.");
