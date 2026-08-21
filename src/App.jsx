import { useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { demoOrders } from "./data/demoData";
import { Dashboard } from "./pages/Dashboard";
import { Clientes } from "./pages/Clientes";
import { Inventario } from "./pages/Inventario";
import { Login } from "./pages/Login";
import { Ordenes } from "./pages/Ordenes";
import { getDashboardData } from "./services/dashboardService";
import { isSupabaseConfigured, supabase } from "./services/supabaseClient";

export function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [session, setSession] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    orders: demoOrders,
    clientesCount: 124,
    stockBajoCount: 7,
    loading: false,
    error: ""
  });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !session) {
      return;
    }

    async function loadDashboardData() {
      setDashboardData((current) => ({ ...current, loading: true, error: "" }));

      try {
        const data = await getDashboardData();
        setDashboardData({ ...data, loading: false, error: "" });
      } catch {
        setDashboardData((current) => ({
          ...current,
          loading: false,
          error: "No se pudieron cargar datos de Supabase. Revisa tus variables .env y politicas RLS."
        }));
      }
    }

    loadDashboardData();
  }, [session]);

  if (isSupabaseConfigured && !session) {
    return <Login />;
  }

  return (
    <Layout activeView={activeView} onViewChange={setActiveView}>
      {activeView === "dashboard" && <Dashboard data={dashboardData} />}
      {activeView === "ordenes" && <Ordenes orders={dashboardData.orders} />}
      {activeView === "clientes" && <Clientes />}
      {activeView === "inventario" && <Inventario />}
    </Layout>
  );
}
