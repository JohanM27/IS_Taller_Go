export function Brand({ variant = "default" }) {
  return (
    <div className={`brand ${variant === "login" ? "login-brand" : ""}`}>
      <span className="brand-mark">TG</span>
      <div>
        <strong>TallerGo</strong>
        <small>{variant === "login" ? "Acceso del sistema" : "Gestion de taller"}</small>
      </div>
    </div>
  );
}
