import { useEffect, useMemo, useState } from "react";
import { Notice } from "../components/Notice";
import { demoOrders } from "../data/demoData";
import { getClientes } from "../services/clientesService";
import {
  addRepuestoToOrden,
  addServicioToOrden,
  createOrdenTrabajo,
  getOrdenes,
  updateOrdenEstado
} from "../services/ordenesService";
import { getRepuestos } from "../services/repuestosService";
import { getServicios } from "../services/serviciosService";
import { isSupabaseConfigured } from "../services/supabaseClient";
import { getVehiculos } from "../services/vehiculosService";
import { formatCurrency } from "../utils/formatters";

const ORDER_STATUSES = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_proceso", label: "En proceso" },
  { value: "finalizada", label: "Finalizada" },
  { value: "facturada", label: "Facturada" },
  { value: "entregada", label: "Entregada" }
];

export function Ordenes({ orders: loadedOrders, onOrdersChanged }) {
  const [orders, setOrders] = useState(loadedOrders);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [services, setServices] = useState([]);
  const [parts, setParts] = useState([]);
  const [form, setForm] = useState(emptyOrderForm());
  const [detailForm, setDetailForm] = useState(emptyDetailForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingDetail, setSavingDetail] = useState(false);
  const [updatingCode, setUpdatingCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setOrders(loadedOrders);
  }, [loadedOrders]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setOrders(demoOrders);
      return;
    }

    loadOrderScreenData();
  }, []);

  async function loadOrderScreenData() {
    setLoading(true);
    setError("");

    try {
      const [ordersData, clientsData, vehiclesData, servicesData, partsData] = await Promise.all([
        getOrdenes(),
        getClientes(),
        getVehiculos(),
        getServicios(),
        getRepuestos()
      ]);

      setOrders(ordersData);
      setClients(clientsData);
      setVehicles(vehiclesData);
      setServices(servicesData);
      setParts(partsData);
    } catch (loadError) {
      setError(`No se pudieron cargar los datos de órdenes: ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }

  const availableVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.cliente_id === form.cliente_id),
    [vehicles, form.cliente_id]
  );

  const groupedOrders = ORDER_STATUSES.reduce((groups, status) => {
    groups[status.label] = orders.filter((order) => getOrderStatusValue(order) === status.value);
    return groups;
  }, {});

  const selectedService = useMemo(
    () => services.find((service) => service.id === detailForm.servicio_id),
    [services, detailForm.servicio_id]
  );

  const selectedPart = useMemo(
    () => parts.find((part) => part.id === detailForm.repuesto_id),
    [parts, detailForm.repuesto_id]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!form.cliente_id || !form.vehiculo_id || !form.descripcion_problema.trim()) {
      setError("Cliente, vehículo y descripción del problema son obligatorios.");
      return;
    }

    if (!isSupabaseConfigured) {
      setMessage("Orden creada en modo demostración.");
      setForm(emptyOrderForm());
      return;
    }

    setSaving(true);

    try {
      await createOrdenTrabajo(cleanOrderForm(form));
      setForm(emptyOrderForm());
      setMessage("Orden de trabajo creada correctamente.");
      await loadOrderScreenData();
      await onOrdersChanged?.();
    } catch (insertError) {
      setError(`No se pudo crear la orden: ${insertError.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(codigo, nextStatus) {
    setMessage("");
    setError("");

    if (!isSupabaseConfigured) {
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.codigo === codigo
            ? {
                ...order,
                estadoRaw: nextStatus,
                estado: getStatusLabel(nextStatus)
              }
            : order
        )
      );
      setMessage("Estado actualizado en modo demostración.");
      return;
    }

    setUpdatingCode(codigo);

    try {
      await updateOrdenEstado(codigo, nextStatus);
      setMessage(`Orden ${codigo} actualizada a ${getStatusLabel(nextStatus)}.`);
      await loadOrderScreenData();
      await onOrdersChanged?.();
    } catch (updateError) {
      setError(`No se pudo actualizar la orden: ${updateError.message}`);
    } finally {
      setUpdatingCode("");
    }
  }

  async function handleDetailSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!detailForm.orden_id) {
      setError("Seleccione una orden de trabajo.");
      return;
    }

    if (detailForm.tipo === "servicio" && !detailForm.servicio_id) {
      setError("Seleccione el servicio realizado.");
      return;
    }

    if (detailForm.tipo === "repuesto" && !detailForm.repuesto_id) {
      setError("Seleccione el repuesto utilizado.");
      return;
    }

    if (!detailForm.precio_unitario || Number(detailForm.precio_unitario) < 0) {
      setError("Ingrese un precio unitario válido.");
      return;
    }

    if (!isSupabaseConfigured) {
      setMessage("Detalle agregado en modo demostración.");
      setDetailForm(emptyDetailForm());
      return;
    }

    setSavingDetail(true);

    try {
      if (detailForm.tipo === "servicio") {
        await addServicioToOrden(cleanServiceDetailForm(detailForm, selectedService));
      } else {
        await addRepuestoToOrden(cleanPartDetailForm(detailForm, selectedPart));
      }

      setDetailForm(emptyDetailForm());
      setMessage("Detalle agregado correctamente.");
      await loadOrderScreenData();
      await onOrdersChanged?.();
    } catch (detailError) {
      setError(`No se pudo agregar el detalle: ${detailError.message}`);
    } finally {
      setSavingDetail(false);
    }
  }

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "cliente_id") {
        next.vehiculo_id = "";
      }

      return next;
    });
  }

  function updateDetailField(field, value) {
    setDetailForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "tipo") {
        next.servicio_id = "";
        next.repuesto_id = "";
        next.precio_unitario = "";
        next.descripcion = "";
      }

      if (field === "servicio_id") {
        const service = services.find((item) => item.id === value);
        next.precio_unitario = service?.precio ? String(service.precio) : "";
        next.descripcion = service?.descripcion || service?.nombre || "";
      }

      if (field === "repuesto_id") {
        const part = parts.find((item) => item.id === value);
        next.precio_unitario = part?.precio_venta ? String(part.precio_venta) : "";
        next.descripcion = part?.nombre || "";
      }

      return next;
    });
  }

  return (
    <div className="page-stack">
      <section className="hero-band">
        <div>
          <span className="section-label">Servicio</span>
          <h2>Seguimiento de órdenes</h2>
        </div>
        <div className="hero-meta">
          <span>Activas</span>
          <strong>{loading ? "..." : groupedOrders.Pendiente.length + groupedOrders["En proceso"].length}</strong>
        </div>
      </section>

      {message && <Notice type="success">{message}</Notice>}
      {error && <Notice type="error">{error}</Notice>}

      <section className="panel form-panel">
        <h2>Nueva orden de trabajo</h2>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Código
            <input
              value={form.codigo}
              readOnly
              aria-label="Código automático de la orden"
            />
          </label>
          <label>
            Estado
            <select value={form.estado} onChange={(event) => updateField("estado", event.target.value)}>
              {ORDER_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">Cliente <span className="required">*</span></span>
            <select
              value={form.cliente_id}
              onChange={(event) => updateField("cliente_id", event.target.value)}
              required
            >
              <option value="">Seleccionar cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nombre} - {client.telefono}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">Vehículo <span className="required">*</span></span>
            <select
              value={form.vehiculo_id}
              onChange={(event) => updateField("vehiculo_id", event.target.value)}
              required
            >
              <option value="">Seleccionar vehículo</option>
              {availableVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.placa} - {vehicle.marca} {vehicle.modelo}
                </option>
              ))}
            </select>
          </label>
          <label className="field-wide">
            <span className="field-label">Descripción del problema <span className="required">*</span></span>
            <textarea
              value={form.descripcion_problema}
              onChange={(event) => updateField("descripcion_problema", event.target.value)}
              placeholder="Describa el problema reportado por el cliente"
              required
            />
          </label>
          <label className="field-wide">
            Observaciones
            <textarea
              value={form.observaciones}
              onChange={(event) => updateField("observaciones", event.target.value)}
              placeholder="Notas internas de recepción"
            />
          </label>
          <div className="form-actions field-wide">
            <button className="primary-action" disabled={saving} type="submit">
              {saving ? "Guardando..." : "Crear orden"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel form-panel">
        <h2>Detalle de orden</h2>
        <form className="form-grid" onSubmit={handleDetailSubmit}>
          <label>
            <span className="field-label">Orden <span className="required">*</span></span>
            <select
              value={detailForm.orden_id}
              onChange={(event) => updateDetailField("orden_id", event.target.value)}
              required
            >
              <option value="">Seleccionar orden</option>
              {orders.map((order) => (
                <option key={order.id ?? order.codigo} value={order.id ?? order.codigo}>
                  {order.codigo} - {order.cliente}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo de detalle
            <select value={detailForm.tipo} onChange={(event) => updateDetailField("tipo", event.target.value)}>
              <option value="servicio">Servicio realizado</option>
              <option value="repuesto">Repuesto utilizado</option>
            </select>
          </label>

          {detailForm.tipo === "servicio" ? (
            <label>
              <span className="field-label">Servicio <span className="required">*</span></span>
              <select
                value={detailForm.servicio_id}
                onChange={(event) => updateDetailField("servicio_id", event.target.value)}
                required
              >
                <option value="">Seleccionar servicio</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.nombre} - {formatCurrency(service.precio)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              <span className="field-label">Repuesto <span className="required">*</span></span>
              <select
                value={detailForm.repuesto_id}
                onChange={(event) => updateDetailField("repuesto_id", event.target.value)}
                required
              >
                <option value="">Seleccionar repuesto</option>
                {parts.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.codigo} - {part.nombre} ({part.stock} disponibles)
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Cantidad
            <input
              min="1"
              onChange={(event) => updateDetailField("cantidad", event.target.value)}
              type="number"
              value={detailForm.cantidad}
            />
          </label>
          <label>
            Precio unitario
            <input
              min="0"
              onChange={(event) => updateDetailField("precio_unitario", event.target.value)}
              step="0.01"
              type="number"
              value={detailForm.precio_unitario}
            />
          </label>
          <label className="field-wide">
            Descripción
            <textarea
              onChange={(event) => updateDetailField("descripcion", event.target.value)}
              value={detailForm.descripcion}
            />
          </label>
          <div className="detail-total field-wide">
            <span>Total del detalle</span>
            <strong>{formatCurrency(Number(detailForm.cantidad || 0) * Number(detailForm.precio_unitario || 0))}</strong>
          </div>
          <div className="form-actions field-wide">
            <button className="primary-action" disabled={savingDetail} type="submit">
              {savingDetail ? "Agregando..." : "Agregar detalle"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="kanban">
          {Object.entries(groupedOrders).map(([title, items]) => (
            <Lane
              key={title}
              title={title}
              items={items}
              onStatusChange={handleStatusChange}
              updatingCode={updatingCode}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function Lane({ title, items, onStatusChange, updatingCode }) {
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
            <div className="order-card-footer">
              <select
                className="status-select"
                value={getOrderStatusValue(order)}
                disabled={updatingCode === order.codigo}
                onChange={(event) => onStatusChange(order.codigo, event.target.value)}
              >
                {ORDER_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </article>
        ))
      ) : (
        <p className="empty-lane">Sin órdenes</p>
      )}
    </div>
  );
}

function getOrderStatusValue(order) {
  if (order.estadoRaw) {
    return order.estadoRaw;
  }

  return ORDER_STATUSES.find((status) => status.label === order.estado)?.value ?? "pendiente";
}

function getStatusLabel(value) {
  return ORDER_STATUSES.find((status) => status.value === value)?.label ?? value;
}

function emptyOrderForm() {
  return {
    codigo: generateOrderCode(),
    cliente_id: "",
    vehiculo_id: "",
    estado: "pendiente",
    descripcion_problema: "",
    observaciones: ""
  };
}

function emptyDetailForm() {
  return {
    orden_id: "",
    tipo: "servicio",
    servicio_id: "",
    repuesto_id: "",
    cantidad: "1",
    precio_unitario: "",
    descripcion: ""
  };
}

function generateOrderCode() {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = padCodePart(now.getMonth() + 1);
  const day = padCodePart(now.getDate());
  const hours = padCodePart(now.getHours());
  const minutes = padCodePart(now.getMinutes());
  const seconds = padCodePart(now.getSeconds());
  const milliseconds = String(now.getMilliseconds()).padStart(3, "0");

  return `OT-${year}${month}${day}-${hours}${minutes}${seconds}-${milliseconds}`;
}

function padCodePart(value) {
  return String(value).padStart(2, "0");
}

function cleanOrderForm(form) {
  return {
    codigo: form.codigo.trim().toUpperCase(),
    cliente_id: form.cliente_id,
    vehiculo_id: form.vehiculo_id,
    estado: form.estado,
    descripcion_problema: form.descripcion_problema.trim(),
    observaciones: form.observaciones.trim() || null
  };
}

function cleanServiceDetailForm(form, selectedService) {
  return {
    orden_id: form.orden_id,
    servicio_id: form.servicio_id,
    descripcion: form.descripcion.trim() || selectedService?.nombre || "Servicio realizado",
    cantidad: Number(form.cantidad) || 1,
    precio_unitario: Number(form.precio_unitario)
  };
}

function cleanPartDetailForm(form, selectedPart) {
  return {
    orden_id: form.orden_id,
    repuesto_id: form.repuesto_id,
    cantidad: Number(form.cantidad) || 1,
    precio_unitario: Number(form.precio_unitario || selectedPart?.precio_venta || 0)
  };
}
