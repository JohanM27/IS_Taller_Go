import { Brand } from "./Brand";
import { isSupabaseConfigured, supabase } from "../services/supabaseClient";

const roleViews = {
  administrador: [
    { id: "dashboard", label: "Dashboard", title: "Dashboard", marker: "D" },
    { id: "ordenes", label: "Órdenes de trabajo", title: "Órdenes de trabajo", marker: "O" },
    { id: "clientes", label: "Clientes", title: "Clientes", marker: "C" },
    { id: "vehiculos", label: "Vehículos", title: "Vehículos", marker: "V" },
    { id: "inventario", label: "Inventario", title: "Inventario", marker: "I" },
    { id: "ventas", label: "Ventas / Facturación", title: "Ventas / Facturación", marker: "$" },
    { id: "cuentas", label: "Cuentas por cobrar", title: "Cuentas por cobrar", marker: "Q" },
    { id: "reportes", label: "Reportes", title: "Reportes", marker: "R" },
    { id: "usuarios", label: "Usuarios", title: "Usuarios", marker: "U" },
    { id: "configuracion", label: "Configuración", title: "Configuración", marker: "A" }
  ],
  recepcion_caja: [
    { id: "inicio", label: "Inicio", title: "Inicio", marker: "I" },
    { id: "clientes", label: "Clientes", title: "Clientes", marker: "C" },
    { id: "vehiculos", label: "Vehículos", title: "Vehículos", marker: "V" },
    { id: "recepcion", label: "Recepción", title: "Recepción", marker: "E" },
    { id: "ordenes", label: "Órdenes de trabajo", title: "Órdenes de trabajo", marker: "O" },
    { id: "cotizaciones", label: "Cotizaciones", title: "Cotizaciones", marker: "T" },
    { id: "caja", label: "Caja / Cobros", title: "Caja / Cobros", marker: "$" },
    { id: "facturas", label: "Facturas", title: "Facturas", marker: "F" },
    { id: "cuentas", label: "Cuentas pendientes", title: "Cuentas pendientes", marker: "Q" },
    { id: "historial", label: "Historial", title: "Historial", marker: "H" }
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
    <>
      <aside className="sidebar">
        <div>
          <Brand />
          <p className="sidebar-kicker">Operación interna</p>
        </div>
        <nav className="nav" aria-label="Módulos">
          {availableViews.map((view) => (
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
          {canSwitchRole ? (
            <label>
              Rol activo
              <select value={role} onChange={(event) => onRoleChange(event.target.value)}>
                <option value="administrador">Administrador/Dueño</option>
                <option value="recepcion_caja">Recepción/Caja</option>
              </select>
            </label>
          ) : (
            <div className="role-summary">
              <span>Rol detectado</span>
              <strong>{profileLoading ? "Cargando..." : getRoleLabel(role)}</strong>
              <small>{profile?.nombre || profileError || "Usuario autenticado"}</small>
            </div>
          )}
        </div>
      </aside>

      <main className="shell">
        <header className="topbar">
          <div className="topbar-title">
            <p className="eyebrow">TallerGo</p>
            <h1>{getViewTitle(activeView, role)}</h1>
          </div>
          <div className="topbar-actions">
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

function getRoleLabel(role) {
  return role === "administrador" ? "Administrador/Dueño" : "Recepción/Caja";
}
