import { useEffect, useState } from "react";
import { Notice } from "../components/Notice";
import { demoVehicles } from "../data/demoData";
import { isSupabaseConfigured } from "../services/supabaseClient";
import { getVehiculos } from "../services/vehiculosService";

export function Vehiculos() {
  const [vehicles, setVehicles] = useState(demoVehicles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    loadVehicles();
  }, []);

  async function loadVehicles() {
    setLoading(true);
    setError("");

    try {
      const data = await getVehiculos();
      setVehicles(data);
    } catch (loadError) {
      setError(`No se pudieron cargar los vehículos: ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-band">
        <div>
          <span className="section-label">Vehículos</span>
          <h2>Registro e historial vehicular</h2>
        </div>
        <div className="hero-meta">
          <span>Registrados</span>
          <strong>{loading ? "..." : vehicles.length}</strong>
        </div>
      </section>

      {error && <Notice type="error">{error}</Notice>}

      <section className="panel">
        <div className="panel-heading">
          <h2>Vehículos registrados</h2>
          <span className="count-pill">{loading ? "Cargando..." : `${vehicles.length} activos`}</span>
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
