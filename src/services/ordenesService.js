import { supabase } from "./supabaseClient";
import { formatCurrency, formatEstado, statusTone } from "../utils/formatters";

export async function getOrdenes() {
  const { data, error } = await supabase
    .from("resumen_ordenes")
    .select("codigo,cliente,vehiculo,estado,total_orden,fecha_ingreso")
    .order("fecha_ingreso", { ascending: false });

  if (error) {
    throw error;
  }

  return data.map((order) => ({
    codigo: order.codigo,
    cliente: order.cliente,
    vehiculo: order.vehiculo,
    estadoRaw: order.estado,
    estado: formatEstado(order.estado),
    total: formatCurrency(order.total_orden),
    tone: statusTone(order.estado)
  }));
}

export async function createOrdenTrabajo(orden) {
  const { error } = await supabase.from("ordenes_trabajo").insert(orden);

  if (error) {
    throw error;
  }
}

export async function updateOrdenEstado(codigo, estado) {
  const { error } = await supabase
    .from("ordenes_trabajo")
    .update({ estado })
    .eq("codigo", codigo);

  if (error) {
    throw error;
  }
}
