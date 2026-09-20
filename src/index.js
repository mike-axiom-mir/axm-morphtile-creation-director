"use strict";

const { assertRequest, result } = require("./envelope");
const { ORDER, PLAN_SCHEMA, MAX_TASKS, prepare } = require("./plan");
const { snapshot, canonical, digest } = require("./data");
const MACHINE = { id: "axm.morphtile.creation-director", version: "0.2.0" };
const SUPPORTED_KINDS = new Set(ORDER);
const CHILD_STATUSES = new Set(["CANDIDATE", "PASS", "HOLD", "FAIL"]);

function summarizeRoute(route) {
  let status = "CANDIDATE";
  const holds = [];
  for (const entry of route) {
    const childStatus = entry.status || (entry.response && entry.response.status);
    if (!CHILD_STATUSES.has(childStatus)) {
      holds.push({ code: "HOLD_MACHINE_RESPONSE_INVALID", kind: entry.kind, machine: entry.machine, observed_status: childStatus === undefined ? null : childStatus });
      if (status !== "FAIL") status = "HOLD";
    } else if (childStatus === "FAIL") status = "FAIL";
    else if (childStatus === "HOLD" && status !== "FAIL") status = "HOLD";
  }
  return { status, holds };
}

function responseError(response, task, strict) {
  if (!response || !CHILD_STATUSES.has(response.status)) return "invalid child status";
  if (!strict) return null;
  if (response.envelope_version !== "0.1" || response.request_id !== task.packet.request_id) return "response does not identify the submitted request";
  if (!response.machine || response.machine.id !== task.machine.id || response.machine.version !== task.machine.version) return "response machine identity does not match the registry";
  if (response.status === "CANDIDATE" && (!response.candidate || typeof response.candidate !== "object" || Array.isArray(response.candidate))) return "CANDIDATE response is missing candidate data";
  for (const field of ["holds", "warnings", "evidence", "dependencies"]) if (!Array.isArray(response[field])) return "response " + field + " must be an array";
  if (["CANDIDATE", "PASS"].includes(response.status) && response.holds.length) return "successful response contains unresolved holds";
  return null;
}

function run(request, registry = {}) {
  assertRequest(request);
  let input;
  try { input = snapshot(request); }
  catch (error) { return result({ envelope_version: "0.1", request_id: request.request_id, goal: request.goal }, MACHINE, "HOLD", { holds: [{ code: "HOLD_PLAN_JSON_INVALID", detail: error.message }] }); }
  const plan = prepare(input, registry);
  if (plan.holds.length) return result(input, MACHINE, "HOLD", { holds: plan.holds, suggested_missing_capability: plan.holds[0].code === "HOLD_MACHINE_MISSING" ? "machine:" + plan.holds[0].kind : null });
  const route = [], finished = new Map(), holds = [], warnings = [];
  let reportBytes = 0, reportFull = false;
  for (const task of plan.tasks) {
    const entry = { id: task.id, kind: task.kind, machine: task.machine.id, dependencies: task.deps, execution: "BLOCKED", status: "HOLD", packet: null, response: null, packet_sha256: null, response_sha256: null };
    const hold = (code, fields = {}) => { const item = { code, task: task.id, kind: task.kind, ...fields }; holds.push(item); entry.hold = item; };
    const blocked = task.deps.filter(id => !["CANDIDATE", "PASS"].includes(finished.get(id).status));
    if (reportFull) hold("HOLD_REPORT_BUDGET_EXCEEDED");
    else if (blocked.length) hold("HOLD_TASK_DEPENDENCY_UNAVAILABLE", { sources: blocked });
    else {
      try {
        const packet = snapshot(task.packet);
        if (task.inputs_from) packet.inputs = [...(packet.inputs || []), ...task.inputs_from.map(id => snapshot(finished.get(id).response))];
        if (task.candidate_from) {
          const source = finished.get(task.candidate_from).response;
          if (!source || !source.candidate) throw new Error("candidate_from source has no candidate");
          packet.candidate = snapshot(source.candidate);
        }
        entry.packet = snapshot(packet);
        entry.packet_sha256 = digest(entry.packet);
        entry.sources = task.deps.map(id => ({ task: id, response_sha256: finished.get(id).response_sha256 }));
        if (reportBytes + Buffer.byteLength(canonical(packet)) > 16 * 1024 * 1024) { reportFull = true; entry.packet = null; throw new Error("director report byte budget exceeded"); }
        entry.execution = "EXECUTED";
        const raw = task.machine.run(packet);
        if (raw instanceof Promise) { raw.catch(() => {}); throw new Error("machine.run must be synchronous"); }
        entry.response = snapshot(raw);
        entry.response_sha256 = digest(entry.response);
        const bad = responseError(entry.response, task, plan.strict);
        if (bad) hold("HOLD_MACHINE_RESPONSE_INVALID", { observed_status: entry.response && entry.response.status !== undefined ? entry.response.status : null, detail: bad });
        else if (canonical(packet) !== canonical(entry.packet)) hold("HOLD_MACHINE_MUTATED_PACKET");
        else {
          entry.status = entry.response.status;
          if (["HOLD", "FAIL"].includes(entry.status)) hold("HOLD_CHILD_RESULT", { observed_status: entry.status, child_holds: entry.response.holds || [] });
        }
        reportBytes += Buffer.byteLength(canonical({ packet: entry.packet, response: entry.response }));
        if (reportBytes > 16 * 1024 * 1024) { reportFull = true; entry.status = "HOLD"; hold("HOLD_REPORT_BUDGET_EXCEEDED"); entry.packet = null; entry.response = null; }
        const childWarnings = entry.response && entry.response.warnings;
        if (Array.isArray(childWarnings)) for (const warning of childWarnings) warnings.push({ task: task.id, machine: task.machine.id, warning });
      } catch (error) {
        entry.status = "HOLD";
        hold(entry.execution === "EXECUTED" ? "HOLD_MACHINE_EXECUTION_FAILED" : "HOLD_TASK_BINDING_FAILED", { detail: String(error.message || error).slice(0, 500) });
      }
    }
    route.push(entry); finished.set(task.id, entry);
  }
  const summary = summarizeRoute(route);
  const dependencies = new Set(plan.tasks.flatMap(task => task.deps));
  const report = result(input, MACHINE, summary.status, {
    candidate: {
      schema: "axm.morphtile.director-report/v0.2", goal: input.goal,
      order: route.map(entry => entry.id), terminal_tasks: route.filter(entry => !dependencies.has(entry.id)).map(entry => entry.id), route
    },
    holds: [...holds, ...summary.holds], warnings,
    evidence: [
      { kind: "ROUTING", status: "PASS", check: "complete graph preflight; dependencies first; kind then task id breaks ties; explicit six-machine registry" },
      { kind: "CHILD_STATUS_PROPAGATION", status: summary.status === "CANDIDATE" ? "PASS" : summary.status, check: "FAIL > HOLD > CANDIDATE/PASS; unavailable dependencies block descendants" },
      { kind: "TRACE", status: "PASS", check: "retained packets and responses use SHA-256 over sorted-key JSON; hashes are identity evidence, not authentication" }
    ]
  });
  try { return snapshot(report, 16 * 1024 * 1024); }
  catch (error) {
    return result(input, MACHINE, summary.status === "FAIL" ? "FAIL" : "HOLD", {
      holds: [{ code: "HOLD_REPORT_BUDGET_EXCEEDED", detail: error.message }],
      evidence: [{ kind: "TRACE", status: "HOLD", check: "report exceeded transport bounds; full candidate omitted", tasks: route.map(e => ({ id: e.id, status: e.status, execution: e.execution, packet_sha256: e.packet_sha256, response_sha256: e.response_sha256 })) }]
    });
  }
}

module.exports = { MACHINE, ORDER, SUPPORTED_KINDS, PLAN_SCHEMA, MAX_TASKS, summarizeRoute, run };
