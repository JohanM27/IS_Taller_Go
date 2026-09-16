import { useEffect, useState } from "react";
import { getAvailableViews, Layout } from "./components/Layout";
import { Caja } from "./pages/Caja";
import { Dashboard } from "./pages/Dashboard";
import { Clientes } from "./pages/Clientes";
import { Inventario } from "./pages/Inventario";
import { Login } from "./pages/Login";
import { Servicios } from "./pages/Servicios";
import { Ordenes } from "./pages/Ordenes";
import { Vehiculos } from "./pages/Vehiculos";
import { getDashboardData } from "./services/dashboardService";
import { getPerfilActual } from "./services/perfilesService";
import { isSupabaseConfigured, supabase } from "./services/supabaseClient";

export function App() {
  const [activeView, setActiveView] = useState("inicio");
  const [role, setRole] = useState("recepcion_caja");
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [session, setSession] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    orders: [],
    clientesCount: 0,
    stockBajoCount: 0,
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

      if (!currentSession) {
        setProfile(null);
        setProfileError("");
        setRole("recepcion_caja");
        setActiveView("inicio");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

  useEffect(() => {
    if (!isSupabaseConfigured || !session) {
      return;
    }

    loadUserProfile(session.user.id);
    loadDashboardData();
  }, [session]);

  async function loadUserProfile(userId) {
    setProfileLoading(true);
    setProfileError("");

    try {
      const currentProfile = await getPerfilActual(userId);
      const nextRole = mapDatabaseRoleToViewRole(currentProfile.rol);

      setProfile(currentProfile);
      setRole(nextRole);
      ensureViewIsAvailable(nextRole);
    } catch (error) {
      setProfile(null);
      setRole("recepcion_caja");
      ensureViewIsAvailable("recepcion_caja");
      setProfileError(`No se pudo cargar el perfil del usuario: ${error.message}`);
    } finally {
      setProfileLoading(false);
    }
  }

  function handleRoleChange(nextRole) {
    if (isSupabaseConfigured) {
      return;
    }

    setRole(nextRole);
    ensureViewIsAvailable(nextRole);
  }

  function ensureViewIsAvailable(nextRole) {
    const availableViews = getAvailableViews(nextRole);
    setActiveView((currentView) =>
      availableViews.some((view) => view.id === currentView) ? currentView : availableViews[0]?.id ?? "dashboard"
    );
  }

  if (isSupabaseConfigured && !session) {
    return <Login />;
  }

  return (
    <Layout
      activeView={activeView}
      canSwitchRole={!isSupabaseConfigured}
      onRoleChange={handleRoleChange}
      onViewChange={setActiveView}
      profile={profile}
      profileError={profileError}
      profileLoading={profileLoading}
      role={role}
    >
      {renderActiveView(activeView, dashboardData, loadDashboardData, role)}
    </Layout>
  );
}

function renderActiveView(activeView, dashboardData, loadDashboardData, role) {
  const views = {
    dashboard: <Dashboard data={dashboardData} role={role} />,
    inicio: <Dashboard data={dashboardData} role={role} />,
    caja: <Caja onPaymentsChanged={loadDashboardData} />,
    ordenes: <Ordenes orders={dashboardData.orders} onOrdersChanged={loadDashboardData} role={role} />,
    clientes: <Clientes role={role} />,
    vehiculos: <Vehiculos role={role} />,
    inventario: <Inventario onInventoryChanged={loadDashboardData} />,
    servicios: <Servicios />
  };

  return views[activeView] ?? views.dashboard;
}

function mapDatabaseRoleToViewRole(databaseRole) {
  return databaseRole === "administrador" ? "administrador" : "recepcion_caja";
}
