import { useEffect, useState } from "react";
import { Notice } from "../components/Notice";
import { demoClients, demoVehicles } from "../data/demoData";
import { createCliente, getClientes } from "../services/clientesService";
import { isSupabaseConfigured } from "../services/supabaseClient";
import { createVehiculo, getVehiculos } from "../services/vehiculosService";

export function Clientes() {
  const [clients, setClients] = useState(demoClients);
  const [vehicles, setVehicles] = useState(demoVehicles);
  const [form, setForm] = useState(emptyClientForm());
  const [vehicleForm, setVehicleForm] = useState(emptyVehicleForm());
  const [loading, setLoading] = useState(false);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [vehicleMessage, setVehicleMessage] = useState("");
  const [error, setError] = useState("");
  const [vehicleError, setVehicleError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    loadClients();
    loadVehicles();
  }, []);

  async function loadClients() {
    setLoading(true);
    setError("");

    try {
      const data = await getClientes();
      setClients(data);
    } catch (loadError) {
      setError(`No se pudieron cargar los clientes: ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadVehicles() {
    setVehiclesLoading(true);
    setVehicleError("");

    try {
      const data = await getVehiculos();
      setVehicles(data);
    } catch (loadError) {
      setVehicleError(`No se pudieron cargar los vehiculos: ${loadError.message}`);
    } finally {
      setVehiclesLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!form.nombre.trim() || !form.telefono.trim()) {
      setError("Nombre y telefono son obligatorios.");
      return;
    }

    if (!isSupabaseConfigured) {
      const newClient = {
        id: crypto.randomUUID(),
        ...cleanClientForm(form)
      };
      setClients((current) => [newClient, ...current]);
      setForm(emptyClientForm());
      setMessage("Cliente agregado en modo demostracion.");
      return;
    }

    setSaving(true);

    try {
      await createCliente(cleanClientForm(form));
      setForm(emptyClientForm());
      setMessage("Cliente guardado correctamente.");
      await loadClients();
    } catch (insertError) {
      setError(`No se pudo guardar el cliente: ${insertError.message}`);
    } finally {
      setSaving(false);
    }
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleVehicleSubmit(event) {
    event.preventDefault();
    setVehicleMessage("");
    setVehicleError("");

    if (!vehicleForm.cliente_id || !vehicleForm.placa.trim() || !vehicleForm.marca.trim() || !vehicleForm.modelo.trim()) {
      setVehicleError("Cliente, placa, marca y modelo son obligatorios.");
      return;
    }

    if (!isSupabaseConfigured) {
      const client = clients.find((item) => item.id === vehicleForm.cliente_id);
      const newVehicle = {
        id: crypto.randomUUID(),
        ...cleanVehicleForm(vehicleForm),
        clientes: { nombre: client?.nombre ?? "Cliente demo" }
      };
      setVehicles((current) => [newVehicle, ...current]);
      setVehicleForm(emptyVehicleForm());
      setVehicleMessage("Vehiculo agregado en modo demostracion.");
      return;
    }

    setVehicleSaving(true);

    try {
      await createVehiculo(cleanVehicleForm(vehicleForm));
      setVehicleForm(emptyVehicleForm());
      setVehicleMessage("Vehiculo guardado correctamente.");
      await loadVehicles();
    } catch (insertError) {
      setVehicleError(`No se pudo guardar el vehiculo: ${insertError.message}`);
    } finally {
      setVehicleSaving(false);
    }
  }

  function updateVehicleField(field, value) {
    setVehicleForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="module-stack">
      <section className="panel">
        <div className="panel-heading">
          <h2>Registro de cliente</h2>
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Identidad
            <input
              value={form.identidad}
              onChange={(event) => updateField("identidad", event.target.value)}
              placeholder="0801199900012"
            />
          </label>
          <label>
            Nombre <span className="required">*</span>
            <input
              value={form.nombre}
              onChange={(event) => updateField("nombre", event.target.value)}
              placeholder="Nombre completo"
              required
            />
          </label>
          <label>
            Telefono <span className="required">*</span>
            <input
              value={form.telefono}
              onChange={(event) => updateField("telefono", event.target.value)}
              placeholder="9999-9999"
              required
            />
          </label>
          <label>
            Correo
            <input
              value={form.correo}
              onChange={(event) => updateField("correo", event.target.value)}
              placeholder="cliente@correo.com"
              type="email"
            />
          </label>
          <label className="field-wide">
            Direccion
            <input
              value={form.direccion}
              onChange={(event) => updateField("direccion", event.target.value)}
              placeholder="Direccion del cliente"
            />
          </label>
          <div className="form-actions field-wide">
            {message && <Notice type="success">{message}</Notice>}
            {error && <Notice type="error">{error}</Notice>}
            <button className="primary-action" disabled={saving} type="submit">
              {saving ? "Guardando..." : "Guardar cliente"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Clientes registrados</h2>
          <span className="count-pill">{loading ? "Cargando..." : `${clients.length} activos`}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Telefono</th>
                <th>Correo</th>
                <th>Direccion</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>{client.nombre}</td>
                  <td>{client.telefono}</td>
                  <td>{client.correo || "Sin correo"}</td>
                  <td>{client.direccion || "Sin direccion"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Registro de vehiculo</h2>
        </div>
        <form className="form-grid" onSubmit={handleVehicleSubmit}>
          <label className="field-wide">
            Cliente <span className="required">*</span>
            <select
              value={vehicleForm.cliente_id}
              onChange={(event) => updateVehicleField("cliente_id", event.target.value)}
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
            Placa <span className="required">*</span>
            <input
              value={vehicleForm.placa}
              onChange={(event) => updateVehicleField("placa", event.target.value)}
              placeholder="HAA-1234"
              required
            />
          </label>
          <label>
            Marca <span className="required">*</span>
            <input
              value={vehicleForm.marca}
              onChange={(event) => updateVehicleField("marca", event.target.value)}
              placeholder="Toyota"
              required
            />
          </label>
          <label>
            Modelo <span className="required">*</span>
            <input
              value={vehicleForm.modelo}
              onChange={(event) => updateVehicleField("modelo", event.target.value)}
              placeholder="Corolla"
              required
            />
          </label>
          <label>
            Año
            <input
              value={vehicleForm.anio}
              onChange={(event) => updateVehicleField("anio", event.target.value)}
              placeholder="2017"
              type="number"
            />
          </label>
          <label>
            Color
            <input
              value={vehicleForm.color}
              onChange={(event) => updateVehicleField("color", event.target.value)}
              placeholder="Gris"
            />
          </label>
          <label>
            Kilometraje
            <input
              value={vehicleForm.kilometraje}
              onChange={(event) => updateVehicleField("kilometraje", event.target.value)}
              placeholder="82000"
              type="number"
            />
          </label>
          <div className="form-actions field-wide">
            {vehicleMessage && <Notice type="success">{vehicleMessage}</Notice>}
            {vehicleError && <Notice type="error">{vehicleError}</Notice>}
            <button className="primary-action" disabled={vehicleSaving} type="submit">
              {vehicleSaving ? "Guardando..." : "Guardar vehiculo"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Vehiculos registrados</h2>
          <span className="count-pill">{vehiclesLoading ? "Cargando..." : `${vehicles.length} activos`}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Placa</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Año</th>
                <th>Color</th>
                <th>Kilometraje</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td>{vehicle.clientes?.nombre || "Sin cliente"}</td>
                  <td>{vehicle.placa}</td>
                  <td>{vehicle.marca}</td>
                  <td>{vehicle.modelo}</td>
                  <td>{vehicle.anio || "N/D"}</td>
                  <td>{vehicle.color || "N/D"}</td>
                  <td>{vehicle.kilometraje ? Number(vehicle.kilometraje).toLocaleString("es-HN") : "N/D"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function emptyClientForm() {
  return {
    identidad: "",
    nombre: "",
    telefono: "",
    correo: "",
    direccion: ""
  };
}

function cleanClientForm(form) {
  return {
    identidad: form.identidad.trim() || null,
    nombre: form.nombre.trim(),
    telefono: form.telefono.trim(),
    correo: form.correo.trim() || null,
    direccion: form.direccion.trim() || null
  };
}

function emptyVehicleForm() {
  return {
    cliente_id: "",
    placa: "",
    marca: "",
    modelo: "",
    anio: "",
    color: "",
    kilometraje: ""
  };
}

function cleanVehicleForm(form) {
  return {
    cliente_id: form.cliente_id,
    placa: form.placa.trim().toUpperCase(),
    marca: form.marca.trim(),
    modelo: form.modelo.trim(),
    anio: form.anio ? Number(form.anio) : null,
    color: form.color.trim() || null,
    kilometraje: form.kilometraje ? Number(form.kilometraje) : null
  };
}
