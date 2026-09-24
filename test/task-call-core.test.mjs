import assert from "node:assert/strict";
import test from "node:test";
import { renderPrivateObjective, validateTaskPacket } from "../src/task-call-core.js";

const packet = {
  workflow: "appointment",
  authorization: "information_only",
  phone: "+15551234567",
  targetName: "Example clinic",
  callerName: "Alex Example",
  opener: "Hi, I'm calling on behalf of Alex Example about becoming a new patient.",
  objective: "Learn whether Alex can be screened as a new patient.",
  authorizedFacts: ["Alex already has a written referral."],
  questions: ["Are you accepting new teaching cases?", "What is the earliest screening date?"],
  constraints: ["He can accept short-notice cancellations."],
};

test("normalizes a bounded appointment packet", () => {
  const normalized = validateTaskPacket(packet);
  assert.equal(normalized.workflow, "appointment");
  assert.equal(normalized.authorization, "information_only");
  assert.equal(normalized.phone, "+15551234567");
});

test("keeps the opener separate from the private objective", () => {
  const objective = renderPrivateObjective(packet);
  assert.match(objective, /Private|Workflow: appointment/);
  assert.match(objective, /Do not book, cancel, purchase, pay/);
  assert.doesNotMatch(packet.opener, /written referral/);
});

test("rejects payments and malformed phone numbers", () => {
  assert.throws(() => validateTaskPacket({ ...packet, allowPayment: true }), /payments/);
  assert.throws(() => validateTaskPacket({ ...packet, phone: "619-216-6665" }), /E\.164/);
});
