# OpenClaw Upgrade Runbook

This is the canonical post-upgrade procedure for the Task Call companion. The
goal is to make an OpenClaw upgrade boring: detect native support, reapply the
small seam only when necessary, prove it, and stop before touching the live
Gateway.

## What Survives an Upgrade

- This project and its `task-call` plugin remain canonical here.
- Task packets remain in OpenClaw plugin state under plugin id `task-call`.
- The bundled Voice Call seam may be overwritten by an OpenClaw package update.
- No full Voice Call fork is maintained.

## Before Upgrading OpenClaw

1. Keep the live Gateway on the currently proven version.
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

1. External/model callers cannot set a private `objective`.
2. Trusted plugin callers can set `objective` separately from the spoken opener.
3. The objective reaches realtime instructions and is marked private/non-spoken.
4. Only trusted plugin callers can use `voicecall.inspect`.
5. Inspection returns both transcript sides but not call metadata/objective.
6. `task-call` remains fail-closed when `liveEnabled` is false.

## Deployment Gate

Do not patch the live installation, change plugin config, install the plugin, or
restart the Gateway as part of an upgrade check. Those are separate deployment
actions and require JPop’s explicit approval.

After approval:

1. Deploy the already-proven OpenClaw build/package.
2. Confirm the canonical `task-call` plugin path is still configured.
3. Keep `liveEnabled: false` for mock-provider proof.
4. Restart the Gateway once.
5. Run mock-provider proof, then owner roleplay.
6. Enable live calls only after both proofs pass.

## Rollback

If compatibility or proof fails, leave the production version unchanged. If a
new build was already deployed, restore the previous OpenClaw package/build and
restart once. The companion plugin remains fail-closed with `liveEnabled: false`.

## Seam Surface

The patch intentionally touches only these eight Voice Call files:

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
