import test from "node:test";
import assert from "node:assert/strict";
import { readAll } from "./readAll.js";

test("reads past 1000 rows without losing historical payments", async () => {
  const rows = Array.from({ length: 1203 }, (_, id) => ({ id }));
  const result = await readAll(() => ({ range: async (from, to) => ({ data: rows.slice(from, to + 1), error: null }) }));
  assert.deepEqual(result, rows);
});

test("rejects partial data when a later page fails", async () => {
  await assert.rejects(readAll(() => ({ range: async (from) => from ? { error: new Error("Failed page") } : { data: Array(500).fill({}), error: null } })), /Failed page/);
});
