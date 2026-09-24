# OpenClaw Task Call Companion

Constrained outbound appointment and information calls for OpenClaw.

This project fixes the exact failure seen in the dental-call demo: Voice Call
spoke a one-shot opener, discarded it, and reverted to generic assistant
behavior because the actual mission was never retained as private context.

## Architecture

The implementation has two deliberately separate layers:

1. **Small Voice Call seam** — trusted plugins can supply a private per-call
   `objective`; trusted plugins can read state plus the completed transcript.
2. **Standalone `task-call` plugin** — validates bounded task packets, keeps
   spoken opener separate from private context, persists task state, refuses
   payments/unbounded commitments, and starts fail-closed in no-dial mode.

There is no permanent Voice Call fork. The seam is a pinned eight-file patch
with automated compatibility and application commands.

## Safety State

- `liveEnabled` defaults to `false`.
- Supported workflows: `appointment` and `information`.
- Payments are rejected.
- Normal agent tools and external Gateway callers cannot set `objective` or
  inspect transcripts through the seam.
- Live activation still requires mock-provider proof, owner roleplay, explicit
  install/config approval, and a separately approved Gateway restart.

## Commands

```bash
npm test
npm run check
npm run compat -- --source /absolute/path/to/openclaw
npm run seam -- --source /absolute/path/to/openclaw
```

Add `--apply` to the final command only after the dry-run succeeds. It never
restarts OpenClaw.

## Project Map

- `src/index.js` — OpenClaw plugin registration and trusted Voice Call bridge.
- `src/task-call-core.js` — packet validation, private objective rendering, and
  durable task-record helpers.
- `patches/openclaw-voice-call-task-seam.patch` — version-pinned Voice Call seam.
- `docs/UPGRADING.md` — exact post-upgrade procedure and rollback.
- `PROJECT_PROGRESS.md` — current status and next action.
- `artifacts/README.md` — local-only evidence boundary; private call records and
  historical logs are intentionally excluded from publication.

## Current Proof

- Companion plugin unit/integration tests: `6/6` passing.
- Syntax/package checks: passing.
- Seam lint/format: passing against OpenClaw `main` at `3948a0fd183`.
- Compatibility automation: clean checkout reports `patch_required`; dry-run,
  apply, and re-check reports `integrated`.
- Focused OpenClaw Vitest execution remains pending because the isolated
  worktree has no dependencies installed; this is a required pre-deployment
  gate, not a waived test.

See [docs/UPGRADING.md](docs/UPGRADING.md) before every OpenClaw upgrade.
