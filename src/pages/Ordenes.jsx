import { useEffect, useMemo, useState } from "react";
import { Notice } from "../components/Notice";
import { Saldo } from "../components/Saldo";
import { getClientes } from "../services/clientesService";
import {
  createOrdenTrabajo,
  getOrdenes
} from "../services/ordenesService";
import { isSupabaseConfigured } from "../services/supabaseClient";
import { getVehiculos } from "../services/vehiculosService";
import { formatCurrency } from "../utils/formatters";

export function Ordenes({ orders: loadedOrders, onOrdersChanged, role }) {
  const isReadOnly = role === "administrador";
  const [orders, setOrders] = useState(loadedOrders);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(emptyOrderForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setOrders(loadedOrders);
  }, [loadedOrders]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("Configura las variables de Supabase para cargar órdenes reales.");
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

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!form.cliente_id || !form.vehiculo_id || !form.descripcion_problema.trim()) {
      setError("Cliente, vehículo y descripción del problema son obligatorios.");
      return;
    }

    if (!isSupabaseConfigured) {
      setError("No se puede crear la orden porque Supabase no está configurado.");
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
          <span className="section-label">Órdenes</span>
          <h2>{isReadOnly ? "Consulta de órdenes de trabajo" : "Registro de órdenes de trabajo"}</h2>
        </div>
        <div className="hero-meta">
          <span>Registradas</span>
          <strong>{loading ? "..." : orders.length}</strong>
        </div>
      </section>

      {message && <Notice type="success">{message}</Notice>}
      {error && <Notice type="error">{error}</Notice>}

      {!isReadOnly && (
        <>
          <section className="panel form-panel">
            <h2>Nueva orden de trabajo</h2>
            <form className="form-grid" onSubmit={handleSubmit}>
              <label>
                Código
                <input value={form.codigo} readOnly aria-label="Código automático de la orden" />
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
        </>
      )}

      <section className="panel">
        <div className="panel-heading">
          <h2>{isReadOnly ? "Consulta general de órdenes" : "Órdenes registradas"}</h2>
          <span className="count-pill">{loading ? "Cargando..." : `${orders.length} registradas`}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Cliente</th>
                <th>Vehículo</th>
                <th>Total</th>
                <th>Pagado</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id ?? order.codigo}>
                  <td>{order.codigo}</td>
                  <td>{order.cliente}</td>
                  <td>{order.vehiculo}</td>
                  <td>{order.total ?? formatCurrency(0)}</td>
                  <td>{order.totalPagado ?? formatCurrency(0)}</td>
                  <td><Saldo value={order.saldoPendienteRaw} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
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
