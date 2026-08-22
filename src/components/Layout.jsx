import { Brand } from "./Brand";
import { isSupabaseConfigured, supabase } from "../services/supabaseClient";

const views = [
  { id: "dashboard", label: "Dashboard", title: "Dashboard operativo", marker: "D" },
  { id: "ordenes", label: "Ordenes", title: "Ordenes de trabajo", marker: "O" },
  { id: "clientes", label: "Clientes", title: "Clientes y vehículos", marker: "C" },
  { id: "inventario", label: "Inventario", title: "Inventario", marker: "I" }
];

export function getViewTitle(activeView) {
  return views.find((view) => view.id === activeView)?.title ?? "TallerGo";
}

export function Layout({ activeView, onViewChange, children }) {
  return (
    <>
      <aside className="sidebar">
        <div>
          <Brand />
          <p className="sidebar-kicker">Operación interna</p>
        </div>
        <nav className="nav" aria-label="Modulos">
          {views.map((view) => (
            <button
              className={`nav-item ${activeView === view.id ? "active" : ""}`}
              key={view.id}
              onClick={() => onViewChange(view.id)}
              type="button"
            >
              <span className="nav-marker">{view.marker}</span>
              <span>{view.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>Rol activo</span>
          <strong>Administrador</strong>
        </div>
      </aside>

      <main className="shell">
        <header className="topbar">
          <div className="topbar-title">
            <p className="eyebrow">TallerGo</p>
            <h1>{getViewTitle(activeView)}</h1>
          </div>
          <div className="topbar-actions">
            <button className="primary-action" type="button">
              Nueva orden
            </button>
            {isSupabaseConfigured && (
              <button className="ghost-action" onClick={() => supabase.auth.signOut()} type="button">
                Salir
              </button>
            )}
          </div>
        </header>

        {children}
      </main>
    </>
  );
}
