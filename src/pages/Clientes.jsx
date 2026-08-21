import { useEffect, useState } from "react";
import { Notice } from "../components/Notice";
import { demoClients } from "../data/demoData";
import { createCliente, getClientes } from "../services/clientesService";
import { isSupabaseConfigured } from "../services/supabaseClient";

export function Clientes() {
  const [clients, setClients] = useState(demoClients);
  const [form, setForm] = useState(emptyClientForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    loadClients();
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
