import { useEffect, useMemo, useState } from "react";
import { Notice } from "../components/Notice";
import { createServicio, getServicios } from "../services/serviciosService";
import { isSupabaseConfigured } from "../services/supabaseClient";
import { formatCurrency } from "../utils/formatters";

const demoServices = [
  {
    id: "svc-demo-1",
    nombre: "Cambio de aceite",
    descripcion: "Cambio de aceite de motor y revisión general.",
    precio: 850
  },
  {
    id: "svc-demo-2",
    nombre: "Revisión de frenos",
    descripcion: "Revisión y mantenimiento del sistema de frenos.",
    precio: 1200
  },
  {
    id: "svc-demo-3",
    nombre: "Diagnóstico eléctrico",
    descripcion: "Revisión con scanner y pruebas eléctricas.",
    precio: 1500
  }
];

export function Servicios() {
  const [services, setServices] = useState(demoServices);
  const [form, setForm] = useState(emptyServiceForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
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
      const newService = {
        id: crypto.randomUUID(),
        ...cleanServiceForm(form)
      };
      setServices((current) => [newService, ...current]);
      setForm(emptyServiceForm());
      setMessage("Servicio agregado en modo demostración.");
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
          <article className="service-card" key={service.id}>
            <div>
              <span>Servicio</span>
              <strong>{service.nombre}</strong>
            </div>
            <p>{service.descripcion || "Sin descripción registrada"}</p>
            <footer>
              <span>Precio base</span>
              <strong>{formatCurrency(service.precio)}</strong>
            </footer>
          </article>
        ))}
      </section>
    </div>
  );
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
