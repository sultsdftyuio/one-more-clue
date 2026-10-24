// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { paidCases } from "../../data/catalog.ts";
import { accessFor, unlockedCases } from "./access.ts";

const deadAir = paidCases.find((c) => c.id === "case-002")!;
const snowedIn = paidCases.find((c) => c.id === "case-004")!;

test("a case bought on its own unlocks only that case", () => {
  const unlocked = unlockedCases([{ case_id: "case-002", status: "paid" }], paidCases);
  assert.deepEqual([...unlocked], ["case-002"]);
});

test("the bundle unlocks every case in it", () => {
  const unlocked = unlockedCases([{ case_id: "bundle-season-1", status: "paid" }], paidCases);
  for (const id of ["case-002", "case-003", "case-004"]) assert.ok(unlocked.has(id), id);
});

test("refunded purchases unlock nothing", () => {
  assert.equal(unlockedCases([{ case_id: "bundle-season-1", status: "refunded" }], paidCases).size, 0);
});

test("access: free cases, testing before payments are on, locked until owned", () => {
  const none = new Set<string>();
  assert.equal(accessFor({ paidCase: null, purchasable: true, unlocked: none }), "free");
  assert.equal(accessFor({ paidCase: deadAir, purchasable: false, unlocked: none }), "testing");
  assert.equal(accessFor({ paidCase: deadAir, purchasable: true, unlocked: none }), "locked");
  assert.equal(accessFor({ paidCase: snowedIn, purchasable: true, unlocked: new Set(["case-004"]) }), "owned");
});
