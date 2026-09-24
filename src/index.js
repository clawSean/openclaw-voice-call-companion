import {
  attachCall,
  attachInspection,
  createTaskRecord,
  publicTaskRecord,
  renderPrivateObjective,
  validateTaskPacket,
} from "./task-call-core.js";

const TASK_CALL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["action"],
  properties: {
    action: { type: "string", enum: ["prepare", "start", "status"] },
    taskId: { type: "string" },
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

function normalizeConfig(config) {
  const requestTimeoutMs = Number(config?.requestTimeoutMs);
  return {
    liveEnabled: config?.liveEnabled === true,
    requestTimeoutMs:
      Number.isFinite(requestTimeoutMs) && requestTimeoutMs >= 1_000 && requestTimeoutMs <= 120_000
        ? Math.trunc(requestTimeoutMs)
        : 15_000,
  };
}

export default function register(api) {
  const config = normalizeConfig(api.pluginConfig);
  const tasks = api.runtime.state.openKeyedStore({
    namespace: "tasks",
    maxEntries: 1_000,
    overflowPolicy: "evict-oldest",
  });

  api.registerTool((toolContext) => ({
    name: "task_call",
    label: "Task Call",
    description:
      "Prepare, start, or inspect a constrained outbound appointment/information call. Prepare first. Live calls remain disabled unless the plugin operator explicitly enables them after proof.",
    parameters: TASK_CALL_SCHEMA,
    async execute(_toolCallId, rawParams) {
      try {
        const params = rawParams && typeof rawParams === "object" ? rawParams : {};
        if (params.action === "prepare") {
          const packet = validateTaskPacket(params.packet);
          return jsonResult({
            ok: true,
            status: "ready",
            liveEnabled: config.liveEnabled,
            packet,
            privateObjectivePreview: renderPrivateObjective(packet),
          });
        }
        if (params.action === "start") {
          const packet = validateTaskPacket(params.packet);
          if (!config.liveEnabled) {
            return jsonResult({
              ok: false,
              status: "blocked",
              reason: "Live task calls are disabled. Complete mock-provider and owner-roleplay proof before enabling.",
              packet,
            });
          }
          if (!(await api.runtime.gateway.isAvailable())) {
            throw new Error("A Gateway-hosted agent run is required for trusted Voice Call routing");
          }
          let record = createTaskRecord(packet, toolContext.sessionKey);
          await tasks.register(record.taskId, record);
          const started = await api.runtime.gateway.request(
            "voicecall.start",
            {
              to: packet.phone,
              message: packet.opener,
              objective: renderPrivateObjective(packet),
              mode: "conversation",
              requesterSessionKey: toolContext.sessionKey,
            },
            { timeoutMs: config.requestTimeoutMs, scopes: ["operator.write"] },
          );
          if (!started?.callId) {
            throw new Error("Voice Call did not return a callId");
          }
          record = attachCall(record, started.callId);
          await tasks.register(record.taskId, record);
          return jsonResult({ ok: true, status: "initiated", task: publicTaskRecord(record) });
        }
        if (params.action === "status") {
          const taskId = typeof params.taskId === "string" ? params.taskId.trim() : "";
          if (!taskId) {
            throw new Error("taskId is required for status");
          }
          let record = await tasks.lookup(taskId);
          if (!record) {
            return jsonResult({ ok: false, status: "not_found", taskId });
          }
          if (record.callId) {
            const inspection = await api.runtime.gateway.request(
              "voicecall.inspect",
              { callId: record.callId },
              { timeoutMs: config.requestTimeoutMs, scopes: ["operator.read"] },
            );
            record = attachInspection(record, inspection);
            await tasks.register(record.taskId, record);
          }
          return jsonResult({ ok: true, status: record.state, task: publicTaskRecord(record) });
        }
        throw new Error("action must be prepare, start, or status");
      } catch (error) {
        return jsonResult({
          ok: false,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  }));

  api.logger?.info?.(
    `[task-call] Loaded (${config.liveEnabled ? "live calls enabled" : "no-dial mode"})`,
  );
}
