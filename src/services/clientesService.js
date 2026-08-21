import { supabase } from "./supabaseClient";

export async function getClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("id, identidad, nombre, telefono, correo, direccion, activo, creado_en")
    .eq("activo", true)
    .order("creado_en", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function createCliente(cliente) {
  const { error } = await supabase.from("clientes").insert(cliente);

  if (error) {
    throw error;
  }
}
