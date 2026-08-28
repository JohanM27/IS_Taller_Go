import { useEffect, useMemo, useState } from "react";
import { Metric } from "../components/Metric";
import { Notice } from "../components/Notice";
import { demoOrders } from "../data/demoData";
import { getOrdenes, updateOrdenEstado } from "../services/ordenesService";
import { createPago } from "../services/pagosService";
import { isSupabaseConfigured } from "../services/supabaseClient";
import { formatCurrency } from "../utils/formatters";

const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
  { value: "otro", label: "Otro" }
];

export function Caja({ onPaymentsChanged }) {
  const [orders, setOrders] = useState(mapDemoOrdersForCashier());
  const [form, setForm] = useState(emptyPaymentForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    loadCashierData();
  }, []);

  const pendingOrders = useMemo(
    () => orders.filter((order) => Number(order.saldoPendienteRaw ?? 0) > 0),
    [orders]
  );

  const selectedOrder = useMemo(
    () => pendingOrders.find((order) => order.id === form.orden_id),
    [pendingOrders, form.orden_id]
  );

  const totalPending = useMemo(
    () => pendingOrders.reduce((sum, order) => sum + Number(order.saldoPendienteRaw ?? 0), 0),
    [pendingOrders]
  );

  async function loadCashierData() {
    setLoading(true);
    setError("");

    try {
      const data = await getOrdenes();
      setOrders(data);
    } catch (loadError) {
      setError(`No se pudieron cargar las cuentas: ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!form.orden_id || !form.monto || Number(form.monto) <= 0) {
      setError("Seleccione una orden e ingrese un monto válido.");
      return;
    }

    if (!isSupabaseConfigured) {
      setMessage("Pago registrado en modo demostración.");
      setForm(emptyPaymentForm());
      return;
    }

    setSaving(true);

    try {
      await createPago(cleanPaymentForm(form));

      if (selectedOrder && Number(form.monto) >= Number(selectedOrder.saldoPendienteRaw ?? 0)) {
        await updateOrdenEstado(selectedOrder.codigo, "facturada");
      }

      setForm(emptyPaymentForm());
      setMessage("Pago registrado correctamente.");
      await loadCashierData();
      await onPaymentsChanged?.();
    } catch (paymentError) {
      setError(`No se pudo registrar el pago: ${paymentError.message}`);
    } finally {
      setSaving(false);
    }
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="page-stack">
      <section className="hero-band">
        <div>
          <span className="section-label">Caja</span>
          <h2>Cobros y saldos pendientes</h2>
        </div>
        <div className="hero-meta">
          <span>Por cobrar</span>
          <strong>{loading ? "..." : formatCurrency(totalPending)}</strong>
        </div>
      </section>

      {message && <Notice type="success">{message}</Notice>}
      {error && <Notice type="error">{error}</Notice>}

      <div className="metrics">
        <Metric label="Cuentas abiertas" value={loading ? "..." : pendingOrders.length} detail="Órdenes con saldo" />
        <Metric label="Saldo pendiente" value={loading ? "..." : formatCurrency(totalPending)} detail="Pendiente de cobro" alert />
        <Metric label="Orden seleccionada" value={selectedOrder?.codigo ?? "N/D"} detail={selectedOrder?.cliente ?? "Sin selección"} />
        <Metric label="Saldo actual" value={selectedOrder ? selectedOrder.saldoPendiente : formatCurrency(0)} detail="Antes del pago" />
      </div>

      <div className="content-grid">
        <section className="panel form-panel">
          <h2>Registrar pago</h2>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field-wide">
              <span className="field-label">Orden <span className="required">*</span></span>
              <select
                value={form.orden_id}
                onChange={(event) => updateField("orden_id", event.target.value)}
                required
              >
                <option value="">Seleccionar orden</option>
                {pendingOrders.map((order) => (
                  <option key={order.id ?? order.codigo} value={order.id}>
                    {order.codigo} - {order.cliente} - {order.saldoPendiente}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">Monto <span className="required">*</span></span>
              <input
                min="0.01"
                onChange={(event) => updateField("monto", event.target.value)}
                placeholder="1500.00"
                required
                step="0.01"
                type="number"
                value={form.monto}
              />
            </label>
            <label>
              Método
              <select value={form.metodo} onChange={(event) => updateField("metodo", event.target.value)}>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-wide">
              Referencia
              <input
                onChange={(event) => updateField("referencia", event.target.value)}
                placeholder="Número de recibo, autorización o comprobante"
                value={form.referencia}
              />
            </label>
            <div className="detail-total field-wide">
              <span>Saldo después del pago</span>
              <strong>
                {formatCurrency(Math.max(0, Number(selectedOrder?.saldoPendienteRaw ?? 0) - Number(form.monto || 0)))}
              </strong>
            </div>
            <div className="form-actions field-wide">
              <button className="primary-action" disabled={saving} type="submit">
                {saving ? "Registrando..." : "Registrar pago"}
              </button>
            </div>
          </form>
        </section>

        <section className="panel compact-panel">
          <div className="panel-heading">
            <h2>Cuentas pendientes</h2>
            <span className="count-pill">{loading ? "Cargando..." : `${pendingOrders.length} abiertas`}</span>
          </div>
          <div className="cashier-list">
            {pendingOrders.map((order) => (
              <article className="cashier-item" key={order.id ?? order.codigo}>
                <div>
                  <strong>{order.codigo}</strong>
                  <span>{order.cliente}</span>
                  <small>{order.vehiculo}</small>
                </div>
                <div>
                  <span>Saldo</span>
                  <strong>{order.saldoPendiente}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function emptyPaymentForm() {
  return {
    orden_id: "",
    monto: "",
    metodo: "efectivo",
    referencia: ""
  };
}

function cleanPaymentForm(form) {
  return {
    orden_id: form.orden_id,
    monto: Number(form.monto),
    metodo: form.metodo,
    referencia: form.referencia.trim() || null
  };
}

function mapDemoOrdersForCashier() {
  return demoOrders.map((order, index) => {
    const total = Number(String(order.total).replace(/[^\d.-]/g, "")) || 0;

    return {
      ...order,
      id: `demo-order-${index}`,
      totalRaw: total,
      saldoPendienteRaw: order.estado === "Entregada" ? 0 : total,
      saldoPendiente: order.estado === "Entregada" ? formatCurrency(0) : formatCurrency(total)
    };
  });
}
