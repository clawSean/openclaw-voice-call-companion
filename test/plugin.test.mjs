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
  let factory;
  const api = {
    pluginConfig,
    logger: { info() {} },
    runtime: {},
    registerTool(value) {
      factory = value;
    },
  };
  register(api);
  const tool = factory({ sessionKey: "agent:main:telegram:group:medclaw" });
  return { tool };
}

test("registers without privileged plugin state", () => {
  assert.doesNotThrow(() => createHarness());
});

test("prepare validates without dialing", async () => {
  const { tool } = createHarness();
  const result = await tool.execute("tool-1", { action: "prepare", packet });
  assert.equal(result.details.ok, true);
  assert.equal(result.details.status, "ready");
  assert.deepEqual(result.details.voiceCallRequest, {
    action: "initiate_call",
    to: packet.phone,
    message: packet.opener,
    objective: result.details.privateObjectivePreview,
    mode: "conversation",
  });
});
