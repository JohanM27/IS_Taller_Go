import { Brand } from "./Brand";
import { isSupabaseConfigured, supabase } from "../services/supabaseClient";

const views = [
  { id: "dashboard", label: "Dashboard", title: "Dashboard operativo" },
  { id: "ordenes", label: "Ordenes", title: "Ordenes de trabajo" },
  { id: "clientes", label: "Clientes", title: "Clientes y vehiculos" },
  { id: "inventario", label: "Inventario", title: "Inventario" }
];

export function getViewTitle(activeView) {
  return views.find((view) => view.id === activeView)?.title ?? "TallerGo";
}

export function Layout({ activeView, onViewChange, children }) {
  return (
    <>
      <aside className="sidebar">
        <Brand />
        <nav className="nav" aria-label="Modulos">
          {views.map((view) => (
            <button
              className={`nav-item ${activeView === view.id ? "active" : ""}`}
              key={view.id}
              onClick={() => onViewChange(view.id)}
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
            <h1>{getViewTitle(activeView)}</h1>
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

        {children}
      </main>
    </>
  );
}
