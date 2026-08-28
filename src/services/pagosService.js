import { supabase } from "./supabaseClient";

export async function createPago(pago) {
  const { error } = await supabase.from("pagos").insert(pago);

  if (error) {
    throw error;
  }
}
