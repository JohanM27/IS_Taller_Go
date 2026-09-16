import test from "node:test";
import assert from "node:assert/strict";
import { productRanking } from "./productRanking.js";

test("counts units once despite installments, excludes unpaid orders and filters local payment day", () => {
  const orders = [
    { id: "paid", estadoRaw: "facturada", saldoPendienteRaw: 0 },
    { id: "unpaid", estadoRaw: "en_proceso", saldoPendienteRaw: 10 }
  ];
  const payments = [
    { orden_id: "paid", pagado_en: "2026-09-01T12:00:00Z" },
    { orden_id: "paid", pagado_en: "2026-10-01T05:00:00Z" },
    { orden_id: "unpaid", pagado_en: "2026-09-10T12:00:00Z" }
  ];
  const details = [
    { orden_id: "paid", repuesto_id: "a", cantidad: 3, precio_unitario: 10, repuestos: { nombre: "Filtro" } },
    { orden_id: "paid", repuesto_id: "b", cantidad: 1, precio_unitario: 100 },
    { orden_id: "unpaid", repuesto_id: "b", cantidad: 20, precio_unitario: 100 }
  ];
  const result = productRanking(details, orders, payments, "2026-09-01", "2026-09-30");
  assert.equal(result[0].id, "a");
  assert.equal(result[0].units, 3);
  assert.equal(result[0].cents, 3000);
  assert.equal(result[1].units, 1);
  assert.deepEqual(productRanking(details, orders, payments, "2026-10-01", "2026-10-31"), []);
});
