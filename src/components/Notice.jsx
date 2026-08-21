export function Notice({ children, type = "info" }) {
  return <div className={`notice ${type}`}>{children}</div>;
}
