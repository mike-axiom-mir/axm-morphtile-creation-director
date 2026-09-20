"use strict";

const { createHash } = require("node:crypto");
const MAX_PACKET_BYTES = 2 * 1024 * 1024;

// Transport bounds, not a limit on the complexity a MorphTile world may contain.
function snapshot(value, maxBytes = MAX_PACKET_BYTES) {
  const active = new Set();
  let nodes = 0;
  function check(item, depth) {
    if (++nodes > 200000 || depth > 128) throw new Error("JSON transport node/depth budget exceeded");
    if (item === null || typeof item === "string" || typeof item === "boolean") return;
    if (typeof item === "number" && Number.isFinite(item)) return;
    if (!item || typeof item !== "object") throw new Error("packets must contain finite JSON data only");
    if (active.has(item)) throw new Error("cyclic packet");
    if (!Array.isArray(item) && Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) throw new Error("packets must contain plain JSON objects");
    const keys = Object.keys(item);
    if (Array.isArray(item) && (keys.length !== item.length || keys.some((key, i) => key !== String(i)))) throw new Error("packet arrays must be dense and have no extra fields");
    active.add(item);
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) throw new Error("packet accessors are unsupported");
      check(descriptor.value, depth + 1);
    }
    active.delete(item);
  }
  check(value, 0);
  const text = JSON.stringify(value);
  if (Buffer.byteLength(text) > maxBytes) throw new Error("JSON transport byte budget exceeded");
  return JSON.parse(text);
}

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
}

const digest = value => createHash("sha256").update(canonical(value)).digest("hex");
module.exports = { MAX_PACKET_BYTES, snapshot, canonical, digest };
