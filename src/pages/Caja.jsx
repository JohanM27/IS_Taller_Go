import { useEffect, useMemo, useState } from "react";
import { Notice } from "../components/Notice";
import {
  abrirTurnoCaja,
  cerrarTurnoCaja,
  getTurnoCajaActivo,
  sumarPagoATurno
} from "../services/cajaTurnosService";
import { getOrdenes, updateOrdenEstado, getOrdenDetalles, addRepuestoToOrden, addServicioToOrden } from "../services/ordenesService";
import { createPago } from "../services/pagosService";
import { isSupabaseConfigured } from "../services/supabaseClient";
import { formatCurrency } from "../utils/formatters";
import { getRepuestos } from "../services/repuestosService";
import { getServicios } from "../services/serviciosService";

const ISV_RATE = 0.15;

export function Caja({ onPaymentsChanged }) {
  const [orders, setOrders] = useState([]);
  const [repuestos, setRepuestos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [orderDetails, setOrderDetails] = useState([]);

  const [form, setForm] = useState(emptyPaymentForm());
  const [itemForm, setItemForm] = useState({ tipo: "repuesto", id: "", cantidad: 1 });
  const [orderSearch, setOrderSearch] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [turnLoading, setTurnLoading] = useState(false);
  
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [saldoInicial, setSaldoInicial] = useState("");
  const [saldoCaja, setSaldoCaja] = useState(0);

  const [lastPaymentTicket, setLastPaymentTicket] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("Configura las variables de Supabase para cargar la caja.");
      return;
    }
    loadCashierData();
  }, []);

  const pendingOrders = useMemo(() => {
    const list = orders.filter((order) => Number(order.saldoPendienteRaw ?? 0) > 0 || Number(order.totalRaw ?? 0) === 0);
    if (!orderSearch.trim()) return list;
    const term = orderSearch.toLowerCase();
    return list.filter(o => 
      o.cliente?.toLowerCase().includes(term) ||
      o.codigo?.toLowerCase().includes(term) ||
      o.vehiculo?.toLowerCase().includes(term)
    );
  }, [orders, orderSearch]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === form.orden_id),
    [orders, form.orden_id]
  );

  const selectedItem = useMemo(() => {
    const source = itemForm.tipo === "repuesto" ? repuestos : servicios;
    return source.find((item) => item.id === itemForm.id);
  }, [itemForm.id, itemForm.tipo, repuestos, servicios]);

  useEffect(() => {
    if (selectedOrder) {
      loadOrderDetails(selectedOrder.id);
      updateField("monto", selectedOrder.saldoPendienteRaw);
    } else {
      setOrderDetails([]);
      updateField("monto", "");
    }
  }, [selectedOrder]);

  async function loadOrderDetails(ordenId) {
    try {
      const details = await getOrdenDetalles(ordenId);
      setOrderDetails(details);
    } catch (err) {
      console.error(err);
    }
  }

  const breakdown = useMemo(() => {
    if (!selectedOrder) {
      return { subtotal: 0, isv: 0, total: 0, pagado: 0, saldo: 0 };
    }

    const subtotal = orderDetails.reduce((sum, item) => sum + Number(item.subtotal), 0);
    const isv = subtotal * ISV_RATE;
    const total = subtotal + isv;
    const pagado = Number(selectedOrder.totalPagadoRaw ?? 0);
    const saldo = Math.max(0, total - pagado);

    return { subtotal, isv, total, pagado, saldo };
  }, [selectedOrder, orderDetails]);

  const cambio = useMemo(() => {
    const recibido = Number(form.monto || 0);
    const aPagar = Number(breakdown.saldo || 0);
    if (recibido > aPagar && aPagar > 0) {
      return recibido - aPagar;
    }
    return 0;
  }, [form.monto, breakdown.saldo]);

  async function loadCashierData() {
    setLoading(true);
    setTurnLoading(true);
    setError("");

    try {
      const [ordersData, activeTurn, reps, servs] = await Promise.all([
        getOrdenes(), 
        getTurnoCajaActivo(),
        getRepuestos(),
        getServicios()
      ]);
      setOrders(ordersData);
      setCurrentTurn(activeTurn);
      setCajaAbierta(Boolean(activeTurn));
      setSaldoCaja(Number(activeTurn?.saldo_sistema ?? 0));
      setRepuestos(reps);
      setServicios(servs);
    } catch (loadError) {
      setError(`No se pudo cargar la información: ${loadError.message}`);
    } finally {
      setLoading(false);
      setTurnLoading(false);
    }
  }

  async function handleAddItem(e) {
    e.preventDefault();
    if (!selectedOrder) return;
    if (!itemForm.id) {
      setError("Seleccione un producto o servicio.");
      return;
    }

    setAddingItem(true);
    setMessage("");
    setError("");

    try {
      if (itemForm.tipo === "repuesto") {
        const part = repuestos.find(r => r.id === itemForm.id);
        const requestedQuantity = Number(itemForm.cantidad || 0);
        const availableStock = Number(part?.stock ?? 0);

        if (!part) {
          setError("No se encontró el repuesto seleccionado.");
          return;
        }

        if (requestedQuantity <= 0) {
          setError("Ingrese una cantidad válida.");
          return;
        }

        if (availableStock < requestedQuantity) {
          setError(`Stock insuficiente para ${part.nombre}. Disponible: ${availableStock}.`);
          return;
        }

        await addRepuestoToOrden({
          orden_id: selectedOrder.id,
          repuesto_id: part.id,
          cantidad: requestedQuantity,
          precio_unitario: part.precio_venta
        });
      } else {
        const serv = servicios.find(s => s.id === itemForm.id);
        const requestedQuantity = Number(itemForm.cantidad || 0);

        if (!serv) {
          setError("No se encontró el servicio seleccionado.");
          return;
        }

        if (requestedQuantity <= 0) {
          setError("Ingrese una cantidad válida.");
          return;
        }

        await addServicioToOrden({
          orden_id: selectedOrder.id,
          servicio_id: serv.id,
          cantidad: requestedQuantity,
          precio_unitario: serv.precio,
          descripcion: serv.nombre
        });
      }
      
      const [ordersData, updatedRepuestos] = await Promise.all([getOrdenes(), getRepuestos()]);
      setOrders(ordersData);
      setRepuestos(updatedRepuestos);
      await loadOrderDetails(selectedOrder.id);
      
      setItemForm({ tipo: "repuesto", id: "", cantidad: 1 });
      setMessage("Ítem agregado correctamente a la orden.");
    } catch (err) {
      const message = err.message?.includes("Stock insuficiente")
        ? "Stock insuficiente para el repuesto seleccionado."
        : err.message;
      setError(`Error al agregar ítem: ${message}`);
    } finally {
      setAddingItem(false);
    }
  }

  async function handleSubmit(event) {
    if (event) event.preventDefault();
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

      if (selectedOrder && Number(form.monto) >= Number(breakdown.saldo)) {
        await updateOrdenEstado(selectedOrder.id, "facturada");
      }

      if (currentTurn) {
        const updatedTurn = await sumarPagoATurno(currentTurn.id, currentTurn.saldo_sistema, form.monto);
        setCurrentTurn(updatedTurn);
        setSaldoCaja(Number(updatedTurn.saldo_sistema ?? 0));
      } else {
        setSaldoCaja((prev) => prev + Number(form.monto));
      }

      setLastPaymentTicket({
        orden: selectedOrder,
        detalles: [...orderDetails],
        breakdown: { ...breakdown },
        montoRecibido: Number(form.monto),
        cambioEntregado: cambio,
        metodo: form.metodo,
        fecha: new Date().toLocaleString("es-HN")
      });

      setForm(emptyPaymentForm());
      setOrderDetails([]);
      setMessage("Pago registrado y factura emitida correctamente.");
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
    setTurnLoading(true);
    try {
      const turn = await abrirTurnoCaja(saldoInicial);
      setCurrentTurn(turn);
      setCajaAbierta(true);
      setSaldoCaja(Number(turn.saldo_sistema ?? 0));
      setMessage(`Turno de caja abierto con ${formatCurrency(Number(turn.saldo_inicial))}`);
    } catch (turnError) {
      setError(`No se pudo abrir la caja: ${turnError.message}`);
    } finally {
      setTurnLoading(false);
    }
  }

  async function handleCerrarCaja() {
    if(!window.confirm(`¿Confirma el cierre del turno de caja con ${formatCurrency(saldoCaja)} en sistema?`)) return;
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
      setMessage(`Turno de caja cerrado exitosamente. Arqueo final: ${formatCurrency(saldoCaja)}`);
      setSaldoInicial("");
      setSaldoCaja(0);
    } catch (turnError) {
      setError(`No se pudo cerrar la caja: ${turnError.message}`);
    } finally {
      setTurnLoading(false);
    }
  }

  if (turnLoading && !cajaAbierta) {
    return (
      <div className="page-stack">
        <section className="pos-apertura-card" style={{ padding: '40px' }}>
          <h2>Cargando estado del turno...</h2>
        </section>
      </div>
    );
  }

  // APERTURA DE CAJA
  if (!cajaAbierta) {
    return (
      <div className="page-stack">
        {message && <Notice type="success">{message}</Notice>}
        {error && <Notice type="error">{error}</Notice>}

        <section className="pos-apertura-card">
          <span className="section-label">Módulo de Caja</span>
          <h2 style={{ fontSize: '24px', margin: '8px 0 12px', fontWeight: '800' }}>Apertura de Turno de Caja</h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
            Ingrese el fondo inicial en efectivo para habilitar el registro de facturación y cobros.
          </p>

          <form className="form-grid" onSubmit={handleAbrirCaja}>
            <div className="field-wide">
              <label style={{ textAlign: 'left', fontWeight: '800' }}>Fondo Inicial (Lempiras) *</label>
              <div className="pos-currency-input-wrapper" style={{ marginTop: '8px' }}>
                <span className="pos-currency-prefix">L</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={saldoInicial}
                  onChange={(e) => setSaldoInicial(e.target.value)}
                  placeholder="0.00"
                  required
                  className="pos-currency-input"
                  style={{ textAlign: 'left', paddingLeft: '50px' }}
                />
              </div>

              <div className="caja-presets-bar">
                <button type="button" className="caja-preset-btn" onClick={() => setSaldoInicial("500")}>+ L 500</button>
                <button type="button" className="caja-preset-btn" onClick={() => setSaldoInicial("1000")}>+ L 1,000</button>
                <button type="button" className="caja-preset-btn" onClick={() => setSaldoInicial("2000")}>+ L 2,000</button>
                <button type="button" className="caja-preset-btn" onClick={() => setSaldoInicial("5000")}>+ L 5,000</button>
              </div>
            </div>

            <div className="field-wide" style={{ marginTop: '16px' }}>
              <button
                className="primary-action"
                disabled={turnLoading}
                type="submit"
                style={{ width: '100%', fontSize: '16px', padding: '14px', borderRadius: '12px', height: '52px' }}
              >
                {turnLoading ? "Abriendo..." : "Abrir Turno de Caja"}
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  // PANTALLA PRINCIPAL DE CAJA Y FACTURACIÓN
  return (
    <div className="page-stack">
      {/* MODAL DE COMPROBANTE IMPRIMIBLE */}
      {lastPaymentTicket && (
        <div className="caja-modal-backdrop">
          <div className="caja-receipt-card">
            <div className="caja-receipt-body">
              <h2>TALLER GO</h2>
              <p>Comprobante de Pago y Facturación<br/>RTN: 08011995048392 | Tegucigalpa, M.D.C.</p>
              
              <div className="caja-receipt-divider"></div>

              <div className="caja-receipt-row">
                <span>Fecha:</span>
                <span>{lastPaymentTicket.fecha}</span>
              </div>
              <div className="caja-receipt-row">
                <span>Orden:</span>
                <strong>#{lastPaymentTicket.orden.codigo}</strong>
              </div>
              <div className="caja-receipt-row">
                <span>Cliente:</span>
                <span>{lastPaymentTicket.orden.cliente}</span>
              </div>
              <div className="caja-receipt-row">
                <span>Vehículo:</span>
                <span>{lastPaymentTicket.orden.vehiculo}</span>
              </div>

              <div className="caja-receipt-divider"></div>

              {lastPaymentTicket.detalles.map(item => (
                <div key={item.id} className="caja-receipt-row">
                  <span>{item.cantidad}x {item.nombre}</span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
              ))}

              <div className="caja-receipt-divider"></div>

              <div className="caja-receipt-row">
                <span>Subtotal:</span>
                <span>{formatCurrency(lastPaymentTicket.breakdown.subtotal)}</span>
              </div>
              <div className="caja-receipt-row">
                <span>ISV (15%):</span>
                <span>{formatCurrency(lastPaymentTicket.breakdown.isv)}</span>
              </div>
              <div className="caja-receipt-row" style={{ fontSize: '16px', fontWeight: '800', marginTop: '6px' }}>
                <span>Total Facturado:</span>
                <span>{formatCurrency(lastPaymentTicket.breakdown.total)}</span>
              </div>

              <div className="caja-receipt-divider"></div>

              <div className="caja-receipt-row">
                <span>Método de Pago:</span>
                <span style={{ textTransform: 'capitalize', fontWeight: '700' }}>{lastPaymentTicket.metodo}</span>
              </div>
              <div className="caja-receipt-row">
                <span>Monto Recibido:</span>
                <span>{formatCurrency(lastPaymentTicket.montoRecibido)}</span>
              </div>
              {lastPaymentTicket.cambioEntregado > 0 && (
                <div className="caja-receipt-row" style={{ fontWeight: '800', color: 'var(--success)' }}>
                  <span>Cambio Entregado:</span>
                  <span>{formatCurrency(lastPaymentTicket.cambioEntregado)}</span>
                </div>
              )}

              <div className="caja-receipt-divider"></div>
              <p style={{ marginTop: '14px', fontWeight: '700', color: 'var(--ink)' }}>¡Gracias por preferir nuestros servicios!</p>
            </div>

            <div className="caja-receipt-actions">
              <button
                className="primary-action"
                onClick={() => window.print()}
                style={{ flex: 1, borderRadius: '10px' }}
              >
                Imprimir Factura
              </button>
              <button
                className="ghost-action"
                onClick={() => setLastPaymentTicket(null)}
                style={{ borderRadius: '10px' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CABECERA DE ESTADO DE CAJA */}
      <div className="caja-header-bar">
        <div className="caja-header-main">
          <div className="caja-status-pill">
            <span className="caja-status-dot"></span>
            Turno Activo
          </div>
          <div className="caja-total-box">
            <span>Total Registrado en Caja</span>
            <strong>{formatCurrency(saldoCaja)}</strong>
          </div>
        </div>

        <button
          className="ghost-action"
          onClick={handleCerrarCaja}
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#f87171',
            borderRadius: '10px',
            padding: '10px 16px',
            fontWeight: '700'
          }}
        >
          Cerrar Turno de Caja
        </button>
      </div>

      {message && <Notice type="success">{message}</Notice>}
      {error && <Notice type="error">{error}</Notice>}

      <div className="split" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        
        {/* COLUMNA IZQUIERDA: DETALLE DE CUENTA & AGREGAR ÍTEMS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* VISTA DE FACTURA EN TIEMPO REAL */}
          <section className="pos-ticket-panel" style={{ minHeight: '420px' }}>
            <div className="pos-ticket-header">
              <div className="pos-ticket-title">
                <div>
                  <h2 style={{ fontSize: '18px', margin: 0, fontWeight: '800' }}>Detalle de la Orden</h2>
                  <p style={{ color: 'var(--muted)', margin: 0, fontSize: '12px' }}>Resumen de servicios y repuestos</p>
                </div>
              </div>

              {selectedOrder && (
                <span className="status done" style={{ fontSize: '12px' }}>
                  {selectedOrder.estado?.toUpperCase()}
                </span>
              )}
            </div>
            
            <div className="pos-ticket-body">
              {!selectedOrder ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', margin: 'auto', padding: '40px 20px' }}>
                  <h3 style={{ margin: '0 0 4px', color: 'var(--ink)' }}>Ninguna orden seleccionada</h3>
                  <p style={{ fontSize: '14px', margin: 0 }}>Seleccione un cliente en la sección de cobro a la derecha.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  
                  <div className="pos-ticket-customer-info">
                    <div>
                      <span>Código de Orden</span>
                      <strong>#{selectedOrder.codigo}</strong>
                    </div>
                    <div>
                      <span>Cliente</span>
                      <strong>{selectedOrder.cliente}</strong>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span>Vehículo</span>
                      <strong>{selectedOrder.vehiculo}</strong>
                    </div>
                  </div>

                  <table className="pos-ticket-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>Cant.</th>
                        <th>Descripción</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderDetails.length === 0 ? (
                        <tr>
                          <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                            No hay servicios ni repuestos cargados en esta orden.
                          </td>
                        </tr>
                      ) : (
                        orderDetails.map(item => (
                          <tr key={item.id}>
                            <td style={{ fontWeight: '800', color: 'var(--accent-dark)' }}>{item.cantidad}x</td>
                            <td>
                              <strong>{item.nombre}</strong>
                              <span className={`pos-item-type-tag ${item.tipo}`}>
                                {item.tipo}
                              </span>
                              <br/>
                              <small style={{ color: 'var(--muted)' }}>
                                {formatCurrency(item.precio_unitario)} c/u
                              </small>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: '800' }}>
                              {formatCurrency(item.subtotal)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  <div className="pos-ticket-summary">
                    <div className="pos-summary-row">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(breakdown.subtotal)}</span>
                    </div>
                    <div className="pos-summary-row">
                      <span>ISV (15%):</span>
                      <span>{formatCurrency(breakdown.isv)}</span>
                    </div>
                    <div className="pos-summary-row total">
                      <span>Total de Orden:</span>
                      <span>{formatCurrency(breakdown.total)}</span>
                    </div>
                    
                    {breakdown.pagado > 0 && (
                      <div className="pos-summary-row paid">
                        <span>Abonos recibidos:</span>
                        <span>- {formatCurrency(breakdown.pagado)}</span>
                      </div>
                    )}

                    <div className="pos-summary-row due">
                      <span>Saldo Pendiente:</span>
                      <span>{formatCurrency(breakdown.saldo)}</span>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </section>

          {/* FORMULARIO AGREGAR ÍTEMS */}
          <section className="panel" style={{ borderRadius: '16px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '14px' }}>
              Agregar Repuesto o Servicio a la Orden
            </h3>
            
            <form onSubmit={handleAddItem} style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: '10px' }}>
                <label style={{ fontSize: '12px', minWidth: 0 }}>
                  Categoría
                  <select 
                    value={itemForm.tipo} 
                    onChange={(e) => setItemForm({...itemForm, tipo: e.target.value, id: ""})}
                    disabled={!selectedOrder}
                    style={{ fontWeight: '700', borderRadius: '10px', width: '100%', minWidth: 0 }}
                  >
                    <option value="repuesto">Repuesto</option>
                    <option value="servicio">Servicio</option>
                  </select>
                </label>

                <label style={{ fontSize: '12px', minWidth: 0 }}>
                  Cant.
                  <input 
                    type="number" 
                    min="1" 
                    value={itemForm.cantidad} 
                    onChange={(e) => setItemForm({...itemForm, cantidad: e.target.value})}
                    disabled={!selectedOrder}
                    required
                    max={itemForm.tipo === "repuesto" && selectedItem ? Number(selectedItem.stock ?? 0) : undefined}
                    style={{ textAlign: 'center', fontWeight: '800', borderRadius: '10px', width: '100%', minWidth: 0 }}
                  />
                </label>
              </div>

              <label style={{ fontSize: '12px', minWidth: 0 }}>
                Catálogo
                <select 
                  value={itemForm.id} 
                  onChange={(e) => setItemForm({...itemForm, id: e.target.value})}
                  disabled={!selectedOrder}
                  required
                  style={{ fontWeight: '700', borderRadius: '10px', width: '100%', minWidth: 0 }}
                >
                  <option value="">Seleccionar...</option>
                  {itemForm.tipo === "repuesto" 
                    ? repuestos.map(r => (
                        <option disabled={Number(r.stock ?? 0) <= 0} key={r.id} value={r.id}>
                          {r.nombre} ({formatCurrency(r.precio_venta)}) {Number(r.stock ?? 0) <= 0 ? "[Agotado]" : `[Stock: ${r.stock}]`}
                        </option>
                      ))
                    : servicios.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.nombre} ({formatCurrency(s.precio)})
                        </option>
                      ))
                  }
                </select>
              </label>

              <button 
                className="ghost-action" 
                type="submit" 
                disabled={
                  !selectedOrder ||
                  addingItem ||
                  (itemForm.tipo === "repuesto" && selectedItem && Number(selectedItem.stock ?? 0) <= 0)
                }
                style={{ 
                  borderRadius: '10px', height: '42px', fontWeight: '800',
                  background: 'var(--accent-soft)', color: 'var(--accent-dark)'
                }}
              >
                {addingItem ? "Agregando..." : "Agregar a la Orden"}
              </button>
            </form>
          </section>

        </div>

        {/* COLUMNA DERECHA: PROCESAMIENTO DE PAGO */}
        <section className="panel" style={{ borderRadius: '16px', padding: '24px', background: '#ffffff' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
            
            <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', margin: 0, fontWeight: '800' }}>Procesamiento de Pago</h2>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Ingrese los datos para cobrar la factura</span>
            </div>

            {/* SELECCIONAR ORDEN */}
            <div>
              <label style={{ fontSize: '13px', marginBottom: '6px', color: 'var(--ink)', fontWeight: '800' }}>
                1. Orden de Trabajo por Cobrar *
              </label>

              <input
                type="text"
                placeholder="Buscar cliente, placa o número..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                style={{ width: '100%', marginBottom: '8px', fontSize: '13px', borderRadius: '10px' }}
              />

              <select
                value={form.orden_id}
                onChange={(event) => updateField("orden_id", event.target.value)}
                required
                style={{ width: '100%', fontSize: '15px', padding: '12px 14px', borderRadius: '10px', fontWeight: '700' }}
              >
                <option value="">-- Seleccionar Orden --</option>
                {pendingOrders.map((order) => (
                  <option key={order.id ?? order.codigo} value={order.id}>
                    {order.cliente} — #{order.codigo} (Pendiente: {formatCurrency(order.saldoPendienteRaw)})
                  </option>
                ))}
              </select>
            </div>

            {/* MÉTODO DE PAGO (SOLO 3 OPCIONES: EFECTIVO, TARJETA, TRANSFERENCIA) */}
            <div>
               <label style={{ fontSize: '13px', marginBottom: '8px', color: 'var(--ink)', fontWeight: '800' }}>
                 2. Método de Pago *
               </label>
               <div className="caja-payment-methods">
                  <button 
                    type="button" 
                    className={`caja-method-btn ${form.metodo === 'efectivo' ? 'active' : ''}`}
                    onClick={() => updateField("metodo", "efectivo")}
                  >
                    Efectivo
                    <small>Pago en contado</small>
                  </button>
                  <button 
                    type="button" 
                    className={`caja-method-btn ${form.metodo === 'tarjeta' ? 'active' : ''}`}
                    onClick={() => updateField("metodo", "tarjeta")}
                  >
                    Tarjeta
                    <small>Débito / Crédito</small>
                  </button>
                  <button 
                    type="button" 
                    className={`caja-method-btn ${form.metodo === 'transferencia' ? 'active' : ''}`}
                    onClick={() => updateField("metodo", "transferencia")}
                  >
                    Transferencia
                    <small>Depósito bancario</small>
                  </button>
               </div>
            </div>

            {/* MONTO A RECIBIR */}
            <div>
              <label style={{ fontSize: '13px', marginBottom: '6px', color: 'var(--ink)', fontWeight: '800' }}>
                3. Monto Recibido *
              </label>
              
              <div className="pos-currency-input-wrapper">
                <span className="pos-currency-prefix">L</span>
                <input
                  min="0.01"
                  onChange={(event) => updateField("monto", event.target.value)}
                  placeholder="0.00"
                  required
                  step="0.01"
                  type="number"
                  value={form.monto}
                  className="pos-currency-input"
                />
              </div>

              {/* Botones de sugerencia rápida */}
              {selectedOrder && (
                <div className="caja-presets-bar">
                  <button type="button" className="caja-preset-btn" onClick={() => updateField("monto", breakdown?.saldo)}>Monto Exacto</button>
                  <button type="button" className="caja-preset-btn" onClick={() => updateField("monto", "100")}>L 100</button>
                  <button type="button" className="caja-preset-btn" onClick={() => updateField("monto", "500")}>L 500</button>
                  <button type="button" className="caja-preset-btn" onClick={() => updateField("monto", "1000")}>L 1,000</button>
                </div>
              )}

              {/* CÁLCULO DE CAMBIO */}
              {cambio > 0 && (
                <div className="pos-change-banner">
                  <span>Cambio a Entregar:</span>
                  <span className="pos-change-amount">{formatCurrency(cambio)}</span>
                </div>
              )}
            </div>

            {/* REFERENCIA OPCIONAL */}
            {form.metodo !== 'efectivo' && (
              <div>
                <label style={{ fontSize: '12px' }}>Número de Referencia o Transacción</label>
                <input 
                  type="text" 
                  value={form.referencia} 
                  onChange={(e) => updateField("referencia", e.target.value)}
                  placeholder="Ej: Ref #123456"
                  style={{ width: '100%', borderRadius: '10px' }}
                />
              </div>
            )}

            {/* BOTÓN DE ACCIÓN FINAL */}
            <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
              <button 
                className="primary-action" 
                disabled={saving || !selectedOrder || (orderDetails.length === 0)} 
                type="submit"
                style={{ 
                  width: '100%', fontSize: '16px', padding: '16px', borderRadius: '12px',
                  background: (saving || !selectedOrder || orderDetails.length === 0) 
                    ? 'var(--surface-muted)' 
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                  boxShadow: (saving || !selectedOrder || orderDetails.length === 0) ? 'none' : '0 8px 20px rgba(16, 185, 129, 0.3)',
                  height: '52px'
                }}
              >
                {saving ? "Procesando pago..." : "REGISTRAR PAGO Y FACTURAR"}
              </button>
            </div>
            
          </form>
        </section>
      </div>
    </div>
  );
}

function emptyPaymentForm() {
  return { orden_id: "", monto: "", metodo: "efectivo", referencia: "" };
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
