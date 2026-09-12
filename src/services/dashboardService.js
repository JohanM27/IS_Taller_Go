import { supabase } from "./supabaseClient";
import { formatCurrency } from "../utils/formatters";

export async function getDashboardData() {
  const [ordenesResponse, clientesResponse, stockResponse] = await Promise.all([
    supabase
      .from("resumen_ordenes")
      .select("id,codigo,cliente,vehiculo,estado,total_orden,total_pagado,saldo_pendiente")
      .order("fecha_ingreso", { ascending: false })
      .limit(8),
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    supabase.from("repuestos_stock_bajo").select("id", { count: "exact", head: true })
  ]);

  const firstError = ordenesResponse.error || clientesResponse.error || stockResponse.error;

  if (firstError) {
    throw firstError;
  }

  return {
    orders: ordenesResponse.data.map((order) => ({
      id: order.id,
      codigo: order.codigo,
      cliente: order.cliente,
      vehiculo: order.vehiculo,
      estadoRaw: order.estado,
      total: formatCurrency(order.total_orden),
      totalRaw: Number(order.total_orden ?? 0),
      totalPagado: formatCurrency(order.total_pagado),
      totalPagadoRaw: Number(order.total_pagado ?? 0),
      saldoPendiente: formatCurrency(order.saldo_pendiente),
      saldoPendienteRaw: Number(order.saldo_pendiente ?? 0)
    })),
    clientesCount: clientesResponse.count ?? 0,
    stockBajoCount: stockResponse.count ?? 0
  };
}
