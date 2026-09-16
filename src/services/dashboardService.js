import { supabase } from "./supabaseClient";
import { getOrdenes } from "./ordenesService";
import { readAll } from "./readAll";
import { getPerfilActual } from "./perfilesService";

export async function getDashboardData() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("No hay una sesión activa.");
  const profile = await getPerfilActual(user.id);
  const isAdmin = profile.activo && profile.rol === "administrador";
  const [orders, payments, clientesResponse, stockResponse, productDetails] = await Promise.all([
    getOrdenes(),
    isAdmin ? readAll(() => supabase.from("pagos")
      .select("id,orden_id,monto,metodo,pagado_en")
      .order("pagado_en", { ascending: false }).order("id")) : [],
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    supabase.from("repuestos_stock_bajo").select("id", { count: "exact", head: true }),
    isAdmin ? readAll(() => supabase.from("detalle_repuestos")
      .select("id,orden_id,repuesto_id,cantidad,precio_unitario,repuestos(codigo,nombre)")
      .order("id")) : []
  ]);
  const error = clientesResponse.error || stockResponse.error;
  if (error) throw error;
  return { orders, payments, productDetails, clientesCount: clientesResponse.count ?? 0, stockBajoCount: stockResponse.count ?? 0 };
}
