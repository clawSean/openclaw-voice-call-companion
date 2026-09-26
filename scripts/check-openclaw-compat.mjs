#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { projectPath, readOpenClawVersion, resolveOpenClawTarget } from "./openclaw-target.mjs";

const target = resolveOpenClawTarget();
const patchPath = projectPath("patches", "openclaw-voice-call-task-seam.patch");
const requiredFiles = [
  "extensions/voice-call/index.test.ts",
  "extensions/voice-call/index.ts",
  "extensions/voice-call/src/command-service.ts",
  "extensions/voice-call/src/manager/outbound.test.ts",
  "extensions/voice-call/src/manager/outbound.ts",
  "extensions/voice-call/src/runtime.test.ts",
  "extensions/voice-call/src/runtime.ts",
  "extensions/voice-call/src/types.ts",
];
const focusedTests = [
  "extensions/voice-call/index.test.ts",
  "extensions/voice-call/src/manager/outbound.test.ts",
  "extensions/voice-call/src/runtime.test.ts",
];

const missingFiles = requiredFiles.filter((relativePath) => !existsSync(path.join(target, relativePath)));
if (missingFiles.length) {
  console.error(
    JSON.stringify(
      {
        status: "blocked",
        target,
        version: readOpenClawVersion(target),
        reason: "Target is an installed/runtime package, not a patchable OpenClaw source checkout.",
        missingFiles,
        action: "Use an isolated full OpenClaw source checkout for compatibility, proof, and build.",
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

function integrated() {
  const content = Object.fromEntries(
    requiredFiles.map((relativePath) => [
      relativePath,
      readFileSync(path.join(target, relativePath), "utf8"),
    ]),
  );
  return (
    content["extensions/voice-call/src/types.ts"].includes("objective?: string") &&
    content["extensions/voice-call/src/manager/outbound.ts"].includes("...(objective && { objective })") &&
    content["extensions/voice-call/src/runtime.ts"].includes("Private outbound task objective:") &&
    content["extensions/voice-call/index.ts"].includes('"voicecall.inspect"') &&
    content["extensions/voice-call/index.ts"].includes(
      "objective requires a trusted plugin caller",
    ) &&
    content["extensions/voice-call/src/command-service.ts"].includes("transcript: call.transcript")
  );
}

function patchApplies() {
  const result = spawnSync(
    "patch",
    ["--dry-run", "--forward", "--silent", "-p1", "-d", target, "-i", patchPath],
    { encoding: "utf8" },
  );
  return {
    applies: result.status === 0,
    detail: [result.stdout, result.stderr].filter(Boolean).join("\n").trim(),
  };
}

function validateIntegratedSource() {
  const oxfmt = path.join(target, "node_modules", ".bin", "oxfmt");
  const vitest = path.join(target, "node_modules", ".bin", "vitest");
  const missingTools = [oxfmt, vitest].filter((toolPath) => !existsSync(toolPath));
  if (missingTools.length) {
    return {
      ok: false,
      reason: "Integrated source cannot be trusted until its pinned development dependencies are installed.",
      detail: `Missing: ${missingTools.join(", ")}`,
      action: `Install the pinned dependencies in ${target}, then rerun compatibility proof.`,
    };
  }

  const format = spawnSync(oxfmt, ["--check", ...requiredFiles], {
    cwd: target,
    encoding: "utf8",
  });
  if (format.status !== 0) {
    return {
      ok: false,
      reason: "The integrated Voice Call seam failed syntax/format validation.",
      detail: [format.stdout, format.stderr].filter(Boolean).join("\n").trim(),
      action: "Repair or rebase the seam in isolated source; do not deploy it.",
    };
  }

  const tests = spawnSync(vitest, ["run", ...focusedTests, "--maxWorkers=1"], {
    cwd: target,
    encoding: "utf8",
  });
  if (tests.status !== 0) {
    return {
      ok: false,
      reason: "The integrated Voice Call seam failed its focused source tests.",
      detail: [tests.stdout, tests.stderr].filter(Boolean).join("\n").trim(),
      action: "Repair or rebase the seam in isolated source; do not deploy it.",
    };
  }

  return { ok: true, tests: focusedTests };
}

const version = readOpenClawVersion(target);
if (integrated()) {
  const proof = validateIntegratedSource();
  if (!proof.ok) {
    console.error(JSON.stringify({ status: "blocked", target, version, ...proof }, null, 2));
    process.exit(2);
  }
  console.log(JSON.stringify({ status: "integrated", target, version, proof }, null, 2));
  process.exit(0);
}

const check = patchApplies();
if (check.applies) {
  console.log(
    JSON.stringify(
      {
        status: "patch_required",
        target,
        version,
        next: `npm run seam -- --source ${target} --apply`,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

console.error(
  JSON.stringify(
    {
      status: "blocked",
      target,
      version,
      reason: "The seam is not integrated and the pinned patch no longer applies cleanly.",
      detail: check.detail,
      action: "Rebase the seven-file seam in an isolated OpenClaw worktree; do not patch the live install.",
    },
    null,
    2,
  ),
);
process.exit(2);
