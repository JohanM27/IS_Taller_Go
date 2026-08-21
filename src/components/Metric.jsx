export function Metric({ label, value, detail, alert = false }) {
  return (
    <article className={`metric ${alert ? "alert" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
