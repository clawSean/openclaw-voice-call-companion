# Project Progress — OpenClaw Task Call Companion

Updated: 2026-09-25

## Status

**Isolated `2026.9.6` proof is green; production remains on the healthy official
Voice Call build pending a separately approved deployment and one answered owner roleplay.**

The maintainable two-layer implementation exists:

- Exact-release Voice Call seam: commits `bc0a004e360` and `db9c0c29eb9` on
  branch `personal/voice-call-task-seam-v2026.9.4`. The tested `dist` is deployed
  over the trusted official `@openclaw/voice-call@2026.9.4` install; the original
  `dist` is retained beside it as `dist.pre-task-call` for deterministic rollback.
- Standalone plugin: `@clawsean/task-call` v0.1.0 in this canonical project.
- `task-call` is now deliberately a validator only. Voice Call owns execution,
  private objective retention, and requester-session-scoped transcript inspection.
- Upgrade automation and runbook: complete and smoke-proven.
- Gateway is healthy after the trusted-install deployment. Voice Call is back on
  `twilio`; `task-call.liveEnabled` remains `false`.

## Proven

- Root cause: `message` is a spoken opener, not durable hidden context.
- Current OpenClaw `main` already persists user and assistant transcript events.
- Private objective is retained by Voice Call's model-facing tool for calls
  created in the requesting OpenClaw session.
- Transcript inspection is restricted to the requester session and omits
  metadata/objective.
- Companion rejects unsupported workflows, malformed phone numbers, and
  payments.
- Companion is non-dialing and defaults to no-dial validation.
- Companion unit tests: `5/5` passing; package/check gate passing.
- Exact-`2026.9.6` focused Voice Call tests: `101/101` passing.
- Production/test typechecks, lint, and formatting: passing.
- The contextual `2026.9.6` patch applies cleanly to a fresh release tree.
- Compatibility now fails closed unless the integrated source passes formatting
  and all three focused test files; marker presence alone is no longer proof.
- Fresh `2026.9.6` archive: `patch_required` → dry-run succeeds → apply succeeds
  with correct source placement. The dependency-complete exact-release worktree
  then reports `integrated` with format/test proof.

## Live Proof

- Mock-provider end-to-end call passed: call creation, persistence, private
  objective retention, requester ownership, and same-session inspection.
- First Twilio owner-roleplay attempt connected to Jared's voicemail. The direct
  clinic-facing opener was correct and no role reversal occurred, but voicemail
  identified the line as Jared's, so the agent treated it as a wrong number and
  left a callback-style message. The attempt was ended cleanly; private call IDs
  and transcripts remain in local logs rather than this public repository.
- One answered owner-roleplay call is still required. Do not call a real clinic
  until its transcript shows sustained caller role and correct task completion.

## Remaining Gate

1. Call Jared once when he is ready to answer as clinic staff.
2. Inspect the same-session transcript.
3. Require sustained caller role, useful clinic questions, and a clean close.
4. If green, mark the narrow appointment/information workflow proven.
5. Real clinic calls still require explicit per-call approval.

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

Request the separate matching-version deployment/config/restart approval, run
the live mock-provider gate, then complete one answered owner-roleplay call and
review its transcript.

Historical investigation and call evidence remain local-only under `artifacts/`;
the publication boundary is documented in `artifacts/README.md`.
