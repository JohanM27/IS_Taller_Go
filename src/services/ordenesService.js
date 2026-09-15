import { supabase } from "./supabaseClient";
import { formatCurrency } from "../utils/formatters";

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
    total: formatCurrency(order.total_orden),
    totalRaw: Number(order.total_orden ?? 0),
    totalPagado: formatCurrency(order.total_pagado),
    totalPagadoRaw: Number(order.total_pagado ?? 0),
    saldoPendiente: formatCurrency(order.saldo_pendiente),
    saldoPendienteRaw: Number(order.saldo_pendiente ?? 0)
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

export async function updateOrdenEstado(ordenId, estado) {
  const { error } = await supabase
    .from("ordenes_trabajo")
    .update({ estado })
    .eq("id", ordenId);

  if (error) {
    throw error;
  }
}

export async function getOrdenDetalles(ordenId) {
  const [serviciosRes, repuestosRes] = await Promise.all([
    supabase.from("detalle_servicios").select("*, servicios(nombre)").eq("orden_id", ordenId),
    supabase.from("detalle_repuestos").select("*, repuestos(nombre)").eq("orden_id", ordenId)
  ]);

  const items = [];
  
  if (!serviciosRes.error && serviciosRes.data) {
    serviciosRes.data.forEach(item => {
      items.push({
        id: 'srv_' + item.id,
        tipo: 'Servicio',
        nombre: item.servicios?.nombre || item.descripcion,
        cantidad: item.cantidad || 1,
        precio_unitario: item.precio_unitario,
        subtotal: (item.cantidad || 1) * item.precio_unitario
      });
    });
  }

  if (!repuestosRes.error && repuestosRes.data) {
    repuestosRes.data.forEach(item => {
      items.push({
        id: 'rep_' + item.id,
        tipo: 'Repuesto',
        nombre: item.repuestos?.nombre || item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.cantidad * item.precio_unitario
      });
    });
  }
  
  return items;
}
