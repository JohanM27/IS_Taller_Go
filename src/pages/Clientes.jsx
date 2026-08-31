import { useEffect, useMemo, useState } from "react";
import { Notice } from "../components/Notice";
import { demoClients, demoVehicles } from "../data/demoData";
import { createCliente, getClientes } from "../services/clientesService";
import { isSupabaseConfigured } from "../services/supabaseClient";
import { createVehiculo, getVehiculos } from "../services/vehiculosService";

const VEHICLE_CATALOG = [
  {
    marca: "Toyota",
    modelos: ["Corolla", "Hilux", "RAV4", "Yaris", "Prado", "Tacoma"],
    colores: ["Blanco", "Negro", "Gris", "Plata", "Rojo", "Azul"]
  },
  {
    marca: "Honda",
    modelos: ["Civic", "CR-V", "HR-V", "Accord", "Pilot", "Fit"],
    colores: ["Blanco", "Negro", "Gris", "Plata", "Azul", "Rojo"]
  },
  {
    marca: "Hyundai",
    modelos: ["Tucson", "Elantra", "Accent", "Santa Fe", "Creta", "H-1"],
    colores: ["Blanco", "Negro", "Gris", "Plata", "Azul", "Beige"]
  },
  {
    marca: "Kia",
    modelos: ["Sportage", "Rio", "Sorento", "Picanto", "Seltos", "Carnival"],
    colores: ["Blanco", "Negro", "Gris", "Plata", "Rojo", "Azul"]
  },
  {
    marca: "Nissan",
    modelos: ["Frontier", "Versa", "Sentra", "X-Trail", "Kicks", "Pathfinder"],
    colores: ["Blanco", "Negro", "Gris", "Plata", "Rojo", "Azul"]
  },
  {
    marca: "Ford",
    modelos: ["Ranger", "Escape", "Explorer", "F-150", "Focus", "EcoSport"],
    colores: ["Blanco", "Negro", "Gris", "Plata", "Azul", "Rojo"]
  },
  {
    marca: "Chevrolet",
    modelos: ["Colorado", "Spark", "Aveo", "Trax", "Equinox", "Silverado"],
    colores: ["Blanco", "Negro", "Gris", "Plata", "Rojo", "Azul"]
  },
  {
    marca: "Mitsubishi",
    modelos: ["L200", "Montero", "Outlander", "ASX", "Mirage", "Eclipse Cross"],
    colores: ["Blanco", "Negro", "Gris", "Plata", "Rojo", "Azul"]
  }
];

const VEHICLE_YEARS = Array.from({ length: 22 }, (_, index) => String(new Date().getFullYear() + 1 - index));

export function Clientes({ role }) {
  const isReadOnly = role === "administrador";
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

  const selectedVehicleBrand = useMemo(
    () => VEHICLE_CATALOG.find((item) => item.marca === vehicleForm.marca),
    [vehicleForm.marca]
  );

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
      setVehicleError(`No se pudieron cargar los vehículos: ${loadError.message}`);
    } finally {
      setVehiclesLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!form.nombre.trim() || !form.telefono.trim()) {
      setError("Nombre y teléfono son obligatorios.");
      return;
    }

    if (!isSupabaseConfigured) {
      const newClient = {
        id: crypto.randomUUID(),
        ...cleanClientForm(form)
      };
      setClients((current) => [newClient, ...current]);
      setForm(emptyClientForm());
      setMessage("Cliente agregado en modo demostración.");
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
      setVehicleMessage("Vehículo agregado en modo demostración.");
      return;
    }

    setVehicleSaving(true);

    try {
      await createVehiculo(cleanVehicleForm(vehicleForm));
      setVehicleForm(emptyVehicleForm());
      setVehicleMessage("Vehículo guardado correctamente.");
      await loadVehicles();
    } catch (insertError) {
      setVehicleError(`No se pudo guardar el vehículo: ${insertError.message}`);
    } finally {
      setVehicleSaving(false);
    }
  }

  function updateVehicleField(field, value) {
    setVehicleForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "marca") {
        next.modelo = "";
        next.anio = "";
        next.color = "";
      }

      if (field === "modelo") {
        next.anio = "";
      }

      return next;
    });
  }

  return (
    <div className="page-stack">
      <section className="hero-band">
        <div>
          <span className="section-label">Clientes</span>
          <h2>Consulta de clientes</h2>
        </div>
        <div className="hero-meta">
          <span>Activos</span>
          <strong>{clients.length} clientes</strong>
        </div>
      </section>

      {!isReadOnly && (
        <div className="management-grid">
        <section className="panel form-panel">
          <h2>Registro de cliente</h2>
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
              <span className="field-label">Nombre <span className="required">*</span></span>
              <input
                value={form.nombre}
                onChange={(event) => updateField("nombre", event.target.value)}
                placeholder="Nombre completo"
                required
              />
            </label>
            <label>
              <span className="field-label">Teléfono <span className="required">*</span></span>
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
              Dirección
              <input
                value={form.direccion}
                onChange={(event) => updateField("direccion", event.target.value)}
                placeholder="Dirección del cliente"
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

        <section className="panel form-panel">
            <h2>Registro de vehículo</h2>
          <form className="form-grid" onSubmit={handleVehicleSubmit}>
            <label className="field-wide">
              <span className="field-label">Cliente <span className="required">*</span></span>
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
              <span className="field-label">Placa <span className="required">*</span></span>
              <input
                value={vehicleForm.placa}
                onChange={(event) => updateVehicleField("placa", event.target.value)}
                placeholder="HAA-1234"
                required
              />
            </label>
            <label>
              <span className="field-label">Marca <span className="required">*</span></span>
              <select
                value={vehicleForm.marca}
                onChange={(event) => updateVehicleField("marca", event.target.value)}
                required
              >
                <option value="">Seleccionar marca</option>
                {VEHICLE_CATALOG.map((brand) => (
                  <option key={brand.marca} value={brand.marca}>
                    {brand.marca}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">Modelo <span className="required">*</span></span>
              <select
                value={vehicleForm.modelo}
                onChange={(event) => updateVehicleField("modelo", event.target.value)}
                disabled={!selectedVehicleBrand}
                required
              >
                <option value="">Seleccionar modelo</option>
                {selectedVehicleBrand?.modelos.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Año
              <select
                value={vehicleForm.anio}
                onChange={(event) => updateVehicleField("anio", event.target.value)}
                disabled={!vehicleForm.modelo}
              >
                <option value="">Seleccionar año</option>
                {VEHICLE_YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Color
              <select
                value={vehicleForm.color}
                onChange={(event) => updateVehicleField("color", event.target.value)}
                disabled={!selectedVehicleBrand}
              >
                <option value="">Seleccionar color</option>
                {selectedVehicleBrand?.colores.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
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
                {vehicleSaving ? "Guardando..." : "Guardar vehículo"}
              </button>
            </div>
          </form>
        </section>
        </div>
      )}

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
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Dirección</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>{client.nombre}</td>
                  <td>{client.telefono}</td>
                  <td>{client.correo || "Sin correo"}</td>
                  <td>{client.direccion || "Sin dirección"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Vehículos registrados</h2>
          <span className="count-pill">{vehiclesLoading ? "Cargando..." : `${vehicles.length} activos`}</span>
        </div>
        <div className="vehicle-grid">
          {vehicles.map((vehicle) => (
            <article className="vehicle-card" key={vehicle.id}>
              <div>
                <strong>{vehicle.placa}</strong>
                <span>{vehicle.marca} {vehicle.modelo}</span>
              </div>
              <dl>
                <div>
                  <dt>Cliente</dt>
                  <dd>{vehicle.clientes?.nombre || "Sin cliente"}</dd>
                </div>
                <div>
                  <dt>Año</dt>
                  <dd>{vehicle.anio || "N/D"}</dd>
                </div>
                <div>
                  <dt>Color</dt>
                  <dd>{vehicle.color || "N/D"}</dd>
                </div>
                <div>
                  <dt>Kilometraje</dt>
                  <dd>{vehicle.kilometraje ? Number(vehicle.kilometraje).toLocaleString("es-HN") : "N/D"}</dd>
                </div>
              </dl>
            </article>
          ))}
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
