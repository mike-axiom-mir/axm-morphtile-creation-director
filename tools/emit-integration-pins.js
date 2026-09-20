const fs = require("node:fs");
const path = require("node:path");

const REQUIRED_KINDS = Object.freeze([
  "form",
  "surface",
  "capability",
  "interface",
  "assembly",
  "verification",
  "core"
]);

function fail(message) {
  throw new Error(`integration pins: ${message}`);
}

function validateIntegrationSources(sources) {
  if (!sources || typeof sources !== "object" || Array.isArray(sources)) {
    fail("fixture must be an object");
  }

  const observed = Object.keys(sources).sort();
  const expected = [...REQUIRED_KINDS].sort();
  if (JSON.stringify(observed) !== JSON.stringify(expected)) {
    fail(`fixture keys must be exactly ${expected.join(", ")}`);
  }

  const out = {};
  for (const kind of REQUIRED_KINDS) {
    const source = sources[kind];
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      fail(`${kind} source must be an object`);
    }
    if (typeof source.repository !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(source.repository)) {
      fail(`${kind} repository must be an exact owner/repository name`);
    }
    if (typeof source.commit !== "string" || !/^[0-9a-f]{40}$/.test(source.commit)) {
      fail(`${kind} commit must be an exact 40-character lowercase SHA`);
    }
    if (typeof source.entry !== "string" || !source.entry.trim()) {
      fail(`${kind} entry must be a non-empty repository path`);
    }
    out[kind] = {
      repository: source.repository,
      commit: source.commit,
      entry: source.entry
    };
  }
  return out;
}

function loadIntegrationSources(filePath = path.resolve(__dirname, "../fixtures/integration-sources.json")) {
  return validateIntegrationSources(JSON.parse(fs.readFileSync(filePath, "utf8")));
}

function githubOutputLines(sources) {
  const pins = validateIntegrationSources(sources);
  return REQUIRED_KINDS.flatMap((kind) => [
    `${kind}_repository=${pins[kind].repository}`,
    `${kind}_commit=${pins[kind].commit}`
  ]).join("\n") + "\n";
}

if (require.main === module) {
  const lines = githubOutputLines(loadIntegrationSources());
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, lines, "utf8");
  else process.stdout.write(lines);
}

module.exports = {
  REQUIRED_KINDS,
  validateIntegrationSources,
  loadIntegrationSources,
  githubOutputLines
};
