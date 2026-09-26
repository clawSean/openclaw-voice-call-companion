# OpenClaw Task Call Companion

Constrained outbound appointment and information calls for OpenClaw.

This project fixes the exact failure seen in the dental-call demo: Voice Call
spoke a one-shot opener, discarded it, and reverted to generic assistant
behavior because the actual mission was never retained as private context.

## Architecture

The implementation has two deliberately separate layers:

1. **Small Voice Call seam** — the Voice Call tool accepts a private per-call
   `objective`, retains it through the conversation, and exposes transcript
   inspection only to the OpenClaw session that created the call.
2. **Standalone `task-call` plugin** — validates bounded task packets, keeps the
   spoken opener separate from private context, and refuses payments or
   unbounded commitments. It does not receive privileged Gateway access and
   does not dial on its own.

There is no permanent Voice Call fork. The seam is a pinned eight-file patch
with automated compatibility and application commands.

## Safety State

- `liveEnabled` defaults to `false`.
- Supported workflows: `appointment` and `information`.
- Payments are rejected.
- Inspection omits private metadata/objective and hides calls owned by another
  requester session.
- Mock-provider proof is complete. One answered owner roleplay remains before
  any real business call.

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
- `scripts/deploy-tested-voice-call-dist.sh` — version-matched trusted-install deployment.
- `scripts/restore-original-voice-call-dist.sh` — recoverable rollback that preserves failures.
- `docs/UPGRADING.md` — exact post-upgrade procedure and rollback.
- `PROJECT_PROGRESS.md` — current status and next action.
- `artifacts/README.md` — local-only evidence boundary; private call records and
  historical logs are intentionally excluded from publication.

## Current Proof

- Companion unit tests: `5/5` passing; package/check gate passing.
- Syntax/package checks: passing.
- Exact-release Voice Call tests: `101/101` passing on OpenClaw `2026.9.6`.
- Seam lint, formatting, and production/test typechecks: passing.
- Compatibility automation: a clean checkout reports `patch_required`; dry-run
  and apply succeed, and the dependency-complete exact-release worktree reports
  `integrated` only after format and focused-test proof.
- Trusted-install mock proof passed. The first Twilio owner-roleplay attempt
  reached voicemail, so a human conversation is not yet proven.

See [docs/UPGRADING.md](docs/UPGRADING.md) before every OpenClaw upgrade.
