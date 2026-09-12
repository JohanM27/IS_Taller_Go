export function formatCurrency(value) {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    maximumFractionDigits: 2
  }).format(Number(value ?? 0));
}

export function sumOrderTotals(loadedOrders) {
  const total = loadedOrders.reduce((sum, order) => {
    const numericValue = Number(order.totalRaw ?? String(order.total).replace(/[^\d.-]/g, ""));
    return sum + (Number.isNaN(numericValue) ? 0 : numericValue);
  }, 0);

  return formatCurrency(total);
}
