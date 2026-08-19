import React, { useState } from "react";
import { createRoot } from "react-dom/client";
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
  const currentView = views.find((view) => view.id === activeView);

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
        </header>

        {activeView === "dashboard" && <Dashboard />}
        {activeView === "ordenes" && <Ordenes />}
        {activeView === "clientes" && <Clientes />}
        {activeView === "inventario" && <Inventario />}
      </main>
    </>
  );
}

function Dashboard() {
  return (
    <section>
      <div className="metrics">
        <Metric label="Ordenes activas" value="18" detail="6 en proceso" />
        <Metric label="Clientes registrados" value="124" detail="9 nuevos este mes" />
        <Metric label="Ingresos estimados" value="L 42,850" detail="Periodo actual" />
        <Metric label="Stock bajo" value="7" detail="Repuestos por revisar" alert />
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
                {orders.map((order) => (
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

function Ordenes() {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Gestion de ordenes</h2>
        <button className="primary-action compact" type="button">
          Crear orden
        </button>
      </div>
      <div className="kanban">
        <Lane title="Pendiente" items={["Revision de frenos - P-4812", "Cambio de aceite - P-4901"]} />
        <Lane title="En proceso" items={["Diagnostico electrico - P-4877", "Alineacion - P-4883"]} />
        <Lane title="Finalizada" items={["Servicio menor - P-4860"]} />
        <Lane title="Entregada" items={["Cambio de bateria - P-4822"]} />
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
