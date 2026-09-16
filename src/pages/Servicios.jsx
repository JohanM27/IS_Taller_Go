import { useEffect, useMemo, useState } from "react";
import { Notice } from "../components/Notice";
import { createServicio, getServicios, updateServicio } from "../services/serviciosService";
import { isSupabaseConfigured } from "../services/supabaseClient";
import { formatCurrency } from "../utils/formatters";

export function Servicios() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(emptyServiceForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("Configura las variables de Supabase para cargar servicios reales.");
      return;
    }

    loadServices();
  }, []);

  const averagePrice = useMemo(() => {
    if (!services.length) {
      return formatCurrency(0);
    }

    const total = services.reduce((sum, service) => sum + Number(service.precio ?? 0), 0);
    return formatCurrency(total / services.length);
  }, [services]);

  async function loadServices() {
    setLoading(true);
    setError("");

    try {
      const data = await getServicios();
      setServices(data);
    } catch (loadError) {
      setError(`No se pudieron cargar los servicios: ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!form.nombre.trim() || !form.precio) {
      setError("Nombre y precio son obligatorios.");
      return;
    }

    if (!isSupabaseConfigured) {
      setError("No se puede guardar el servicio porque Supabase no está configurado.");
      return;
    }

    setSaving(true);

    try {
      await createServicio(cleanServiceForm(form));
      setForm(emptyServiceForm());
      setMessage("Servicio guardado correctamente.");
      await loadServices();
    } catch (insertError) {
      setError(`No se pudo guardar el servicio: ${insertError.message}`);
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
          <span className="section-label">Catálogo</span>
          <h2>Servicios del taller</h2>
        </div>
        <div className="hero-meta">
          <span>Precio promedio</span>
          <strong>{loading ? "..." : averagePrice}</strong>
        </div>
      </section>

      <section className="panel form-panel">
        <h2>Registro de servicio</h2>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span className="field-label">Nombre <span className="required">*</span></span>
            <input
              value={form.nombre}
              onChange={(event) => updateField("nombre", event.target.value)}
              placeholder="Cambio de bujías"
              required
            />
          </label>
          <label>
            <span className="field-label">Precio <span className="required">*</span></span>
            <input
              value={form.precio}
              onChange={(event) => updateField("precio", event.target.value)}
              min="0"
              placeholder="750.00"
              required
              step="0.01"
              type="number"
            />
          </label>
          <label className="field-wide">
            Descripción
            <textarea
              value={form.descripcion}
              onChange={(event) => updateField("descripcion", event.target.value)}
              placeholder="Detalle breve del trabajo que incluye el servicio"
            />
          </label>
          <div className="form-actions field-wide">
            {message && <Notice type="success">{message}</Notice>}
            {error && <Notice type="error">{error}</Notice>}
            <button className="primary-action" disabled={saving} type="submit">
              {saving ? "Guardando..." : "Guardar servicio"}
            </button>
          </div>
        </form>
      </section>

      <section className="service-grid">
        {services.map((service) => (
          <ServiceCard service={service} key={service.id} onSaved={(updated) => {
            setServices((current) => current.map((item) => item.id === updated.id ? updated : item));
          }} />
        ))}
      </section>
    </div>
  );
}

function ServiceCard({ service, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(emptyServiceForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEditing(event) {
    event.preventDefault();
    setDraft({ nombre: service.nombre, descripcion: service.descripcion ?? "", precio: String(service.precio) });
    setError("");
    setEditing(true);
  }

  async function saveChanges(event) {
    event.preventDefault();
    if (!editing || saving) return;
    if (!draft.nombre.trim() || draft.precio === "" || !Number.isFinite(Number(draft.precio)) || Number(draft.precio) < 0) {
      setError("Escribe un nombre y un precio igual o mayor que 0.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await updateServicio(service.id, cleanServiceForm(draft));
      onSaved(updated);
      setEditing(false);
    } catch (saveError) {
      setError(`No se pudo actualizar el servicio: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  }

  return <form className="service-card" onSubmit={saveChanges}>
    <div>
      <span>Servicio</span>
      <strong className="service-value">{editing ?
        <input className="service-inline-input" aria-label="Nombre del servicio" value={draft.nombre} required disabled={saving}
          onChange={(event) => setDraft({ ...draft, nombre: event.target.value })} /> : service.nombre}
      </strong>
    </div>
    {editing ? <textarea className="service-inline-description" aria-label="Descripción del servicio" value={draft.descripcion} disabled={saving}
      onChange={(event) => setDraft({ ...draft, descripcion: event.target.value })} /> :
      <p className="service-description">{service.descripcion || "Sin descripción registrada"}</p>}
    <footer>
      <span>Precio base {editing ? "(L)" : ""}</span>
      <strong className="service-value">{editing ?
        <input className="service-inline-input" aria-label="Precio del servicio en lempiras" type="number" min="0" step="0.01" value={draft.precio} required disabled={saving}
          onChange={(event) => setDraft({ ...draft, precio: event.target.value })} /> : formatCurrency(service.precio)}
      </strong>
    </footer>
    {error && <Notice type="error">{error}</Notice>}
    <div className="inventory-actions">
      {editing ? <>
        <button key="guardar" className="primary-action" type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
        <button key="cancelar" className="ghost-action" type="button" disabled={saving} onClick={() => { setEditing(false); setError(""); }}>Cancelar</button>
      </> : <button key="editar" className="ghost-action" type="button" onClick={startEditing} aria-label={`Editar ${service.nombre}`}>Editar</button>}
    </div>
  </form>;
}

function emptyServiceForm() {
  return {
    nombre: "",
    descripcion: "",
    precio: ""
  };
}

function cleanServiceForm(form) {
  return {
    nombre: form.nombre.trim(),
    descripcion: form.descripcion.trim() || null,
    precio: Number(form.precio)
  };
}
