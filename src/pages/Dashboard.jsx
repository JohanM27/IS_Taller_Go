import { useMemo } from "react";
import { Metric } from "../components/Metric";
import { Notice } from "../components/Notice";
import { isSupabaseConfigured } from "../services/supabaseClient";
import { sumOrderTotals } from "../utils/formatters";

export function Dashboard({ data }) {
  const ordenesActivas = useMemo(
    () => data.orders.filter((order) => !["Finalizada", "Facturada", "Entregada"].includes(order.estado)).length,
    [data.orders]
  );

  return (
    <section>
      {!isSupabaseConfigured && <Notice>Datos de ejemplo activos. Configura `.env` para conectar Supabase.</Notice>}
      {data.error && <Notice type="error">{data.error}</Notice>}
      <div className="metrics">
        <Metric label="Ordenes activas" value={data.loading ? "..." : ordenesActivas} detail="Pendientes o en proceso" />
        <Metric label="Clientes registrados" value={data.loading ? "..." : data.clientesCount} detail="Base de clientes" />
        <Metric label="Ingresos estimados" value={data.loading ? "..." : sumOrderTotals(data.orders)} detail="Ordenes cargadas" />
        <Metric label="Stock bajo" value={data.loading ? "..." : data.stockBajoCount} detail="Repuestos por revisar" alert />
      </div>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Ordenes recientes</h2>
            <button className="ghost-action" type="button">
              Ver todas
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Cliente</th>
                  <th>Vehiculo</th>
                  <th>Estado</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => (
                  <tr key={order.codigo}>
                    <td>{order.codigo}</td>
                    <td>{order.cliente}</td>
                    <td>{order.vehiculo}</td>
                    <td>
                      <span className={`status ${order.tone}`}>{order.estado}</span>
                    </td>
                    <td>{order.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>Flujo de atencion</h2>
          </div>
          <ol className="timeline">
            <li>
              <strong>Recepcion</strong>
              <span>Cliente y vehiculo registrados.</span>
            </li>
            <li>
              <strong>Diagnostico</strong>
              <span>Orden creada con problema reportado.</span>
            </li>
            <li>
              <strong>Servicio</strong>
              <span>Mano de obra y repuestos asociados.</span>
            </li>
            <li>
              <strong>Entrega</strong>
              <span>Pago registrado y orden cerrada.</span>
            </li>
          </ol>
        </section>
      </div>
    </section>
  );
}
