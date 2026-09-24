# Project Progress — OpenClaw Task Call Companion

Updated: 2026-09-24

## Status

**Built locally; not installed or live.**

The maintainable two-layer implementation exists:

- Voice Call trusted task seam: commit `d3036dd3447` on isolated branch
  `feat/voice-call-task-seam`, pushed to the `clawSean/openclaw` fork without a
  duplicate upstream PR.
- Standalone plugin: `@clawsean/task-call` v0.1.0 in this canonical project.
- Public source: `clawSean/openclaw-voice-call-companion@c423465`.
- Upgrade automation and runbook: complete and smoke-proven.
- Live config, plugin install, and Gateway restart: intentionally untouched.

## Proven

- Root cause: `message` is a spoken opener, not durable hidden context.
- Current OpenClaw `main` already persists user and assistant transcript events.
- Private objective is accepted only from trusted plugin runtime calls.
- Transcript inspection is accepted only from trusted plugin runtime calls and
  omits metadata/objective.
- Companion rejects unsupported workflows, malformed phone numbers, and
  payments.
- Companion defaults to no-dial mode.
- Plugin tests: `6/6` passing.
- Seam lint and formatting checks: passing.
- Clean `2026.9.6` upgrade simulation:
  `patch_required` → dry-run succeeds → apply succeeds → `integrated`.

## Pending Proof Gate

The isolated OpenClaw seam worktree has no `node_modules`, so focused Vitest
could not run without installing dependencies. Do not activate the seam until
these pass in a dependency-ready checkout:

```bash
node scripts/run-vitest.mjs \
  extensions/voice-call/index.test.ts \
  extensions/voice-call/src/runtime.test.ts \
  extensions/voice-call/src/manager/outbound.test.ts
```

## Activation Sequence

1. Run the focused OpenClaw tests above.
2. Load the canonical plugin path with `liveEnabled: false`.
3. Restart the Gateway once, with explicit approval.
4. Prove the full flow with Voice Call's mock provider.
5. Run a clean owner roleplay call.
6. Review transcript and task outcome.
7. Enable real external calls only after both proofs pass.

## Upgrade Contract

Canonical runbook: `docs/UPGRADING.md`.

Fast path after obtaining the new OpenClaw source:

```bash
npm run compat -- --source /path/to/new/openclaw
npm run seam -- --source /path/to/new/openclaw
npm run seam -- --source /path/to/new/openclaw --apply  # only if required
npm run compat -- --source /path/to/new/openclaw
```

The commands fail closed when the upstream Voice Call contract changes. They do
not install packages, alter live config, or restart the Gateway.

## Upstream Position

- PR `openclaw/openclaw#83942` proved private objectives technically, then was
  closed by owner decision.
- Broad issue `openclaw/openclaw#59245` remains open but is larger and
  security-sensitive.
- Do not open a duplicate PR without Voice Call owner sponsorship.
- If upstream later provides an equivalent trusted seam, delete the patch and
  keep the standalone plugin.

## Next Action

Run the focused OpenClaw tests in a dependency-ready isolated checkout, then
request explicit approval for plugin activation and the single Gateway restart.

Historical investigation and call evidence remain local-only under `artifacts/`;
the publication boundary is documented in `artifacts/README.md`.
