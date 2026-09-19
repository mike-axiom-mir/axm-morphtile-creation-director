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
