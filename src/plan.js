"use strict";

const ORDER = Object.freeze(["form", "surface", "capability", "interface", "assembly", "verification"]);
const PLAN_SCHEMA = "axm.morphtile.creation-plan/v0.1";
const MAX_TASKS = 64;
const ID = /^[A-Za-z0-9_-]{1,80}$/;
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const object = value => !!value && typeof value === "object" && !Array.isArray(value);

function prepare(request, registry) {
  const strict = request.schema === PLAN_SCHEMA;
  const holds = [];
  const add = (code, fields = {}) => holds.push({ code, ...fields });
  if (request.schema !== undefined && !strict && request.schema !== "axm.morphtile.goal-request/v0.1") return { holds: [{ code: "HOLD_PLAN_SCHEMA_UNSUPPORTED", schema: request.schema }] };
  if (!Array.isArray(request.tasks) || !request.tasks.length || request.tasks.length > MAX_TASKS) return { holds: [{ code: "HOLD_TASKS_INVALID", detail: `tasks must contain 1..${MAX_TASKS} entries` }] };
  if (!object(registry)) return { holds: [{ code: "HOLD_REGISTRY_INVALID" }] };
  const tasks = [], byId = new Map(), requestIds = new Set();
  for (const [index, task] of request.tasks.entries()) {
    const kind = task && task.kind;
    if (!ORDER.includes(kind)) {
      add("HOLD_MACHINE_KIND_UNSUPPORTED", { kind: kind === undefined ? null : kind, allowed_kinds: ORDER }); continue;
    }
    if (!object(task)) { add("HOLD_TASK_INVALID", { index }); continue; }
    const allowed = strict ? ["id", "kind", "packet", "depends_on", "inputs_from", "candidate_from"] : ["kind", "packet"];
    const unknown = Object.keys(task).filter(key => !allowed.includes(key)).sort();
    if (unknown.length) { add("HOLD_TASK_FIELD_UNKNOWN", { index, fields: unknown }); continue; }
    const id = strict ? task.id : "task_" + String(index + 1).padStart(3, "0");
    if (typeof id !== "string" || !ID.test(id) || byId.has(id)) {
      add("HOLD_TASK_ID_INVALID", { index, id: id === undefined ? null : id }); continue;
    }
    const machine = own(registry, kind) ? registry[kind] : null;
    if (!machine || typeof machine.run !== "function") add("HOLD_MACHINE_MISSING", { task: id, kind });
    else if (typeof machine.id !== "string" || !machine.id || (strict && (typeof machine.version !== "string" || !machine.version))) add("HOLD_MACHINE_IDENTITY_INVALID", { task: id, kind });
    if (!object(task.packet)) add("HOLD_TASK_PACKET_INVALID", { task: id });
    else if (strict) {
      const p = task.packet;
      if (p.envelope_version !== "0.1" || typeof p.request_id !== "string" || !p.request_id || typeof p.goal !== "string" || !p.goal) add("HOLD_TASK_PACKET_INVALID", { task: id });
      else if (requestIds.has(p.request_id)) add("HOLD_TASK_REQUEST_ID_DUPLICATE", { task: id, request_id: p.request_id });
      requestIds.add(p.request_id);
    }
    const deps = new Set();
    for (const field of ["depends_on", "inputs_from"]) {
      if (task[field] === undefined) continue;
      if (!Array.isArray(task[field]) || task[field].some(x => typeof x !== "string" || !ID.test(x)) || new Set(task[field]).size !== task[field].length) add("HOLD_TASK_REFERENCES_INVALID", { task: id, field });
      else for (const source of task[field]) deps.add(source);
    }
    if (task.inputs_from !== undefined && kind !== "assembly") add("HOLD_TASK_BINDING_INVALID", { task: id, detail: "inputs_from belongs to assembly" });
    if (task.inputs_from !== undefined && task.packet && task.packet.inputs !== undefined && !Array.isArray(task.packet.inputs)) add("HOLD_TASK_BINDING_INVALID", { task: id, detail: "literal inputs must be an array" });
    if (task.candidate_from !== undefined) {
      if (kind !== "verification" || typeof task.candidate_from !== "string" || !ID.test(task.candidate_from)) add("HOLD_TASK_BINDING_INVALID", { task: id, detail: "candidate_from must name a source for verification" });
      else deps.add(task.candidate_from);
      if (task.packet && own(task.packet, "candidate")) add("HOLD_TASK_BINDING_CONFLICT", { task: id, detail: "candidate_from cannot overwrite a literal candidate" });
    }
    const entry = { ...task, id, deps: [...deps].sort(), machine };
    tasks.push(entry); byId.set(id, entry);
  }
  for (const task of tasks) for (const source of task.deps) if (!byId.has(source)) add("HOLD_TASK_DEPENDENCY_MISSING", { task: task.id, source });
  if (holds.length) return { strict, holds };
  const scheduled = [], pending = new Set(tasks.map(t => t.id)), done = new Set();
  const compare = (a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  while (pending.size) {
    const ready = tasks.filter(t => pending.has(t.id) && t.deps.every(id => done.has(id))).sort(compare);
    if (!ready.length) return { strict, holds: [{ code: "HOLD_TASK_DEPENDENCY_CYCLE", tasks: [...pending].sort() }] };
    const next = ready[0]; scheduled.push(next); pending.delete(next.id); done.add(next.id);
  }
  return { strict, holds, tasks: scheduled };
}

module.exports = { ORDER, PLAN_SCHEMA, MAX_TASKS, prepare };
