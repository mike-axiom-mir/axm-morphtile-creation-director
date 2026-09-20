"use strict";

const { run, MACHINE } = require("./index");
const { assertRequest, result } = require("./envelope");
const { snapshot, digest } = require("./data");

// Adapters are supplied by the host. This module never imports a sibling machine,
// loads a path, commits a world, or turns a verification PASS into canon.
function createKit(request, registry, adapters = {}) {
  assertRequest(request);
  try { request = snapshot(request); } catch (_) { return run(request, registry); }
  const missing = ["materializeKit", "verifyKit"].filter(key => typeof adapters[key] !== "function");
  if (!adapters.runtime) missing.push("runtime");
  if (missing.length) return result(request, MACHINE, "HOLD", { holds: [{ code: "HOLD_CREATION_ADAPTER_MISSING", missing }] });
  const report = run(request, registry);
  const held = (code, detail, observations = {}) => result(request, MACHINE, "HOLD", {
    candidate: { schema: "axm.morphtile.creation-output/v0.1", report, kit: null, ...observations },
    holds: [{ code, detail }], warnings: report.warnings
  });
  if (report.status !== "CANDIDATE") return result(request, MACHINE, report.status, {
    candidate: { schema: "axm.morphtile.creation-output/v0.1", report, kit: null }, holds: report.holds, warnings: report.warnings
  });
  const assembled = report.candidate.route.find(step => step.id === adapters.assembly_task && step.kind === "assembly");
  const verified = report.candidate.route.find(step => step.id === adapters.verification_task && step.kind === "verification");
  if (!assembled || !verified || assembled.status !== "CANDIDATE" || verified.status !== "PASS" ||
      !verified.packet.candidate || digest(verified.packet.candidate) !== digest(assembled.response.candidate)) {
    return held("HOLD_CREATION_VERIFICATION_UNBOUND", "Select an assembly task and a passing verification task that consumed its exact candidate.");
  }
  let built, checked;
  try {
    built = snapshot(adapters.materializeKit(snapshot(assembled.response), adapters.runtime));
    if (built.status !== "CANDIDATE" || !built.kit) return held("HOLD_CREATION_KIT_NOT_READY", "Assembly did not produce a complete portable kit.", { kit_build: built });
    checked = snapshot(adapters.verifyKit(snapshot(built), adapters.runtime));
    if (checked.status !== "PASS") return result(request, MACHINE, checked.status === "FAIL" ? "FAIL" : "HOLD", {
      candidate: { schema: "axm.morphtile.creation-output/v0.1", report, kit: null, kit_build: built, kit_verification: checked },
      holds: [{ code: "HOLD_CREATION_KIT_VERIFICATION", detail: "Independent kit verification did not pass." }], warnings: report.warnings
    });
  } catch (error) {
    return held("HOLD_CREATION_ADAPTER_FAILED", String(error.message || error).slice(0, 500));
  }
  const { kit, ...kitBuild } = built;
  return result(request, MACHINE, "CANDIDATE", {
    candidate: { schema: "axm.morphtile.creation-output/v0.1", report, kit, kit_build: kitBuild, kit_verification: checked },
    evidence: [{ kind: "CREATION_PIPELINE", status: "PASS", check: "selected assembly, candidate verification, kit materialization and independent kit verification completed; runtime behavior and visuals require their own evidence" }],
    warnings: report.warnings
  });
}

module.exports = { createKit };
