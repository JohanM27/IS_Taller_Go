import { Metric } from "../components/Metric";

export function ModulePage({ eyebrow, title, metrics = [], rows = [] }) {
  return (
    <div className="page-stack">
      <section className="hero-band">
        <div>
          <span className="section-label">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        {metrics[0] && (
          <div className="hero-meta">
            <span>{metrics[0].label}</span>
            <strong>{metrics[0].value}</strong>
          </div>
        )}
      </section>

      <div className="metrics">
        {metrics.map((metric) => (
          <Metric
            alert={metric.alert}
            detail={metric.detail}
            key={metric.label}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </div>

      <section className="panel">
        <div className="module-list">
          {rows.map((row) => (
            <article className="module-row" key={row.title}>
              <div>
                <strong>{row.title}</strong>
                <span>{row.detail}</span>
              </div>
              <span className={`status ${row.tone ?? ""}`}>{row.status}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
