#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const payload = JSON.parse(
  execFileSync("openclaw", ["plugins", "list", "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }),
);

const matches = payload.plugins.filter(
  (plugin) => plugin.id === "voice-call" && plugin.trustedOfficialInstall === true,
);

if (matches.length !== 1) {
  throw new Error(`expected exactly one trusted official voice-call install, found ${matches.length}`);
}

process.stdout.write(`${matches[0].rootDir}\n`);
