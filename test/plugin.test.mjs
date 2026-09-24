import assert from "node:assert/strict";
import test from "node:test";
import register from "../src/index.js";

const packet = {
  workflow: "appointment",
  authorization: "information_only",
  phone: "+15551234567",
  targetName: "Example clinic",
  callerName: "Alex Example",
  opener: "Hi, I'm calling on behalf of Alex about new-patient screening.",
  objective: "Ask about eligibility and the earliest screening date.",
  authorizedFacts: ["Alex has a written referral."],
  questions: ["Are you accepting new patients?"],
  constraints: ["No booking or payment."],
};

function createHarness(pluginConfig = {}) {
  const rows = new Map();
  const gatewayCalls = [];
  let factory;
  const api = {
    pluginConfig,
    logger: { info() {} },
    runtime: {
      state: {
        openKeyedStore() {
          return {
            async register(key, value) {
              rows.set(key, value);
            },
            async lookup(key) {
              return rows.get(key);
            },
          };
        },
      },
      gateway: {
        async isAvailable() {
          return true;
        },
        async request(method, params, options) {
          gatewayCalls.push({ method, params, options });
          if (method === "voicecall.start") return { callId: "call-1", initiated: true };
          return {
            found: true,
            call: {
              callId: "call-1",
              state: "completed",
              transcript: [{ speaker: "assistant", text: "Thanks, goodbye.", isFinal: true }],
            },
          };
        },
      },
    },
    registerTool(value) {
      factory = value;
    },
  };
  register(api);
  const tool = factory({ sessionKey: "agent:main:telegram:group:medclaw" });
  return { tool, rows, gatewayCalls };
}

test("prepare validates without dialing", async () => {
  const { tool, gatewayCalls } = createHarness();
  const result = await tool.execute("tool-1", { action: "prepare", packet });
  assert.equal(result.details.ok, true);
  assert.equal(result.details.status, "ready");
  assert.equal(gatewayCalls.length, 0);
});

test("live calls are fail-closed by default", async () => {
  const { tool, gatewayCalls } = createHarness();
  const result = await tool.execute("tool-1", { action: "start", packet });
  assert.equal(result.details.status, "blocked");
  assert.equal(gatewayCalls.length, 0);
});

test("live mode sends opener and private objective through separate fields", async () => {
  const { tool, gatewayCalls } = createHarness({ liveEnabled: true });
  const started = await tool.execute("tool-1", { action: "start", packet });
  assert.equal(started.details.status, "initiated");
  const startCall = gatewayCalls[0];
  assert.equal(startCall.method, "voicecall.start");
  assert.equal(startCall.params.message, packet.opener);
  assert.match(startCall.params.objective, /Workflow: appointment/);
  assert.doesNotMatch(startCall.params.message, /Workflow:/);

  const status = await tool.execute("tool-2", {
    action: "status",
    taskId: started.details.task.taskId,
  });
  assert.equal(status.details.status, "completed");
  assert.equal(gatewayCalls[1].method, "voicecall.inspect");
  assert.equal(status.details.task.call.transcript[0].speaker, "assistant");
});
