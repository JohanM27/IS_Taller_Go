import { useEffect, useMemo, useState } from "react";
import { Notice } from "../components/Notice";
import { createRepuesto, getRepuestos, updateRepuesto } from "../services/repuestosService";
import { isSupabaseConfigured } from "../services/supabaseClient";
import { formatCurrency } from "../utils/formatters";

export function Inventario({ onInventoryChanged }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyRepuestoForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("Configura las variables de Supabase para cargar inventario real.");
      return;
    }

    loadInventory();
  }, []);

  const lowStockItems = useMemo(
    () => items.filter((item) => Number(item.stock) <= Number(item.stock_minimo)),
    [items]
  );

  async function loadInventory() {
    setLoading(true);
    setError("");

    try {
      const data = await getRepuestos();
      setItems(data);
    } catch (loadError) {
      setError(`No se pudo cargar el inventario: ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!form.codigo.trim() || !form.nombre.trim() || !form.precio_venta) {
      setError("Código, nombre y precio de venta son obligatorios.");
      return;
    }

    if (!isSupabaseConfigured) {
      setError("No se puede guardar el repuesto porque Supabase no está configurado.");
      return;
    }

    setSaving(true);

    try {
      await createRepuesto(cleanRepuestoForm(form));
      setForm(emptyRepuestoForm());
      setMessage("Repuesto guardado correctamente.");
      await loadInventory();
      await onInventoryChanged?.();
    } catch (insertError) {
      setError(`No se pudo guardar el repuesto: ${insertError.message}`);
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
          <span className="section-label">Almacén</span>
          <h2>Inventario crítico</h2>
        </div>
        <div className="hero-meta warning">
          <span>Stock bajo</span>
          <strong>{loading ? "..." : `${lowStockItems.length} repuestos`}</strong>
        </div>
      </section>

      <section className="panel form-panel">
        <h2>Registro de repuesto</h2>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span className="field-label">Código <span className="required">*</span></span>
            <input
              value={form.codigo}
              onChange={(event) => updateField("codigo", event.target.value)}
              placeholder="REP-005"
              required
            />
          </label>
          <label>
            <span className="field-label">Nombre <span className="required">*</span></span>
            <input
              value={form.nombre}
              onChange={(event) => updateField("nombre", event.target.value)}
              placeholder="Filtro de aire"
              required
            />
          </label>
          <label>
            Costo
            <input
              value={form.costo}
              onChange={(event) => updateField("costo", event.target.value)}
              min="0"
              placeholder="120.00"
              step="0.01"
              type="number"
            />
          </label>
          <label>
            <span className="field-label">Precio de venta <span className="required">*</span></span>
            <input
              value={form.precio_venta}
              onChange={(event) => updateField("precio_venta", event.target.value)}
              min="0"
              placeholder="220.00"
              required
              step="0.01"
              type="number"
            />
          </label>
          <label>
            Stock
            <input
              value={form.stock}
              onChange={(event) => updateField("stock", event.target.value)}
              min="0"
              placeholder="10"
              type="number"
            />
          </label>
          <label>
            Stock mínimo
            <input
              value={form.stock_minimo}
              onChange={(event) => updateField("stock_minimo", event.target.value)}
              min="0"
              placeholder="3"
              type="number"
            />
            <small>La alerta aparece al llegar al mínimo. Con 0, avisa al agotarse.</small>
          </label>
          <div className="form-actions field-wide">
            {message && <Notice type="success">{message}</Notice>}
            {error && <Notice type="error">{error}</Notice>}
            <button className="primary-action" disabled={saving} type="submit">
              {saving ? "Guardando..." : "Guardar repuesto"}
            </button>
          </div>
        </form>
      </section>

      <section className="inventory-grid">
        {items.map((item) => (
          <InventoryCard item={item} key={item.id ?? item.codigo} onSaved={async () => {
            await loadInventory();
            await onInventoryChanged?.();
          }} />
        ))}
      </section>
    </div>
  );
}

function InventoryCard({ item, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ nombre: "", stock: "", stock_minimo: "", precio_venta: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEditing(event) {
    event.preventDefault();
    setDraft({ nombre: item.nombre, stock: String(item.stock), stock_minimo: String(item.stock_minimo), precio_venta: String(item.precio_venta) });
    setError("");
    setEditing(true);
  }

  async function saveChanges(event) {
    event.preventDefault();
    if (!editing || saving) return;
    const stock = Number(draft.stock);
    const minimum = Number(draft.stock_minimo);
    const precio = Number(draft.precio_venta);
    if (draft.precio_venta === "" || !Number.isFinite(precio) || precio < 0 || !draft.nombre.trim() || draft.stock === "" || draft.stock_minimo === "" ||
        !Number.isInteger(stock) || stock < 0 || !Number.isInteger(minimum) || minimum < 0) {
      setError("Escribe un nombre, un precio no negativo y cantidades enteras iguales o mayores que 0.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateRepuesto(item.id, { nombre: draft.nombre.trim(), stock, stock_minimo: minimum, precio_venta: precio });
      await onSaved();
      setEditing(false);
    } catch (saveError) {
      setError(`No se pudieron guardar los cambios: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  }

  const stock = Number(item.stock ?? 0);
  const minimum = Number(item.stock_minimo ?? 0);
  const percentage = stock === 0 ? 0 : minimum > 0 ? Math.min(100, (stock / minimum) * 100) : 100;
  const lowStock = stock <= minimum;

  return (
    <form className={`inventory-card${lowStock ? " is-low" : ""}`} onSubmit={saveChanges}>
      <div>
        <span>{item.codigo}</span>
        <strong className="inventory-name">
          {editing ? (
            <input className="inventory-inline-input" aria-label="Nombre" value={draft.nombre} disabled={saving} required
              onChange={(event) => setDraft({ ...draft, nombre: event.target.value })} />
          ) : item.nombre}
        </strong>
      </div>
      <div className="stock-meter">
        <span style={{ width: `${percentage}%` }} />
      </div>
      <dl className="inventory-details">
        <div>
          <dt>Stock</dt>
          <dd>{editing ? (
            <input className="inventory-inline-input" aria-label="Stock actual" type="number" min="0" step="1" value={draft.stock} disabled={saving} required
              onChange={(event) => setDraft({ ...draft, stock: event.target.value })} />
          ) : stock}</dd>
        </div>
        <div>
          <dt>Mínimo</dt>
          <dd>{editing ? (
            <input className="inventory-inline-input" aria-label="Stock mínimo" title="Con 0, avisa al agotarse." type="number" min="0" step="1" value={draft.stock_minimo} disabled={saving} required
              onChange={(event) => setDraft({ ...draft, stock_minimo: event.target.value })} />
          ) : minimum}</dd>
        </div>
        <div>
          <dt>Venta {editing ? "(L)" : ""}</dt>
          <dd>{editing ? (
            <input className="inventory-inline-input" aria-label="Precio de venta en lempiras" type="number" min="0" step="0.01" value={draft.precio_venta} disabled={saving} required
              onChange={(event) => setDraft({ ...draft, precio_venta: event.target.value })} />
          ) : formatCurrency(item.precio_venta)}</dd>
        </div>
      </dl>
      <p>{lowStock ? "Revisar existencia" : "Inventario estable"}</p>
      {error && <Notice type="error">{error}</Notice>}
      <div className="inventory-actions">
        {editing ? (
          <>
            <button key="guardar" className="primary-action" type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button className="ghost-action" type="button" disabled={saving} onClick={() => { setEditing(false); setError(""); }}>
              Cancelar
            </button>
          </>
        ) : (
          <button key="editar" className="ghost-action" type="button" onClick={startEditing} aria-label={`Editar ${item.nombre}`}>
            Editar
          </button>
        )}
      </div>
    </form>
  );
}

function emptyRepuestoForm() {
  return {
    codigo: "",
    nombre: "",
    costo: "",
    precio_venta: "",
    stock: "",
    stock_minimo: ""
  };
}

function cleanRepuestoForm(form) {
  return {
    codigo: form.codigo.trim().toUpperCase(),
    nombre: form.nombre.trim(),
    costo: form.costo ? Number(form.costo) : 0,
    precio_venta: Number(form.precio_venta),
    stock: form.stock ? Number(form.stock) : 0,
    stock_minimo: form.stock_minimo ? Number(form.stock_minimo) : 1
  };
}
