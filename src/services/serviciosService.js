import { supabase } from "./supabaseClient";

export async function getServicios() {
  const { data, error } = await supabase
    .from("servicios")
    .select("id, nombre, descripcion, precio, activo, creado_en")
    .eq("activo", true)
    .order("creado_en", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function createServicio(servicio) {
  const { error } = await supabase.from("servicios").insert(servicio);

  if (error) {
    throw error;
  }
}
