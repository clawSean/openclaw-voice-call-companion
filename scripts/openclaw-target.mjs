import { spawnSync } from "node:child_process";
import { existsSync, realpathSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function packageIsOpenClaw(directory) {
  try {
    const pkg = JSON.parse(readFileSync(path.join(directory, "package.json"), "utf8"));
    return pkg.name === "openclaw";
  } catch {
    return false;
  }
}

function walkToPackageRoot(start) {
  let current = path.resolve(start);
  while (current !== path.dirname(current)) {
    if (packageIsOpenClaw(current)) return current;
    current = path.dirname(current);
  }
  return undefined;
}

function parseSourceArg(argv) {
  const index = argv.findIndex((value) => value === "--source");
  return index >= 0 ? argv[index + 1] : undefined;
}

export function resolveOpenClawTarget(argv = process.argv.slice(2)) {
  const explicit = parseSourceArg(argv) || process.env.OPENCLAW_SOURCE;
  if (explicit) {
    const resolved = walkToPackageRoot(explicit);
    if (!resolved) throw new Error(`Not an OpenClaw package root: ${explicit}`);
    return resolved;
  }

  const sibling = path.resolve(projectRoot, "..", "openclaw");
  if (packageIsOpenClaw(sibling)) return sibling;

  const command = spawnSync("which", ["openclaw"], { encoding: "utf8" });
  const binary = command.status === 0 ? command.stdout.trim() : "";
  if (binary && existsSync(binary)) {
    const resolved = walkToPackageRoot(realpathSync(binary));
    if (resolved) return resolved;
  }

  throw new Error("OpenClaw source not found. Pass --source /path/to/openclaw.");
}

export function readOpenClawVersion(root) {
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  return pkg.version;
}

export function projectPath(...parts) {
  return path.join(projectRoot, ...parts);
}
