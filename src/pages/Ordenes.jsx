export function Ordenes({ orders: loadedOrders }) {
  const groupedOrders = {
    Pendiente: loadedOrders.filter((order) => order.estado === "Pendiente"),
    "En proceso": loadedOrders.filter((order) => order.estado === "En proceso"),
    Finalizada: loadedOrders.filter((order) => order.estado === "Finalizada"),
    Entregada: loadedOrders.filter((order) => order.estado === "Entregada")
  };

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Gestion de ordenes</h2>
        <button className="primary-action compact" type="button">
          Crear orden
        </button>
      </div>
      <div className="kanban">
        {Object.entries(groupedOrders).map(([title, items]) => (
          <Lane
            key={title}
            title={title}
            items={items.length ? items.map((order) => `${order.codigo} - ${order.cliente}`) : ["Sin ordenes"]}
          />
        ))}
      </div>
    </section>
  );
}

function Lane({ title, items }) {
  return (
    <div className="lane">
      <h3>{title}</h3>
      {items.map((item) => (
        <p key={item}>{item}</p>
      ))}
    </div>
  );
}
