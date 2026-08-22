import { useEffect, useMemo, useState } from "react";
import { Notice } from "../components/Notice";
import { demoOrders } from "../data/demoData";
import { getClientes } from "../services/clientesService";
import { createOrdenTrabajo, getOrdenes, updateOrdenEstado } from "../services/ordenesService";
import { isSupabaseConfigured } from "../services/supabaseClient";
import { getVehiculos } from "../services/vehiculosService";

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
  const [form, setForm] = useState(emptyOrderForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
      const [ordersData, clientsData, vehiclesData] = await Promise.all([
        getOrdenes(),
        getClientes(),
        getVehiculos()
      ]);

      setOrders(ordersData);
      setClients(clientsData);
      setVehicles(vehiclesData);
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

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "cliente_id") {
        next.vehiculo_id = "";
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
            {message && <Notice type="success">{message}</Notice>}
            {error && <Notice type="error">{error}</Notice>}
            <button className="primary-action" disabled={saving} type="submit">
              {saving ? "Guardando..." : "Crear orden"}
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
