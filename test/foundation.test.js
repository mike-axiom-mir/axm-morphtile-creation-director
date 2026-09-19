const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("../fixtures/request.route.json");
const { run } = require("../src");
const registry = {
  verification: { id: "fixture.verification", run: packet => ({ request_id: packet.request_id, status: "PASS" }) },
  form: { id: "fixture.form", run: packet => ({ request_id: packet.request_id, status: "CANDIDATE" }) }
};

test("routes deterministically through an explicit registry without private context", () => {
  const out = run(request, registry);
  assert.equal(out.status, "CANDIDATE");
  assert.deepEqual(out.candidate.route.map(x => x.kind), ["form", "verification"]);
  assert.deepEqual(run(request, registry), out);
});

test("holds when a requested machine is missing", () => {
  const out = run({ ...request, request_id: "director-held", tasks: [{ kind: "surface", packet: {} }] }, registry);
  assert.equal(out.status, "HOLD");
  assert.equal(out.holds[0].code, "HOLD_MACHINE_MISSING");
});

test("propagates a child HOLD instead of claiming a clean candidate", () => {
  const localRegistry = {
    ...registry,
    form: { id: "fixture.form", run: packet => ({ request_id: packet.request_id, status: "HOLD", holds: [{ code: "HOLD_FORM_GAP" }] }) }
  };
  const out = run(request, localRegistry);
  assert.equal(out.status, "HOLD");
  assert.equal(out.candidate.route[0].response.status, "HOLD");
});

test("FAIL outranks HOLD across child machine responses", () => {
  const localRegistry = {
    form: { id: "fixture.form", run: packet => ({ request_id: packet.request_id, status: "HOLD" }) },
    verification: { id: "fixture.verification", run: packet => ({ request_id: packet.request_id, status: "FAIL" }) }
  };
  const out = run(request, localRegistry);
  assert.equal(out.status, "FAIL");
});

test("holds on an invalid child status instead of inventing success", () => {
  const localRegistry = {
    ...registry,
    form: { id: "fixture.form", run: packet => ({ request_id: packet.request_id, status: "DONE" }) }
  };
  const out = run(request, localRegistry);
  assert.equal(out.status, "HOLD");
  assert.equal(out.holds[0].code, "HOLD_MACHINE_RESPONSE_INVALID");
  assert.equal(out.holds[0].observed_status, "DONE");
});
