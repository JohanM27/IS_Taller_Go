import { supabase } from "./supabaseClient";
import { formatCurrency, formatEstado, statusTone } from "../utils/formatters";

export async function getDashboardData() {
  const [ordenesResponse, clientesResponse, stockResponse] = await Promise.all([
    supabase
      .from("resumen_ordenes")
      .select("codigo,cliente,vehiculo,estado,total_orden")
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
      codigo: order.codigo,
      cliente: order.cliente,
      vehiculo: order.vehiculo,
      estado: formatEstado(order.estado),
      total: formatCurrency(order.total_orden),
      tone: statusTone(order.estado)
    })),
    clientesCount: clientesResponse.count ?? 0,
    stockBajoCount: stockResponse.count ?? 0
  };
}
