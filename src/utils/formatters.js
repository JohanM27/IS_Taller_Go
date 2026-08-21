export function formatEstado(estado) {
  const labels = {
    pendiente: "Pendiente",
    en_proceso: "En proceso",
    finalizada: "Finalizada",
    facturada: "Facturada",
    entregada: "Entregada"
  };

  return labels[estado] ?? estado;
}

export function statusTone(estado) {
  if (["finalizada", "facturada", "entregada"].includes(estado)) {
    return "done";
  }

  if (estado === "pendiente") {
    return "warn";
  }

  return "";
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    maximumFractionDigits: 2
  }).format(Number(value ?? 0));
}

export function sumOrderTotals(loadedOrders) {
  const total = loadedOrders.reduce((sum, order) => {
    const numericValue = Number(String(order.total).replace(/[^\d.-]/g, ""));
    return sum + (Number.isNaN(numericValue) ? 0 : numericValue);
  }, 0);

  return formatCurrency(total);
}
