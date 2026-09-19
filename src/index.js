"use strict";

const { assertRequest, result } = require("./envelope");
const MACHINE = { id: "axm.morphtile.creation-director", version: "0.1.0" };
const ORDER = ["form", "surface", "capability", "interface", "assembly", "verification"];

function run(request, registry = {}) {
  assertRequest(request);
  const tasks = Array.isArray(request.tasks) ? request.tasks : [];
  const route = [];
  for (const task of tasks) {
    const machine = registry[task.kind];
    if (!machine || typeof machine.run !== "function") {
      return result(request, MACHINE, "HOLD", { holds: [{ code: "HOLD_MACHINE_MISSING", kind: task.kind }], suggested_missing_capability: "machine:" + task.kind });
    }
    route.push({ kind: task.kind, machine: machine.id, response: machine.run(task.packet) });
  }
  route.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  return result(request, MACHINE, "CANDIDATE", {
    candidate: { schema: "axm.morphtile.director-report/v0.1", goal: request.goal, route },
    evidence: [{ kind: "ROUTING", status: "PASS", check: "explicit registry only; no private chat state" }]
  });
}

module.exports = { MACHINE, ORDER, run };
