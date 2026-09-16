import { useState } from "react";
import { Metric } from "../components/Metric";
import { Notice } from "../components/Notice";
import { ReceptionDashboard } from "../components/ReceptionDashboard";
import { productRanking } from "../utils/productRanking";
import { formatCurrency } from "../utils/formatters";
import { dateKey, displayDate, withinDates, paymentTotal, dailyIncome } from "../utils/reportDates";

export function Dashboard({ data, role }) {
  const today = dateKey();
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const payments = data.payments ?? [];
  const invalidRange = from && to && from > to;
  const selectedPayments = invalidRange ? [] : payments.filter((payment) => withinDates(payment.pagado_en, from, to));
  const dayPayments = payments.filter((payment) => day && dateKey(payment.pagado_en) === day);
  const monthPayments = payments.filter((payment) => month && dateKey(payment.pagado_en).startsWith(month));
  const dayOrders = data.orders.filter((order) => day && withinDates(order.fechaIngreso, day, day));
  const ordersById = new Map(data.orders.map((order) => [order.id, order]));
  const daily = dailyIncome(selectedPayments);
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(selectedPayments.length / 20));
  const currentPage = Math.min(page, pages - 1);
  const [productFrom, setProductFrom] = useState(`${today.slice(0, 7)}-01`);
  const [productTo, setProductTo] = useState(today);
  const invalidProductRange = productFrom && productTo && productFrom > productTo;
  const topProducts = invalidProductRange ? [] : productRanking(data.productDetails ?? [], data.orders, payments, productFrom, productTo);

  if (role !== "administrador") return <ReceptionDashboard data={data} />;

  return (
    <section className="page-stack">
      {data.error && <Notice type="error">{data.error}</Notice>}
      <section className="hero-band">
        <div><span className="section-label">Ingresos y actividad</span><h2>Resumen administrativo</h2></div>
        <div className="hero-meta"><span>Órdenes del día seleccionado</span><strong>{data.loading ? "..." : dayOrders.length}</strong></div>
      </section>
      <section className="panel page-stack">
        <div className="report-filters">
          <label>Día<input type="date" value={day} onChange={(event) => setDay(event.target.value)} /></label>
          <label>Mes<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
        </div>
        <div className="metrics">
          <Metric label="Ingresos del día" value={data.loading ? "..." : formatCurrency(paymentTotal(dayPayments))} detail={day ? displayDate(day) : "Selecciona un día"} />
          <Metric label="Ingresos del mes" value={data.loading ? "..." : formatCurrency(paymentTotal(monthPayments))} detail={month || "Selecciona un mes"} />
          <Metric label="Clientes registrados" value={data.loading ? "..." : data.clientesCount} detail="Base de clientes" />
          <Metric label="Stock bajo" value={data.loading ? "..." : data.stockBajoCount} detail="Repuestos por revisar" alert />
        </div>
        <small>Ingresos según los pagos registrados y su fecha, en horario de Honduras. Incluyen abonos; no representan utilidad.</small>
      </section>
      <section className="panel page-stack">
        <div className="panel-heading"><h2>Historial de ingresos</h2><span className="count-pill">{selectedPayments.length} pagos</span></div>
        <div className="report-filters">
          <label>Desde<input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(0); }} /></label>
          <label>Hasta<input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(0); }} /></label>
          <button className="ghost-action" type="button" onClick={() => { setFrom(today); setTo(today); setPage(0); }}>Hoy</button>
          <button className="ghost-action" type="button" onClick={() => { setFrom(`${today.slice(0, 7)}-01`); setTo(today); setPage(0); }}>Este mes</button>
          <button className="ghost-action" type="button" onClick={() => { setFrom(""); setTo(""); setPage(0); }}>Todo el historial</button>
        </div>
        {invalidRange ? <Notice type="error">La fecha inicial debe ser anterior o igual a la final.</Notice> : <>
          <div className="detail-total"><span>Total del período</span><strong>{data.loading ? "..." : formatCurrency(paymentTotal(selectedPayments))}</strong></div>
          <h3>Ingresos por día</h3>
          <div className="table-wrap report-daily"><table>
            <thead><tr><th>Fecha</th><th>Pagos</th><th>Ingresos</th></tr></thead>
            <tbody>{daily.map((row) => <tr key={row.day}><td>{displayDate(row.day)}</td><td>{row.count}</td><td>{formatCurrency(row.cents / 100)}</td></tr>)}
              {!daily.length && <tr><td colSpan="3">{data.loading ? "Cargando..." : "No hay pagos en este período."}</td></tr>}
            </tbody>
          </table></div>
          <h3>Detalle de pagos</h3>
          <div className="table-wrap"><table>
            <thead><tr><th>Fecha</th><th>Orden</th><th>Cliente</th><th>Método</th><th>Monto</th></tr></thead>
            <tbody>{selectedPayments.slice(currentPage * 20, (currentPage + 1) * 20).map((payment) => {
              const order = ordersById.get(payment.orden_id);
              return <tr key={payment.id}><td>{displayDate(dateKey(payment.pagado_en))}</td><td>{order?.codigo ?? "—"}</td><td>{order?.cliente ?? "—"}</td><td>{payment.metodo}</td><td>{formatCurrency(payment.monto)}</td></tr>;
            })}
              {!selectedPayments.length && <tr><td colSpan="5">{data.loading ? "Cargando..." : "No hay pagos en este período."}</td></tr>}
            </tbody>
          </table></div>
          {pages > 1 && <div className="report-filters"><button className="ghost-action" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</button><span>Página {currentPage + 1} de {pages}</span><button className="ghost-action" disabled={currentPage === pages - 1} onClick={() => setPage(currentPage + 1)}>Siguiente</button></div>}
        </>}
      </section>
      <section className="panel page-stack">
        <div className="panel-heading"><h2>Repuestos más vendidos</h2><span className="count-pill">Top 5 por unidades</span></div>
        <div className="report-filters">
          <label>Desde<input type="date" value={productFrom} onChange={(event) => setProductFrom(event.target.value)} /></label>
          <label>Hasta<input type="date" value={productTo} onChange={(event) => setProductTo(event.target.value)} /></label>
          <button className="ghost-action" type="button" onClick={() => { setProductFrom(`${today.slice(0, 7)}-01`); setProductTo(today); }}>Este mes</button>
          <button className="ghost-action" type="button" onClick={() => { setProductFrom(""); setProductTo(""); }}>Todo el historial</button>
        </div>
        <small>Órdenes facturadas o entregadas y pagadas por completo, según la fecha de su último pago. Importes de repuestos antes de impuesto.</small>
        {invalidProductRange ? <Notice type="error">La fecha inicial debe ser anterior o igual a la final.</Notice> : <div className="table-wrap"><table>
          <thead><tr><th>Posición</th><th>Repuesto</th><th>Código</th><th>Unidades</th><th>Importe vendido</th></tr></thead>
          <tbody>{topProducts.map((product, index) => <tr key={product.id}><td>{index + 1}</td><td>{product.nombre}</td><td>{product.codigo}</td><td>{product.units}</td><td>{formatCurrency(product.cents / 100)}</td></tr>)}
            {!topProducts.length && <tr><td colSpan="5">{data.loading ? "Cargando..." : "No hay ventas de repuestos en este período."}</td></tr>}
          </tbody>
        </table></div>}
      </section>
      <section className="panel">
        <div className="panel-heading"><h2>Órdenes recientes</h2></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Fecha</th><th>Código</th><th>Cliente</th><th>Vehículo</th><th>Total</th></tr></thead>
          <tbody>{data.orders.slice(0, 8).map((order) => <tr key={order.id}><td>{order.fechaIngreso ? displayDate(dateKey(order.fechaIngreso)) : "—"}</td><td>{order.codigo}</td><td>{order.cliente}</td><td>{order.vehiculo}</td><td>{order.total}</td></tr>)}</tbody>
        </table></div>
      </section>
    </section>
  );
}
