import { formatCurrency } from "../utils/formatters";

export function Saldo({ value }) {
  const saldo = Number(value ?? 0);

  if (saldo < 0) {
    return <span className="saldo saldo-cambio">Cambio: {formatCurrency(Math.abs(saldo))}</span>;
  }

  if (saldo > 0) {
    return <span className="saldo saldo-pendiente">Pendiente: {formatCurrency(saldo)}</span>;
  }

  return <span className="saldo saldo-pagado">Pagado</span>;
}
