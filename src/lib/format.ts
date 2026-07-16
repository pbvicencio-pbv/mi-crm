/**
 * Helpers de formato del CRM. Las cifras y fechas se muestran en JetBrains Mono
 * (clase `.mono`, cifras tabulares) según el design system.
 */

/** Importe en dólares con el formato del PRD: $1,200.50 */
export function formatMoney(importe: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(importe);
}

/** Abrevia importes grandes para KPIs: $284K, $1.28M */
export function formatMoneyShort(importe: number): string {
  const abs = Math.abs(importe);
  if (abs >= 1_000_000) return `$${(importe / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${Math.round(importe / 1_000)}K`;
  return formatMoney(importe);
}

/** Fecha corta en es-MX: "12 mar 2026" */
export function formatFecha(ts: number): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(ts));
}

/** Total de una venta (derivado). */
export function totalVenta(importe: number, cantidad: number): number {
  return importe * cantidad;
}

/** Hora local corta en 24h: "10:30". */
export function formatHora(ts: number): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ts));
}

/** Fecha relativa de la agenda: "Hoy 10:30", "Ayer 17:40", "2 jul 14:00". */
export function formatAgendaFecha(ts: number, now: number): string {
  const inicioDia = (t: number) => {
    const d = new Date(t);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  const dias = Math.round((inicioDia(ts) - inicioDia(now)) / 86_400_000);
  const hora = formatHora(ts);
  if (dias === 0) return `Hoy ${hora}`;
  if (dias === -1) return `Ayer ${hora}`;
  if (dias === 1) return `Mañana ${hora}`;
  const fecha = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(
    new Date(ts),
  );
  return `${fecha} ${hora}`;
}
