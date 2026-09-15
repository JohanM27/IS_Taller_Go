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

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("Configura las variables de Supabase para cargar caja real.");
      return;
    }
    loadCashierData();
  }, []);

  const pendingOrders = useMemo(
    () => orders.filter((order) => Number(order.saldoPendienteRaw ?? 0) > 0 || Number(order.totalRaw ?? 0) === 0),
    [orders]
  );

  const selectedOrder = useMemo(
    () => pendingOrders.find((order) => order.id === form.orden_id),
    [pendingOrders, form.orden_id]
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
      setError(`No se pudo cargar la info: ${loadError.message}`);
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
      
      // Reload order details and orders to get new totals
      const [ordersData, updatedRepuestos] = await Promise.all([getOrdenes(), getRepuestos()]);
      setOrders(ordersData);
      setRepuestos(updatedRepuestos);
      await loadOrderDetails(selectedOrder.id);
      
      setItemForm({ tipo: "repuesto", id: "", cantidad: 1 });
      setMessage("Item agregado a la cuenta.");
    } catch (err) {
      const message = err.message?.includes("Stock insuficiente")
        ? "Stock insuficiente para el repuesto seleccionado."
        : err.message;
      setError(`Error al agregar item: ${message}`);
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

      setForm(emptyPaymentForm());
      setOrderDetails([]);
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
    if(!window.confirm(`¿Estás seguro de cerrar la caja con ${formatCurrency(saldoCaja)} en sistema?`)) return;
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
      setMessage(`Caja cerrada. Total entregado: ${formatCurrency(saldoCaja)}`);
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
        <section className="hero-band"><h2>Cargando turno...</h2></section>
      </div>
    );
  }

  if (!cajaAbierta) {
    return (
      <div className="page-stack">
        <section className="hero-band">
          <div><span className="section-label">Punto de venta</span><h2>Apertura de caja</h2></div>
        </section>
        {message && <Notice type="success">{message}</Notice>}
        {error && <Notice type="error">{error}</Notice>}
        <section className="panel form-panel" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <h2>Iniciar turno</h2>
          <form className="form-grid" onSubmit={handleAbrirCaja}>
            <label className="field-wide">
              <span className="field-label">Fondo de caja (lempiras) *</span>
              <input type="number" min="0" step="0.01" value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} required style={{ fontSize: '24px', padding: '16px', textAlign: 'right' }} />
            </label>
            <div className="form-actions field-wide">
              <button className="primary-action" disabled={turnLoading} type="submit" style={{ width: '100%', fontSize: '18px', padding: '16px' }}>{turnLoading ? "Abriendo..." : "Abrir caja"}</button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
         <div className="hero-meta" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div><span>En Caja (Total)</span><strong style={{ fontSize: '24px', color: 'var(--success)' }}>{formatCurrency(saldoCaja)}</strong></div>
            <button className="ghost-action" onClick={handleCerrarCaja} style={{ color: 'var(--danger)', background: '#fee2e2' }}>Cerrar Caja</button>
         </div>
      </div>

      {message && <Notice type="success">{message}</Notice>}
      {error && <Notice type="error">{error}</Notice>}

      <div className="split" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        
        {/* LEFT COLUMN - TICKET & PRODUCT ADDER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* TICKET PANEL */}
          <section className="panel" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', borderBottom: '2px dashed #cbd5e1', textAlign: 'center' }}>
              <h2 style={{ fontSize: '24px', margin: '0' }}>Ticket de pago</h2>
              <p style={{ color: 'var(--muted)', margin: '4px 0 0 0' }}>TallerGo POS</p>
            </div>
            
            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              {!selectedOrder ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', margin: 'auto' }}>
                  Selecciona un cliente u orden a la derecha.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ marginBottom: '20px', fontSize: '14px' }}>
                    <strong>Orden: </strong> {selectedOrder.codigo}<br/>
                    <strong>Cliente: </strong> {selectedOrder.cliente}<br/>
                    <strong>Vehículo: </strong> {selectedOrder.vehiculo}
                  </div>

                  <table style={{ width: '100%', marginBottom: '20px', background: 'transparent' }}>
                    <thead>
                      <tr>
                        <th style={{ background: 'transparent', padding: '8px 0', fontSize: '12px', color: 'var(--muted)' }}>Cant.</th>
                        <th style={{ background: 'transparent', padding: '8px 0', fontSize: '12px', color: 'var(--muted)' }}>Descripción</th>
                        <th style={{ background: 'transparent', padding: '8px 0', textAlign: 'right', fontSize: '12px', color: 'var(--muted)' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderDetails.length === 0 ? (
                        <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>Ticket vacío. Agrega items abajo.</td></tr>
                      ) : (
                        orderDetails.map(item => (
                          <tr key={item.id}>
                            <td style={{ padding: '8px 0', fontWeight: 'bold' }}>{item.cantidad}x</td>
                            <td style={{ padding: '8px 0' }}>{item.nombre} <br/><small style={{color:'var(--muted)'}}>{item.tipo} a {formatCurrency(item.precio_unitario)} c/u</small></td>
                            <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(item.subtotal)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  <div style={{ marginTop: 'auto', display: 'grid', gap: '8px', borderTop: '2px dashed var(--line)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                      <span>Subtotal:</span><span>{formatCurrency(breakdown.subtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                      <span>ISV (15%):</span><span>{formatCurrency(breakdown.isv)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '20px', marginTop: '8px' }}>
                      <span>Total:</span><span>{formatCurrency(breakdown.total)}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)', borderTop: '1px solid var(--line)', paddingTop: '8px', marginTop: '8px' }}>
                      <span>Abonado:</span><span>{formatCurrency(breakdown.pagado)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '24px', color: 'var(--danger)' }}>
                      <span>Por pagar:</span><span>{formatCurrency(breakdown.saldo)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* QUICK ADD ITEM BAR */}
          <section className="panel" style={{ padding: '16px', background: 'var(--surface)' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '12px', marginTop: 0 }}>Agregar a la cuenta</h3>
            <form onSubmit={handleAddItem} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <label style={{ flex: 1, fontSize: '12px' }}>
                Tipo
                <select 
                  value={itemForm.tipo} 
                  onChange={(e) => setItemForm({...itemForm, tipo: e.target.value, id: ""})}
                  disabled={!selectedOrder}
                  style={{ minHeight: '36px', width: '100%' }}
                >
                  <option value="repuesto">Repuesto</option>
                  <option value="servicio">Servicio</option>
                </select>
              </label>
              
              <label style={{ flex: 3, fontSize: '12px' }}>
                Producto o servicio
                <select 
                  value={itemForm.id} 
                  onChange={(e) => setItemForm({...itemForm, id: e.target.value})}
                  disabled={!selectedOrder}
                  required
                  style={{ minHeight: '36px', width: '100%' }}
                >
                  <option value="">Seleccionar...</option>
                  {itemForm.tipo === "repuesto" 
                    ? repuestos.map(r => (
                        <option disabled={Number(r.stock ?? 0) <= 0} key={r.id} value={r.id}>
                          {r.nombre} - {formatCurrency(r.precio_venta)} - Stock: {r.stock}
                        </option>
                      ))
                    : servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} - {formatCurrency(s.precio)}</option>)
                  }
                </select>
              </label>

              <label style={{ flex: 1, fontSize: '12px' }}>
                Cant.
                <input 
                  type="number" 
                  min="1" 
                  value={itemForm.cantidad} 
                  onChange={(e) => setItemForm({...itemForm, cantidad: e.target.value})}
                  disabled={!selectedOrder}
                  required
                  max={itemForm.tipo === "repuesto" && selectedItem ? Number(selectedItem.stock ?? 0) : undefined}
                  style={{ minHeight: '36px', width: '100%' }}
                />
              </label>

              <button 
                className="primary-action" 
                type="submit" 
                disabled={
                  !selectedOrder ||
                  addingItem ||
                  (itemForm.tipo === "repuesto" && selectedItem && Number(selectedItem.stock ?? 0) <= 0)
                }
                style={{ minHeight: '36px', padding: '0 16px' }}
              >
                Agregar
              </button>
            </form>
            {itemForm.tipo === "repuesto" && selectedItem && (
              <p style={{ color: "var(--muted)", fontSize: "12px", margin: "8px 0 0" }}>
                Existencia disponible: {selectedItem.stock}
              </p>
            )}
          </section>

        </div>

        {/* RIGHT COLUMN - POS TERMINAL */}
        <section className="panel" style={{ padding: '30px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
            
            {/* 1. Seleccionar Orden */}
            <div>
              <label style={{ fontSize: '16px', marginBottom: '8px', display: 'block' }}>1. Seleccionar cliente u orden</label>
              <select
                value={form.orden_id}
                onChange={(event) => updateField("orden_id", event.target.value)}
                required
                style={{ width: '100%', fontSize: '16px', padding: '12px' }}
              >
                <option value="">Buscar cuenta abierta</option>
                {pendingOrders.map((order) => (
                  <option key={order.id ?? order.codigo} value={order.id}>
                    {order.cliente} ({order.codigo})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Método de pago */}
            <div>
               <label style={{ fontSize: '16px', marginBottom: '8px', display: 'block' }}>2. Método de pago</label>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button 
                    type="button" 
                    onClick={() => updateField("metodo", "efectivo")}
                    style={{ 
                      padding: '16px', fontSize: '16px', borderRadius: '12px',
                      border: form.metodo === 'efectivo' ? '2px solid var(--accent)' : '1px solid var(--line)',
                      background: form.metodo === 'efectivo' ? 'var(--accent-soft)' : '#fff',
                      color: form.metodo === 'efectivo' ? 'var(--accent-dark)' : 'var(--ink)',
                      fontWeight: '800', cursor: 'pointer'
                    }}
                  >Efectivo</button>
                  <button 
                    type="button" 
                    onClick={() => updateField("metodo", "tarjeta")}
                    style={{ 
                      padding: '16px', fontSize: '16px', borderRadius: '12px',
                      border: form.metodo === 'tarjeta' ? '2px solid var(--accent)' : '1px solid var(--line)',
                      background: form.metodo === 'tarjeta' ? 'var(--accent-soft)' : '#fff',
                      color: form.metodo === 'tarjeta' ? 'var(--accent-dark)' : 'var(--ink)',
                      fontWeight: '800', cursor: 'pointer'
                    }}
                  >Tarjeta</button>
               </div>
            </div>

            {/* 3. Monto a pagar */}
            <div>
              <label style={{ fontSize: '16px', marginBottom: '8px', display: 'block' }}>3. Monto a recibir</label>
              <input
                min="0.01"
                onChange={(event) => updateField("monto", event.target.value)}
                placeholder="0.00"
                required
                step="0.01"
                type="number"
                value={form.monto}
                style={{ width: '100%', fontSize: '32px', padding: '20px', textAlign: 'right', fontWeight: '900', color: 'var(--accent-dark)' }}
              />
              
              {selectedOrder && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button type="button" className="ghost-action" onClick={() => updateField("monto", breakdown?.saldo)}>Exacto</button>
                  <button type="button" className="ghost-action" onClick={() => updateField("monto", "500")}>+ 500</button>
                  <button type="button" className="ghost-action" onClick={() => updateField("monto", "1000")}>+ 1000</button>
                </div>
              )}
            </div>

            {/* 4. Acción */}
            <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
              <button 
                className="primary-action" 
                disabled={saving || !selectedOrder || (orderDetails.length === 0)} 
                type="submit"
                style={{ 
                  width: '100%', fontSize: '20px', padding: '24px', 
                  background: (saving || !selectedOrder || orderDetails.length === 0) ? 'var(--line)' : 'var(--success)', 
                  boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)' 
                }}
              >
                {saving ? "Procesando..." : "Procesar pago"}
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
