import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import "./styles.css";

const views = [
  { id: "dashboard", label: "Dashboard", title: "Dashboard operativo" },
  { id: "ordenes", label: "Ordenes", title: "Ordenes de trabajo" },
  { id: "clientes", label: "Clientes", title: "Clientes y vehiculos" },
  { id: "inventario", label: "Inventario", title: "Inventario" }
];

const orders = [
  {
    codigo: "OT-1048",
    cliente: "Carlos Mejia",
    vehiculo: "Toyota Corolla",
    estado: "En proceso",
    total: "L 3,850",
    tone: ""
  },
  {
    codigo: "OT-1047",
    cliente: "Andrea Lopez",
    vehiculo: "Honda Civic",
    estado: "Pendiente",
    total: "L 1,200",
    tone: "warn"
  },
  {
    codigo: "OT-1046",
    cliente: "Mario Reyes",
    vehiculo: "Ford Ranger",
    estado: "Finalizada",
    total: "L 5,400",
    tone: "done"
  },
  {
    codigo: "OT-1045",
    cliente: "Sofia Cruz",
    vehiculo: "Hyundai Tucson",
    estado: "Entregada",
    total: "L 2,950",
    tone: "done"
  }
];

function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [session, setSession] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    orders,
    clientesCount: 124,
    stockBajoCount: 7,
    loading: false,
    error: ""
  });
  const currentView = views.find((view) => view.id === activeView);

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

      const [ordenesResponse, clientesResponse, stockResponse] = await Promise.all([
        supabase
          .from("resumen_ordenes")
          .select("codigo,cliente,vehiculo,estado,total_orden")
          .order("fecha_ingreso", { ascending: false })
          .limit(8),
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase.from("repuestos_stock_bajo").select("id", { count: "exact", head: true })
      ]);

      const firstError = ordenesResponse.error || clientesResponse.error || stockResponse.error;

      if (firstError) {
        setDashboardData((current) => ({
          ...current,
          loading: false,
          error: "No se pudieron cargar datos de Supabase. Revisa tus variables .env y politicas RLS."
        }));
        return;
      }

      setDashboardData({
        orders: ordenesResponse.data.map((order) => ({
          codigo: order.codigo,
          cliente: order.cliente,
          vehiculo: order.vehiculo,
          estado: formatEstado(order.estado),
          total: formatCurrency(order.total_orden),
          tone: statusTone(order.estado)
        })),
        clientesCount: clientesResponse.count ?? 0,
        stockBajoCount: stockResponse.count ?? 0,
        loading: false,
        error: ""
      });
    }

    loadDashboardData();
  }, [session]);

  if (isSupabaseConfigured && !session) {
    return <Login />;
  }

  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">TG</span>
          <div>
            <strong>TallerGo</strong>
            <small>Gestion de taller</small>
          </div>
        </div>
        <nav className="nav" aria-label="Modulos">
          {views.map((view) => (
            <button
              className={`nav-item ${activeView === view.id ? "active" : ""}`}
              key={view.id}
              onClick={() => setActiveView(view.id)}
              type="button"
            >
              {view.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Avance funcional</p>
            <h1>{currentView.title}</h1>
          </div>
          <button className="primary-action" type="button">
            Nueva orden
          </button>
          {isSupabaseConfigured && (
            <button className="ghost-action" onClick={() => supabase.auth.signOut()} type="button">
              Salir
            </button>
          )}
        </header>

        {activeView === "dashboard" && <Dashboard data={dashboardData} />}
        {activeView === "ordenes" && <Ordenes orders={dashboardData.orders} />}
        {activeView === "clientes" && <Clientes />}
        {activeView === "inventario" && <Inventario />}
      </main>
    </>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (signInError) {
      setError(`No se pudo iniciar sesion: ${signInError.message}`);
    }

    setLoading(false);
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand login-brand">
          <span className="brand-mark">TG</span>
          <div>
            <strong>TallerGo</strong>
            <small>Acceso del sistema</small>
          </div>
        </div>
        <form className="form-preview" onSubmit={handleSubmit}>
          <label>
            Correo
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>
          <label>
            Contrasena
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          </label>
          {error && <div className="notice error">{error}</div>}
          <button className="primary-action" disabled={loading} type="submit">
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Dashboard({ data }) {
  const ordenesActivas = useMemo(
    () => data.orders.filter((order) => !["Finalizada", "Facturada", "Entregada"].includes(order.estado)).length,
    [data.orders]
  );

  return (
    <section>
      {!isSupabaseConfigured && (
        <div className="notice">
          Datos de ejemplo activos. Configura `.env` para conectar Supabase.
        </div>
      )}
      {data.error && <div className="notice error">{data.error}</div>}
      <div className="metrics">
        <Metric label="Ordenes activas" value={data.loading ? "..." : ordenesActivas} detail="Pendientes o en proceso" />
        <Metric label="Clientes registrados" value={data.loading ? "..." : data.clientesCount} detail="Base de clientes" />
        <Metric label="Ingresos estimados" value={data.loading ? "..." : sumOrderTotals(data.orders)} detail="Ordenes cargadas" />
        <Metric label="Stock bajo" value={data.loading ? "..." : data.stockBajoCount} detail="Repuestos por revisar" alert />
      </div>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Ordenes recientes</h2>
            <button className="ghost-action" type="button">
              Ver todas
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Cliente</th>
                  <th>Vehiculo</th>
                  <th>Estado</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => (
                  <tr key={order.codigo}>
                    <td>{order.codigo}</td>
                    <td>{order.cliente}</td>
                    <td>{order.vehiculo}</td>
                    <td>
                      <span className={`status ${order.tone}`}>{order.estado}</span>
                    </td>
                    <td>{order.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>Flujo de atencion</h2>
          </div>
          <ol className="timeline">
            <li>
              <strong>Recepcion</strong>
              <span>Cliente y vehiculo registrados.</span>
            </li>
            <li>
              <strong>Diagnostico</strong>
              <span>Orden creada con problema reportado.</span>
            </li>
            <li>
              <strong>Servicio</strong>
              <span>Mano de obra y repuestos asociados.</span>
            </li>
            <li>
              <strong>Entrega</strong>
              <span>Pago registrado y orden cerrada.</span>
            </li>
          </ol>
        </section>
      </div>
    </section>
  );
}

function Metric({ label, value, detail, alert = false }) {
  return (
    <article className={`metric ${alert ? "alert" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function Ordenes({ orders: loadedOrders }) {
  const groupedOrders = {
    Pendiente: loadedOrders.filter((order) => order.estado === "Pendiente"),
    "En proceso": loadedOrders.filter((order) => order.estado === "En proceso"),
    Finalizada: loadedOrders.filter((order) => order.estado === "Finalizada"),
    Entregada: loadedOrders.filter((order) => order.estado === "Entregada")
  };

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Gestion de ordenes</h2>
        <button className="primary-action compact" type="button">
          Crear orden
        </button>
      </div>
      <div className="kanban">
        {Object.entries(groupedOrders).map(([title, items]) => (
          <Lane
            key={title}
            title={title}
            items={items.length ? items.map((order) => `${order.codigo} - ${order.cliente}`) : ["Sin ordenes"]}
          />
        ))}
      </div>
    </section>
  );
}

function Lane({ title, items }) {
  return (
    <div className="lane">
      <h3>{title}</h3>
      {items.map((item) => (
        <p key={item}>{item}</p>
      ))}
    </div>
  );
}

function Clientes() {
  return (
    <section className="panel split">
      <div>
        <h2>Ficha rapida de cliente</h2>
        <p className="muted">
          La primera version debe permitir buscar clientes, ver vehiculos asociados y consultar
          su historial de ordenes.
        </p>
      </div>
      <form className="form-preview">
        <label>
          Nombre
          <input defaultValue="Carlos Mejia" />
        </label>
        <label>
          Telefono
          <input defaultValue="9988-1122" />
        </label>
        <label>
          Vehiculo
          <input defaultValue="Toyota Corolla 2017" />
        </label>
        <button className="primary-action" type="button">
          Guardar cliente
        </button>
      </form>
    </section>
  );
}

function Inventario() {
  const items = [
    ["Filtro de aceite", "Stock: 3 / minimo: 5"],
    ["Pastillas de freno", "Stock: 2 / minimo: 4"],
    ["Bujias", "Stock: 6 / minimo: 8"]
  ];

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Inventario critico</h2>
      </div>
      <div className="inventory-list">
        {items.map(([name, stock]) => (
          <article key={name}>
            <strong>{name}</strong>
            <span>{stock}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

function formatEstado(estado) {
  const labels = {
    pendiente: "Pendiente",
    en_proceso: "En proceso",
    finalizada: "Finalizada",
    facturada: "Facturada",
    entregada: "Entregada"
  };

  return labels[estado] ?? estado;
}

function statusTone(estado) {
  if (["finalizada", "facturada", "entregada"].includes(estado)) {
    return "done";
  }

  if (estado === "pendiente") {
    return "warn";
  }

  return "";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    maximumFractionDigits: 2
  }).format(Number(value ?? 0));
}

function sumOrderTotals(loadedOrders) {
  const total = loadedOrders.reduce((sum, order) => {
    const numericValue = Number(String(order.total).replace(/[^\d.-]/g, ""));
    return sum + (Number.isNaN(numericValue) ? 0 : numericValue);
  }, 0);

  return formatCurrency(total);
}
