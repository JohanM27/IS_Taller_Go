import { supabase } from "./supabaseClient";

export async function getPerfilActual(userId) {
  const { data, error } = await supabase
    .from("perfiles")
    .select("id, nombre, rol, activo")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}
