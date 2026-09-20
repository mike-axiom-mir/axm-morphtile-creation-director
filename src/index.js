"use strict";

const { assertRequest, result } = require("./envelope");
const MACHINE = { id: "axm.morphtile.creation-director", version: "0.1.1" };
const ORDER = ["form", "surface", "capability", "interface", "assembly", "verification"];
const SUPPORTED_KINDS = new Set(ORDER);
const CHILD_STATUSES = new Set(["CANDIDATE", "PASS", "HOLD", "FAIL"]);

function summarizeRoute(route) {
  let status = "CANDIDATE";
  const holds = [];

  for (const entry of route) {
    const childStatus = entry && entry.response && entry.response.status;

    if (!CHILD_STATUSES.has(childStatus)) {
      holds.push({
        code: "HOLD_MACHINE_RESPONSE_INVALID",
        kind: entry.kind,
        machine: entry.machine,
        observed_status: childStatus === undefined ? null : childStatus
      });
      if (status !== "FAIL") status = "HOLD";
      continue;
    }

    if (childStatus === "FAIL") status = "FAIL";
    else if (childStatus === "HOLD" && status !== "FAIL") status = "HOLD";
  }

  return { status, holds };
}

function run(request, registry = {}) {
  assertRequest(request);
  const tasks = Array.isArray(request.tasks) ? request.tasks : [];
  const route = [];
  for (const task of tasks) {
    const kind = task && task.kind;
    if (!SUPPORTED_KINDS.has(kind)) {
      return result(request, MACHINE, "HOLD", {
        holds: [{ code: "HOLD_MACHINE_KIND_UNSUPPORTED", kind: kind === undefined ? null : kind, allowed_kinds: ORDER }]
      });
    }
    const machine = registry[kind];
    if (!machine || typeof machine.run !== "function") {
      return result(request, MACHINE, "HOLD", { holds: [{ code: "HOLD_MACHINE_MISSING", kind }], suggested_missing_capability: "machine:" + kind });
    }
    route.push({ kind, machine: machine.id, response: machine.run(task.packet) });
  }
  route.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));

  const summary = summarizeRoute(route);
  return result(request, MACHINE, summary.status, {
    candidate: { schema: "axm.morphtile.director-report/v0.1", goal: request.goal, route },
    holds: summary.holds,
    evidence: [
      { kind: "ROUTING", status: "PASS", check: "explicit six-machine registry scope only; no private chat state" },
      { kind: "CHILD_STATUS_PROPAGATION", status: summary.status === "CANDIDATE" ? "PASS" : summary.status, check: "FAIL > HOLD > CANDIDATE/PASS; invalid child status => HOLD" }
    ]
  });
}

module.exports = { MACHINE, ORDER, SUPPORTED_KINDS, summarizeRoute, run };
