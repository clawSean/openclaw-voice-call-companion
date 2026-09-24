# OpenClaw Upgrade Runbook

This is the canonical post-upgrade procedure for the Task Call companion. The
goal is to make an OpenClaw upgrade boring: detect native support, reapply the
small seam only when necessary, prove it, and stop before touching the live
Gateway.

## Current Proven Baseline

- OpenClaw: `2026.9.4` (`3a9d69db306`)
- Exact-release seam commits: `bc0a004e360`, `db9c0c29eb9`
- Focused Voice Call tests: `100/100`
- Companion unit tests: `5/5`; package/check gate passing
- Trusted official plugin backup: `dist.pre-task-call`
- Mock end-to-end proof: passed
- Answered owner roleplay: pending

## What Survives an Upgrade

- This project and its `task-call` plugin remain canonical here.
- The companion plugin remains canonical in this repository.
- The bundled Voice Call seam may be overwritten by an OpenClaw package update.
- No full Voice Call fork is maintained.

## Before Upgrading OpenClaw

1. Keep the live Gateway on the currently proven version. Do not update the live
   package until the new version passes this entire isolated proof.
2. Obtain or update an isolated **full source checkout** of the new OpenClaw
   release. The installed npm/runtime package is not a patch target.
3. From this project, run:

   ```bash
   npm run compat -- --source /absolute/path/to/new/openclaw
   ```

4. Interpret the result:
   - `integrated`: upstream now has the needed seam; do not apply the patch.
   - `patch_required`: the pinned patch applies cleanly.
   - `blocked`: stop. Rebase the seven-file seam in an isolated worktree.

## Reapply the Seam When Required

1. Dry-run the patch:

   ```bash
   npm run seam -- --source /absolute/path/to/new/openclaw
   ```

2. Apply it only to the isolated checkout:

   ```bash
   npm run seam -- --source /absolute/path/to/new/openclaw --apply
   ```

3. Confirm the result:

   ```bash
   npm run compat -- --source /absolute/path/to/new/openclaw
   ```

   Expected status: `integrated`.

## Required Proof Before Deployment

Run these from the patched OpenClaw checkout after its dependencies are ready:

```bash
node scripts/run-vitest.mjs \
  extensions/voice-call/index.test.ts \
  extensions/voice-call/src/runtime.test.ts \
  extensions/voice-call/src/manager/outbound.test.ts
```

Then run this project’s checks:

```bash
npm test
npm run check
```

Proof must show all of the following:

1. `objective` remains separate from the spoken opener.
2. The objective reaches realtime instructions and is private/non-spoken.
3. Tool-created calls retain requester-session ownership.
4. `inspect_call` returns both transcript sides but not metadata/objective.
5. `inspect_call` hides calls owned by another requester session.
6. `task-call` remains a non-dialing validator with `liveEnabled: false`.

## Deployment Gate

Do not patch the live installation, change plugin config, install the plugin, or
restart the Gateway as part of an upgrade check. Those are separate deployment
actions and require JPop’s explicit approval.

After approval:

1. Resolve the active trusted official Voice Call root with:

   ```bash
   openclaw plugins list --json | jq -r \
     '.plugins[] | select(.id=="voice-call" and .trustedOfficialInstall==true) | .rootDir'
   ```

2. Deploy only the already-tested, matching-version build:

   ```bash
   OPENCLAW_SOURCE=/absolute/path/to/tested/openclaw \
     scripts/deploy-tested-voice-call-dist.sh --check

   OPENCLAW_SOURCE=/absolute/path/to/tested/openclaw \
     scripts/deploy-tested-voice-call-dist.sh --apply
   ```

   The script resolves the trusted official install, refuses version mismatch,
   stages and compares the build, preserves the original as
   `dist.pre-task-call`, and verifies the deployed bytes.
3. Confirm the canonical `task-call` plugin remains loaded and
   `task-call.liveEnabled` remains `false`.
4. Force Voice Call to `provider=mock`.
5. Run `openclaw config validate` and the Gateway watchdog dry-run.
6. Restart once through `/Users/Sean/projects/gateway-watchdog/safe-apply.sh`.
7. Verify Gateway health, Telegram health, plugin source/trust, and
   `provider=mock` before creating any call.
8. Run mock-provider proof. Only then switch to Twilio for one owner roleplay.

## Rollback

If compatibility or proof fails, leave the production version unchanged. If a
new Voice Call `dist` was already deployed, run:

```bash
scripts/restore-original-voice-call-dist.sh
```

Then restore the separately saved config backup and restart once through the
watchdog. The script preserves the failed build with a timestamp rather than
deleting it. The companion remains non-dialing with `liveEnabled: false`.

## Seam Surface

The current exact-release patch touches these Voice Call files:

- `extensions/voice-call/index.ts`
- `extensions/voice-call/index.test.ts`
- `extensions/voice-call/src/command-service.ts`
- `extensions/voice-call/src/manager/outbound.ts`
- `extensions/voice-call/src/manager/outbound.test.ts`
- `extensions/voice-call/src/runtime.ts`
- `extensions/voice-call/src/runtime.test.ts`
- `extensions/voice-call/src/types.ts`

If an upgrade changes unrelated Voice Call internals, no manual merge should be
needed. If it changes any of these contracts, the compatibility command fails
closed before production is touched.

## Done Conditions

An upgrade is complete only when:

1. focused Voice Call tests and companion tests are green;
2. compatibility reports `integrated`;
3. deployed `dist` matches the tested source byte-for-byte;
4. Gateway and Telegram recover after the guarded restart;
5. mock call creation, objective retention, ownership, and inspection pass;
6. the provider is returned to its intended final value;
7. `PROJECT_PROGRESS.md`, the daily log, and the exact tested/deployed commit
   hashes are updated.
