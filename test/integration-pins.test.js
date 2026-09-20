const test = require("node:test");
const assert = require("node:assert/strict");
const fixture = require("../fixtures/integration-sources.json");
const {
  REQUIRED_KINDS,
  validateIntegrationSources,
  githubOutputLines
} = require("../tools/emit-integration-pins");

test("integration source fixture is the complete exact seven-part ecosystem", () => {
  const pins = validateIntegrationSources(fixture);
  assert.deepEqual(Object.keys(pins), REQUIRED_KINDS);
  for (const kind of REQUIRED_KINDS) {
    assert.match(pins[kind].repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
    assert.match(pins[kind].commit, /^[0-9a-f]{40}$/);
    assert.ok(pins[kind].entry.length > 0);
  }
});

test("GitHub checkout outputs are derived from the fixture without a second SHA list", () => {
  const output = githubOutputLines(fixture);
  for (const kind of REQUIRED_KINDS) {
    assert.match(output, new RegExp(`(?:^|\\n)${kind}_repository=${fixture[kind].repository.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}(?:\\n|$)`));
    assert.match(output, new RegExp(`(?:^|\\n)${kind}_commit=${fixture[kind].commit}(?:\\n|$)`));
  }
});

test("pin validation fails closed on missing, extra or non-exact source identities", () => {
  const missing = structuredClone(fixture);
  delete missing.surface;
  assert.throws(() => validateIntegrationSources(missing), /fixture keys must be exactly/);

  const extra = structuredClone(fixture);
  extra.wildcard = extra.form;
  assert.throws(() => validateIntegrationSources(extra), /fixture keys must be exactly/);

  const badCommit = structuredClone(fixture);
  badCommit.form.commit = "main";
  assert.throws(() => validateIntegrationSources(badCommit), /exact 40-character lowercase SHA/);

  const badRepository = structuredClone(fixture);
  badRepository.core.repository = "mike-axiom-mir/axm-morphtile\ncore_commit=deadbeef";
  assert.throws(() => validateIntegrationSources(badRepository), /exact owner\/repository name/);
});
