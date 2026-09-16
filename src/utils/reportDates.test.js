import test from "node:test";
import assert from "node:assert/strict";
import { dateKey, withinDates, paymentTotal, dailyIncome } from "./reportDates.js";

test("Honduras date changes at 06:00 UTC; range includes the whole final day", () => {
  assert.equal(dateKey("2026-09-16T05:59:59Z"), "2026-09-15");
  assert.equal(dateKey("2026-09-16T06:00:00Z"), "2026-09-16");
  assert.equal(withinDates("2026-09-16T05:59:59Z", "2026-09-15", "2026-09-15"), true);
  assert.equal(withinDates("2026-09-16T06:00:00Z", "2026-09-15", "2026-09-15"), false);
  assert.equal(withinDates("2026-08-01T06:00:00Z", "", ""), true);
  assert.equal(withinDates(null, "", ""), false);
});

test("income sums payments in cents and groups by local payment day", () => {
  const payments = [
    { monto: "0.10", pagado_en: "2026-09-16T05:59:59Z" },
    { monto: "0.20", pagado_en: "2026-09-15T06:00:00Z" },
    { monto: "120.00", pagado_en: "2026-10-01T06:00:00Z" }
  ];
  assert.equal(paymentTotal(payments), 120.3);
  assert.equal(paymentTotal([]), 0);
  assert.deepEqual(dailyIncome(payments), [
    { day: "2026-10-01", cents: 12000, count: 1 },
    { day: "2026-09-15", cents: 30, count: 2 }
  ]);
});
