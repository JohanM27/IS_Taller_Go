export function Inventario() {
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
