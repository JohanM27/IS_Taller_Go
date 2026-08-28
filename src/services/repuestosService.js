import { supabase } from "./supabaseClient";

export async function getRepuestos() {
  const { data, error } = await supabase
    .from("repuestos")
    .select("id, codigo, nombre, costo, precio_venta, stock, stock_minimo, activo, creado_en")
    .eq("activo", true)
    .order("creado_en", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function createRepuesto(repuesto) {
  const { error } = await supabase.from("repuestos").insert(repuesto);

  if (error) {
    throw error;
  }
}
