import {
  renderPrivateObjective,
  validateTaskPacket,
} from "./task-call-core.js";

const TASK_CALL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["action"],
  properties: {
    action: { type: "string", enum: ["prepare"] },
    packet: {
      type: "object",
      additionalProperties: false,
      properties: {
        workflow: { type: "string", enum: ["appointment", "information"] },
        authorization: { type: "string", enum: ["information_only", "schedule"] },
        phone: { type: "string" },
        targetName: { type: "string" },
        callerName: { type: "string" },
        opener: { type: "string" },
        objective: { type: "string" },
        authorizedFacts: { type: "array", items: { type: "string" } },
        questions: { type: "array", items: { type: "string" } },
        constraints: { type: "array", items: { type: "string" } },
        escalation: { type: "string" },
        allowPayment: { type: "boolean" },
      },
    },
  },
};

function jsonResult(payload) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    details: payload,
  };
}

export default function register(api) {
  api.registerTool(() => ({
    name: "task_call",
    label: "Task Call",
    description:
      "Validate a constrained appointment/information call packet and produce a Voice Call request. This local plugin never dials by itself.",
    parameters: TASK_CALL_SCHEMA,
    async execute(_toolCallId, rawParams) {
      try {
        const params = rawParams && typeof rawParams === "object" ? rawParams : {};
        if (params.action === "prepare") {
          const packet = validateTaskPacket(params.packet);
          const objective = renderPrivateObjective(packet);
          return jsonResult({
            ok: true,
            status: "ready",
            packet,
            privateObjectivePreview: objective,
            voiceCallRequest: {
              action: "initiate_call",
              to: packet.phone,
              message: packet.opener,
              objective,
              mode: "conversation",
            },
          });
        }
        throw new Error("action must be prepare");
      } catch (error) {
        return jsonResult({
          ok: false,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  }));

  api.logger?.info?.("[task-call] Loaded (validator mode; Voice Call owns execution)");
}
