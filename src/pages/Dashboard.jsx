import { Metric } from "../components/Metric";
import { Notice } from "../components/Notice";
import { sumOrderTotals } from "../utils/formatters";

export function Dashboard({ data }) {
  return (
    <section className="page-stack">
      {data.error && <Notice type="error">{data.error}</Notice>}

      <section className="hero-band">
        <div>
          <span className="section-label">Resumen del día</span>
          <h2>Administración y caja</h2>
        </div>
        <div className="hero-meta">
          <span>Recepción</span>
          <strong>{data.loading ? "..." : `${data.orders.length} órdenes`}</strong>
        </div>
      </section>

      <div className="metrics">
        <Metric label="Órdenes registradas" value={data.loading ? "..." : data.orders.length} detail="Trabajos creados" />
        <Metric label="Clientes registrados" value={data.loading ? "..." : data.clientesCount} detail="Base de clientes" />
        <Metric label="Ingresos estimados" value={data.loading ? "..." : sumOrderTotals(data.orders)} detail="Órdenes cargadas" />
        <Metric label="Stock bajo" value={data.loading ? "..." : data.stockBajoCount} detail="Repuestos por revisar" alert />
      </div>

      <div className="page-stack">
        <section className="panel">
          <div className="panel-heading">
            <h2>Órdenes recientes</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Vehículo</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => (
                  <tr key={order.codigo}>
                    <td>{order.codigo}</td>
                    <td>{order.cliente}</td>
                    <td>{order.vehiculo}</td>
                    <td>{order.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </section>
  );
}
