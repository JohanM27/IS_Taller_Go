const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Tegucigalpa", year: "numeric", month: "2-digit", day: "2-digit"
});

export function dateKey(value = new Date()) {
  const parts = Object.fromEntries(dateFormatter.formatToParts(new Date(value)).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function displayDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function withinDates(timestamp, from, to) {
  if (!timestamp) return false;
  const day = dateKey(timestamp);
  return (!from || day >= from) && (!to || day <= to);
}

export function paymentTotal(payments) {
  return payments.reduce((total, payment) => total + Math.round(Number(payment.monto) * 100), 0) / 100;
}

export function dailyIncome(payments) {
  const groups = new Map();
  payments.forEach((payment) => {
    const day = dateKey(payment.pagado_en);
    const group = groups.get(day) ?? { day, cents: 0, count: 0 };
    group.cents += Math.round(Number(payment.monto) * 100);
    group.count += 1;
    groups.set(day, group);
  });
  return [...groups.values()].sort((a, b) => b.day.localeCompare(a.day));
}
