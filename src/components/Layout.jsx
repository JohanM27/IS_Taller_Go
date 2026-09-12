import { Brand } from "./Brand";
import { isSupabaseConfigured, supabase } from "../services/supabaseClient";

const roleViews = {
  administrador: [
    { id: "dashboard", label: "Dashboard", title: "Dashboard", marker: "D" },
    { id: "ordenes", label: "Órdenes", title: "Órdenes de trabajo", marker: "O" },
    { id: "clientes", label: "Clientes", title: "Clientes", marker: "C" },
    { id: "vehiculos", label: "Vehículos", title: "Vehículos", marker: "V" },
    { id: "inventario", label: "Inventario", title: "Inventario", marker: "I" },
    { id: "servicios", label: "Servicios", title: "Servicios", marker: "S" }
  ],
  recepcion_caja: [
    { id: "inicio", label: "Inicio", title: "Dashboard", marker: "I" },
    { id: "ordenes", label: "Recepción / Órdenes", title: "Órdenes de trabajo", marker: "O" },
    { id: "caja", label: "Caja / Cobros", title: "Caja y Cobros", marker: "$" },
    { id: "clientes", label: "Clientes", title: "Clientes", marker: "C" },
    { id: "vehiculos", label: "Vehículos", title: "Vehículos", marker: "V" }
  ]
};

export function getViewTitle(activeView, role = "administrador") {
  return getAvailableViews(role).find((view) => view.id === activeView)?.title ?? "TallerGo";
}

export function getAvailableViews(role) {
  return roleViews[role] ?? roleViews.recepcion_caja;
}

export function Layout({
  activeView,
  canSwitchRole,
  children,
  onRoleChange,
  onViewChange,
  profile,
  profileError,
  profileLoading,
  role
}) {
  const availableViews = getAvailableViews(role);

  return (
    <div className="app-layout">
      <header className="top-navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <Brand />
          </div>
          
          <div className="navbar-actions">
            {canSwitchRole ? (
              <label className="role-switcher">
                <span>Modo:</span>
                <select value={role} onChange={(event) => onRoleChange(event.target.value)}>
                  <option value="administrador">Administrador</option>
                  <option value="recepcion_caja">Caja/Recepción</option>
                </select>
              </label>
            ) : (
              <div className="user-profile">
                <span>{profileLoading ? "..." : getRoleLabel(role)}</span>
                <strong>{profile?.nombre || profileError || "Usuario autenticado"}</strong>
              </div>
            )}
            {isSupabaseConfigured && (
              <button className="ghost-action" onClick={() => supabase.auth.signOut()} type="button">
                Salir
              </button>
            )}
          </div>
        </div>
      </header>

      <nav className="tab-navigation">
        <div className="navbar-container tab-scroll">
          {availableViews.map((view) => (
            <button
              className={`tab-item ${activeView === view.id ? "active" : ""}`}
              key={view.id}
              onClick={() => onViewChange(view.id)}
              type="button"
            >
              {view.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="main-content">
        <div className="content-container">
          <header className="page-header">
            <p className="eyebrow">TallerGo</p>
            <h1>{getViewTitle(activeView, role)}</h1>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}

function getRoleLabel(role) {
  return role === "administrador" ? "Administrador/Dueño" : "Recepción/Caja";
}
