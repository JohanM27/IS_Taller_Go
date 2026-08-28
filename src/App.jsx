import { useEffect, useState } from "react";
import { getAvailableViews, Layout } from "./components/Layout";
import { demoOrders } from "./data/demoData";
import { Caja } from "./pages/Caja";
import { Dashboard } from "./pages/Dashboard";
import { Clientes } from "./pages/Clientes";
import { Inventario } from "./pages/Inventario";
import { Login } from "./pages/Login";
import { ModulePage } from "./pages/ModulePage";
import { Ordenes } from "./pages/Ordenes";
import { Vehiculos } from "./pages/Vehiculos";
import { getDashboardData } from "./services/dashboardService";
import { getPerfilActual } from "./services/perfilesService";
import { isSupabaseConfigured, supabase } from "./services/supabaseClient";

export function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [role, setRole] = useState("administrador");
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
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

      if (!currentSession) {
        setProfile(null);
        setProfileError("");
        setRole("administrador");
        setActiveView("dashboard");
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
    dashboard: <Dashboard data={dashboardData} />,
    inicio: <Dashboard data={dashboardData} />,
    caja: <Caja onPaymentsChanged={loadDashboardData} />,
    ordenes: <Ordenes orders={dashboardData.orders} onOrdersChanged={loadDashboardData} />,
    clientes: <Clientes />,
    vehiculos: <Vehiculos />,
    inventario: <Inventario onInventoryChanged={loadDashboardData} />,
    ventas: <AdminVentas data={dashboardData} />,
    cuentas: <Cuentas data={dashboardData} role={role} />,
    reportes: <Reportes data={dashboardData} />,
    usuarios: <Usuarios />,
    configuracion: <Configuracion />,
    recepcion: <Recepcion />,
    cotizaciones: <Cotizaciones />,
    facturas: <Facturas data={dashboardData} />,
    historial: <Historial />
  };

  return views[activeView] ?? views.dashboard;
}

function mapDatabaseRoleToViewRole(databaseRole) {
  return databaseRole === "administrador" ? "administrador" : "recepcion_caja";
}

function AdminVentas({ data }) {
  const facturadas = data.orders.filter((order) => ["Facturada", "Entregada"].includes(order.estado));

  return (
    <ModulePage
      eyebrow="Ventas"
      metrics={[
        { label: "Facturadas", value: data.loading ? "..." : facturadas.length, detail: "Órdenes cerradas" },
        { label: "Ingresos", value: data.loading ? "..." : "Según caja", detail: "Pagos registrados" },
        { label: "Filtros", value: "Fecha", detail: "Cliente y vehículo" },
        { label: "Estado", value: "Activo", detail: "Control administrativo" }
      ]}
      rows={facturadas.map((order) => ({
        detail: `${order.cliente} - ${order.vehiculo}`,
        status: order.total,
        title: order.codigo,
        tone: "done"
      }))}
      title="Ventas y facturación"
    />
  );
}

function Cuentas({ data, role }) {
  const pendingOrders = data.orders.filter((order) => Number(order.saldoPendienteRaw ?? 0) > 0);
  const totalPending = pendingOrders.reduce((sum, order) => sum + Number(order.saldoPendienteRaw ?? 0), 0);

  return (
    <ModulePage
      eyebrow={role === "administrador" ? "Cuentas por cobrar" : "Cuentas pendientes"}
      metrics={[
        { label: "Pendientes", value: data.loading ? "..." : pendingOrders.length, detail: "Órdenes con saldo", alert: true },
        { label: "Por cobrar", value: data.loading ? "..." : new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }).format(totalPending), detail: "Saldo acumulado" },
        { label: "Abonos", value: "Caja", detail: "Registro de pagos" },
        { label: "Seguimiento", value: "Activo", detail: "Cliente y vehículo" }
      ]}
      rows={pendingOrders.map((order) => ({
        detail: `${order.cliente} - ${order.vehiculo}`,
        status: order.saldoPendiente,
        title: order.codigo,
        tone: "warn"
      }))}
      title="Control de saldos y abonos"
    />
  );
}

function Reportes({ data }) {
  return (
    <ModulePage
      eyebrow="Reportes"
      metrics={[
        { label: "Órdenes", value: data.loading ? "..." : data.orders.length, detail: "Trabajos consultados" },
        { label: "Clientes", value: data.loading ? "..." : data.clientesCount, detail: "Base registrada" },
        { label: "Inventario", value: data.loading ? "..." : data.stockBajoCount, detail: "Alertas activas", alert: true },
        { label: "Exportación", value: "PDF", detail: "Preparado para informe" }
      ]}
      rows={[
        { title: "Ingresos por período", detail: "Consulta para administración y cierre diario.", status: "Disponible" },
        { title: "Servicios realizados", detail: "Resumen de mano de obra por orden.", status: "Disponible" },
        { title: "Repuestos utilizados", detail: "Control de consumo desde inventario.", status: "Disponible" },
        { title: "Cuentas pendientes", detail: "Saldos y abonos por cliente.", status: "Disponible", tone: "warn" }
      ]}
      title="Indicadores administrativos"
    />
  );
}

function Usuarios() {
  return (
    <ModulePage
      eyebrow="Seguridad"
      metrics={[
        { label: "Roles", value: "2", detail: "Administrador y Recepción/Caja" },
        { label: "Acceso", value: "RLS", detail: "Controlado por Supabase" },
        { label: "Estado", value: "Activo", detail: "Usuarios internos" },
        { label: "Auditoría", value: "Base", detail: "Perfiles por usuario" }
      ]}
      rows={[
        { title: "Administrador/Dueño", detail: "Control total del sistema y configuración.", status: "Activo" },
        { title: "Recepción/Caja", detail: "Registro operativo, órdenes, cobros y consultas.", status: "Activo" }
      ]}
      title="Administración de usuarios"
    />
  );
}

function Configuracion() {
  return (
    <ModulePage
      eyebrow="Configuración"
      metrics={[
        { label: "Taller", value: "TallerGo", detail: "Información general" },
        { label: "Facturación", value: "Lista", detail: "Datos fiscales" },
        { label: "Impuestos", value: "Config.", detail: "Parámetros editables" },
        { label: "Marca", value: "Activa", detail: "Logo y contacto" }
      ]}
      rows={[
        { title: "Información del taller", detail: "Nombre, teléfono, dirección y correo.", status: "Base" },
        { title: "Datos de facturación", detail: "Numeración, impuestos y formato de factura.", status: "Base" },
        { title: "Preferencias del sistema", detail: "Parámetros operativos y estados.", status: "Base" }
      ]}
      title="Parámetros del taller"
    />
  );
}

function Recepcion() {
  return (
    <ModulePage
      eyebrow="Recepción"
      metrics={[
        { label: "Entrada", value: "Orden", detail: "Vehículo recibido" },
        { label: "Motivo", value: "Activo", detail: "Problema reportado" },
        { label: "Kilometraje", value: "Control", detail: "Dato de recepción" },
        { label: "Estado", value: "Pendiente", detail: "Flujo inicial" }
      ]}
      rows={[
        { title: "Registrar entrada", detail: "Cliente, vehículo, kilometraje y observaciones.", status: "Órdenes" },
        { title: "Crear orden", detail: "La recepción genera la orden de trabajo.", status: "Activo" },
        { title: "Seguimiento", detail: "Cambio de estado hasta terminar el trabajo.", status: "Activo" }
      ]}
      title="Entrada de vehículos"
    />
  );
}

function Cotizaciones() {
  return (
    <ModulePage
      eyebrow="Cotizaciones"
      metrics={[
        { label: "Servicios", value: "Catálogo", detail: "Mano de obra" },
        { label: "Repuestos", value: "Inventario", detail: "Precios disponibles" },
        { label: "Total", value: "Calculado", detail: "Servicios y repuestos" },
        { label: "Estado", value: "Borrador", detail: "Previo a orden" }
      ]}
      rows={[
        { title: "Cotización por cliente", detail: "Servicios, repuestos y observaciones.", status: "Base" },
        { title: "Conversión a orden", detail: "Aprobación del cliente para iniciar trabajo.", status: "Siguiente" }
      ]}
      title="Preparación de cotizaciones"
    />
  );
}

function Facturas({ data }) {
  const closedOrders = data.orders.filter((order) => ["Facturada", "Entregada"].includes(order.estado));

  return (
    <ModulePage
      eyebrow="Facturas"
      metrics={[
        { label: "Emitidas", value: data.loading ? "..." : closedOrders.length, detail: "Órdenes facturadas" },
        { label: "Impresión", value: "Lista", detail: "Formato de factura" },
        { label: "Cobro", value: "Caja", detail: "Método de pago" },
        { label: "Consulta", value: "Activa", detail: "Cliente o vehículo" }
      ]}
      rows={closedOrders.map((order) => ({
        detail: `${order.cliente} - ${order.vehiculo}`,
        status: order.total,
        title: order.codigo,
        tone: "done"
      }))}
      title="Facturas emitidas"
    />
  );
}

function Historial() {
  return (
    <ModulePage
      eyebrow="Historial"
      metrics={[
        { label: "Búsqueda", value: "Cliente", detail: "Nombre o teléfono" },
        { label: "Vehículo", value: "Placa", detail: "Historial por unidad" },
        { label: "Órdenes", value: "Todas", detail: "Trabajos anteriores" },
        { label: "Detalle", value: "Completo", detail: "Servicios y repuestos" }
      ]}
      rows={[
        { title: "Historial por cliente", detail: "Órdenes, pagos y vehículos asociados.", status: "Consulta" },
        { title: "Historial por vehículo", detail: "Reparaciones anteriores por placa.", status: "Consulta" }
      ]}
      title="Consulta histórica"
    />
  );
}
