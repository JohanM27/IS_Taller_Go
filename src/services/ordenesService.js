import { supabase } from "./supabaseClient";
import { formatCurrency, formatEstado, statusTone } from "../utils/formatters";

export async function getOrdenes() {
  const { data, error } = await supabase
    .from("resumen_ordenes")
    .select("id,codigo,cliente,vehiculo,estado,total_orden,total_pagado,saldo_pendiente,fecha_ingreso")
    .order("fecha_ingreso", { ascending: false });

  if (error) {
    throw error;
  }

  return data.map((order) => ({
    id: order.id,
    codigo: order.codigo,
    cliente: order.cliente,
    vehiculo: order.vehiculo,
    estadoRaw: order.estado,
    estado: formatEstado(order.estado),
    total: formatCurrency(order.total_orden),
    totalRaw: Number(order.total_orden ?? 0),
    totalPagado: formatCurrency(order.total_pagado),
    totalPagadoRaw: Number(order.total_pagado ?? 0),
    saldoPendiente: formatCurrency(order.saldo_pendiente),
    saldoPendienteRaw: Number(order.saldo_pendiente ?? 0),
    tone: statusTone(order.estado)
  }));
}

export async function addServicioToOrden(detalle) {
  const { error } = await supabase.from("detalle_servicios").insert(detalle);

  if (error) {
    throw error;
  }
}

export async function addRepuestoToOrden(detalle) {
  const { error } = await supabase.from("detalle_repuestos").insert(detalle);

  if (error) {
    throw error;
  }
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
