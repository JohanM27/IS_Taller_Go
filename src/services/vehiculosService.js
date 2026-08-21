import { supabase } from "./supabaseClient";

export async function getVehiculos() {
  const { data, error } = await supabase
    .from("vehiculos")
    .select("id, cliente_id, placa, marca, modelo, anio, color, kilometraje, activo, clientes(nombre)")
    .eq("activo", true)
    .order("creado_en", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function createVehiculo(vehiculo) {
  const { error } = await supabase.from("vehiculos").insert(vehiculo);

  if (error) {
    throw error;
  }
}
