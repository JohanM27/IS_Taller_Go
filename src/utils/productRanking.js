import { withinDates } from "./reportDates.js";

export function productRanking(details, orders, payments, from, to) {
  const lastPayment = new Map();
  payments.forEach((payment) => {
    if (!lastPayment.has(payment.orden_id) || Date.parse(payment.pagado_en) > Date.parse(lastPayment.get(payment.orden_id))) {
      lastPayment.set(payment.orden_id, payment.pagado_en);
    }
  });
  const soldOrders = new Set(orders.filter((order) =>
    ["facturada", "entregada"].includes(order.estadoRaw) && order.saldoPendienteRaw <= 0 &&
    withinDates(lastPayment.get(order.id), from, to)
  ).map((order) => order.id));
  const products = new Map();
  details.forEach((detail) => {
    if (!soldOrders.has(detail.orden_id)) return;
    const product = products.get(detail.repuesto_id) ?? {
      id: detail.repuesto_id, nombre: detail.repuestos?.nombre ?? "Repuesto", codigo: detail.repuestos?.codigo ?? "—", units: 0, cents: 0
    };
    product.units += Number(detail.cantidad);
    product.cents += Math.round(Number(detail.precio_unitario) * 100) * Number(detail.cantidad);
    products.set(product.id, product);
  });
  return [...products.values()].sort((a, b) => b.units - a.units || b.cents - a.cents || a.nombre.localeCompare(b.nombre)).slice(0, 5);
}
