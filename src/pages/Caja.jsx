import { useEffect, useMemo, useState } from "react";
import { Metric } from "../components/Metric";
import { Notice } from "../components/Notice";
import {
  abrirTurnoCaja,
  cerrarTurnoCaja,
  getTurnoCajaActivo,
  sumarPagoATurno
} from "../services/cajaTurnosService";
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
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(emptyPaymentForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [turnLoading, setTurnLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [saldoInicial, setSaldoInicial] = useState("");
  const [saldoCaja, setSaldoCaja] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("Configura las variables de Supabase para cargar caja real.");
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
    setTurnLoading(true);
    setError("");

    try {
      const [ordersData, activeTurn] = await Promise.all([getOrdenes(), getTurnoCajaActivo()]);
      setOrders(ordersData);
      setCurrentTurn(activeTurn);
      setCajaAbierta(Boolean(activeTurn));
      setSaldoCaja(Number(activeTurn?.saldo_sistema ?? 0));
    } catch (loadError) {
      setError(`No se pudieron cargar las cuentas: ${loadError.message}`);
    } finally {
      setLoading(false);
      setTurnLoading(false);
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
      setError("No se puede registrar el pago porque Supabase no está configurado.");
      return;
    }

    setSaving(true);

    try {
      await createPago(cleanPaymentForm(form, currentTurn));

      if (selectedOrder && Number(form.monto) >= Number(selectedOrder.saldoPendienteRaw ?? 0)) {
        await updateOrdenEstado(selectedOrder.id, "facturada");
      }

      if (currentTurn) {
        const updatedTurn = await sumarPagoATurno(currentTurn.id, currentTurn.saldo_sistema, form.monto);
        setCurrentTurn(updatedTurn);
        setSaldoCaja(Number(updatedTurn.saldo_sistema ?? 0));
      } else {
        setSaldoCaja((prev) => prev + Number(form.monto));
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

  async function handleAbrirCaja(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (saldoInicial === "" || Number(saldoInicial) < 0) {
      setError("Ingrese un saldo inicial válido.");
      return;
    }

    if (!isSupabaseConfigured) {
      setError("No se puede abrir caja porque Supabase no está configurado.");
      return;
    }

    setTurnLoading(true);

    try {
      const turn = await abrirTurnoCaja(saldoInicial);
      setCurrentTurn(turn);
      setCajaAbierta(true);
      setSaldoCaja(Number(turn.saldo_sistema ?? 0));
      setMessage(`Caja abierta con ${formatCurrency(Number(turn.saldo_inicial))}`);
    } catch (turnError) {
      setError(`No se pudo abrir caja: ${turnError.message}`);
    } finally {
      setTurnLoading(false);
    }
  }

  async function handleCerrarCaja() {
    setMessage("");
    setError("");

    if (!currentTurn) {
      setCajaAbierta(false);
      setSaldoInicial("");
      setSaldoCaja(0);
      return;
    }

    setTurnLoading(true);

    try {
      await cerrarTurnoCaja(currentTurn.id, saldoCaja);
      setCajaAbierta(false);
      setCurrentTurn(null);
      setMessage(`Caja cerrada. Total en caja: ${formatCurrency(saldoCaja)}`);
      setSaldoInicial("");
      setSaldoCaja(0);
    } catch (turnError) {
      setError(`No se pudo cerrar caja: ${turnError.message}`);
    } finally {
      setTurnLoading(false);
    }
  }

  if (turnLoading && !cajaAbierta) {
    return (
      <div className="page-stack">
        <section className="hero-band">
          <div>
            <span className="section-label">Caja</span>
            <h2>Cargando turno</h2>
          </div>
        </section>
      </div>
    );
  }

  if (!cajaAbierta) {
    return (
      <div className="page-stack">
        <section className="hero-band">
          <div>
            <span className="section-label">Caja</span>
            <h2>Apertura de turno</h2>
          </div>
        </section>
        {message && <Notice type="success">{message}</Notice>}
        {error && <Notice type="error">{error}</Notice>}
        <section className="panel form-panel">
          <h2>Abrir caja</h2>
          <form className="form-grid" onSubmit={handleAbrirCaja}>
            <label className="field-wide">
              <span className="field-label">Saldo inicial en caja (Cambio) <span className="required">*</span></span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Ej. 1000.00"
                value={saldoInicial}
                onChange={(e) => setSaldoInicial(e.target.value)}
                required
              />
            </label>
            <div className="form-actions field-wide">
              <button className="primary-action" disabled={turnLoading} type="submit">
                {turnLoading ? "Abriendo..." : "Iniciar turno"}
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="hero-band">
        <div>
          <span className="section-label">Caja</span>
          <h2>Cobros y saldos pendientes</h2>
        </div>
        <div className="hero-meta">
          <span>En Caja hoy</span>
          <strong>{formatCurrency(saldoCaja)}</strong>
        </div>
      </section>

      {message && <Notice type="success">{message}</Notice>}
      {error && <Notice type="error">{error}</Notice>}

      <div className="metrics">
        <Metric label="Cuentas abiertas" value={loading ? "..." : pendingOrders.length} detail="Órdenes con saldo" />
        <Metric label="Saldo pendiente total" value={loading ? "..." : formatCurrency(totalPending)} detail="Pendiente de cobro" alert />
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

        <section className="panel compact-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
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
          </div>

          <div className="panel form-panel" style={{ marginTop: 'auto' }}>
            <h2>Cierre de turno</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Al finalizar, realiza el cuadre de todo lo cobrado en el día.
            </p>
            <button
              className="primary-action"
              disabled={turnLoading}
              style={{ width: '100%', background: 'var(--alert-fill)', color: 'var(--alert-text)' }}
              onClick={handleCerrarCaja}
              type="button"
            >
              {turnLoading ? "Cerrando..." : "Cerrar caja"}
            </button>
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

function cleanPaymentForm(form, currentTurn) {
  return {
    orden_id: form.orden_id,
    caja_turno_id: currentTurn?.id ?? null,
    monto: Number(form.monto),
    metodo: form.metodo,
    referencia: form.referencia.trim() || null
  };
}
