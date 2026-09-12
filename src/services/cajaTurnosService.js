import { supabase } from "./supabaseClient";

export async function getTurnoCajaActivo() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("caja_turnos")
    .select("id, abierto_por, saldo_inicial, saldo_sistema, estado, fecha_apertura")
    .eq("abierto_por", user.id)
    .eq("estado", "abierta")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function abrirTurnoCaja(saldoInicial) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("caja_turnos")
    .insert({
      abierto_por: user.id,
      saldo_inicial: Number(saldoInicial),
      saldo_sistema: Number(saldoInicial),
      estado: "abierta"
    })
    .select("id, abierto_por, saldo_inicial, saldo_sistema, estado, fecha_apertura")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function sumarPagoATurno(turnoId, saldoActual, monto) {
  const nuevoSaldo = Number(saldoActual ?? 0) + Number(monto ?? 0);

  const { data, error } = await supabase
    .from("caja_turnos")
    .update({ saldo_sistema: nuevoSaldo })
    .eq("id", turnoId)
    .select("id, abierto_por, saldo_inicial, saldo_sistema, estado, fecha_apertura")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function cerrarTurnoCaja(turnoId, saldoCierre) {
  const { error } = await supabase
    .from("caja_turnos")
    .update({
      estado: "cerrada",
      saldo_cierre: Number(saldoCierre),
      fecha_cierre: new Date().toISOString()
    })
    .eq("id", turnoId);

  if (error) {
    throw error;
  }
}

async function getCurrentUser() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error("No hay un usuario autenticado.");
  }

  return user;
}
