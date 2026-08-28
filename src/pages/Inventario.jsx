import { useEffect, useMemo, useState } from "react";
import { Notice } from "../components/Notice";
import { createRepuesto, getRepuestos } from "../services/repuestosService";
import { isSupabaseConfigured } from "../services/supabaseClient";
import { formatCurrency } from "../utils/formatters";

const demoItems = [
  { id: "rep-demo-1", codigo: "REP-001", nombre: "Filtro de aceite", costo: 120, precio_venta: 220, stock: 3, stock_minimo: 5 },
  { id: "rep-demo-2", codigo: "REP-002", nombre: "Pastillas de freno", costo: 650, precio_venta: 980, stock: 2, stock_minimo: 4 },
  { id: "rep-demo-3", codigo: "REP-003", nombre: "Bujías", costo: 85, precio_venta: 150, stock: 6, stock_minimo: 8 }
];

export function Inventario({ onInventoryChanged }) {
  const [items, setItems] = useState(demoItems);
  const [form, setForm] = useState(emptyRepuestoForm());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
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
      const newItem = {
        id: crypto.randomUUID(),
        ...cleanRepuestoForm(form)
      };
      setItems((current) => [newItem, ...current]);
      setForm(emptyRepuestoForm());
      setMessage("Repuesto agregado en modo demostración.");
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
          <InventoryCard item={item} key={item.id ?? item.codigo} />
        ))}
      </section>
    </div>
  );
}

function InventoryCard({ item }) {
  const stock = Number(item.stock ?? 0);
  const minimum = Number(item.stock_minimo ?? 0);
  const percentage = minimum > 0 ? Math.min(100, (stock / minimum) * 100) : 100;
  const lowStock = stock <= minimum;

  return (
    <article className={`inventory-card${lowStock ? " is-low" : ""}`}>
      <div>
        <span>{item.codigo}</span>
        <strong>{item.nombre}</strong>
      </div>
      <div className="stock-meter">
        <span style={{ width: `${percentage}%` }} />
      </div>
      <dl className="inventory-details">
        <div>
          <dt>Stock</dt>
          <dd>{stock}</dd>
        </div>
        <div>
          <dt>Mínimo</dt>
          <dd>{minimum}</dd>
        </div>
        <div>
          <dt>Venta</dt>
          <dd>{formatCurrency(item.precio_venta)}</dd>
        </div>
      </dl>
      <p>{lowStock ? "Revisar existencia" : "Inventario estable"}</p>
    </article>
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
