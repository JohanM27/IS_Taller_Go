export function Inventario() {
  const items = [
    ["Filtro de aceite", "REP-001", 3, 5],
    ["Pastillas de freno", "REP-002", 2, 4],
    ["Bujias", "REP-003", 6, 8]
  ];

  return (
    <div className="page-stack">
      <section className="hero-band">
        <div>
          <span className="section-label">Almacén</span>
          <h2>Inventario critico</h2>
        </div>
        <div className="hero-meta warning">
          <span>Stock bajo</span>
          <strong>{items.length} repuestos</strong>
        </div>
      </section>

      <section className="inventory-grid">
        {items.map(([name, code, stock, minimum]) => (
          <article className="inventory-card" key={code}>
            <div>
              <span>{code}</span>
              <strong>{name}</strong>
            </div>
            <div className="stock-meter">
              <span style={{ width: `${Math.min(100, (stock / minimum) * 100)}%` }} />
            </div>
            <p>{stock} disponibles / mínimo {minimum}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
