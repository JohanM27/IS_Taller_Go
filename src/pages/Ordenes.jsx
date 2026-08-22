export function Ordenes({ orders: loadedOrders }) {
  const groupedOrders = {
    Pendiente: loadedOrders.filter((order) => order.estado === "Pendiente"),
    "En proceso": loadedOrders.filter((order) => order.estado === "En proceso"),
    Finalizada: loadedOrders.filter((order) => order.estado === "Finalizada"),
    Entregada: loadedOrders.filter((order) => order.estado === "Entregada")
  };

  return (
    <div className="page-stack">
      <section className="hero-band">
        <div>
          <span className="section-label">Servicio</span>
          <h2>Seguimiento de ordenes</h2>
        </div>
        <button className="primary-action compact" type="button">
          Crear orden
        </button>
      </section>

      <section className="panel">
        <div className="kanban">
          {Object.entries(groupedOrders).map(([title, items]) => (
            <Lane key={title} title={title} items={items} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Lane({ title, items }) {
  return (
    <div className="lane">
      <div className="lane-heading">
        <h3>{title}</h3>
        <span>{items.length}</span>
      </div>
      {items.length ? (
        items.map((order) => (
          <article className="order-card" key={order.codigo}>
            <strong>{order.codigo}</strong>
            <span>{order.cliente}</span>
            <small>{order.vehiculo}</small>
          </article>
        ))
      ) : (
        <p className="empty-lane">Sin ordenes</p>
      )}
    </div>
  );
}
