import { ConvexError } from "convex/values";

/**
 * Cálculo DST-safe de los intervalos de la Agenda del día (TAL-16).
 *
 * El cliente envía { timeZone, fechaLocal } (NO timestamps): el SERVIDOR calcula
 * inicioHoy/finHoy/hasta y valida que `fechaLocal` esté cerca del día actual del
 * servidor EN LA ZONA pedida. Así el cliente no puede falsear los límites.
 *
 * Intervalos (semiabiertos, sin solape en medianoche):
 *   Vencidos:  fecha < inicioHoy
 *   Hoy:       inicioHoy <= fecha < finHoy
 *   Próximas:  finHoy <= fecha <= hasta
 */

export const HORIZONTE_DIAS_DEFAULT = 30;
export const MAX_HORIZONTE_DIAS = 60;
const MAX_DESFASE_DIAS = 2; // fechaLocal a ±2 días del día del servidor en la zona
const MS_DIA = 86_400_000;
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export type Intervalos = { inicioHoy: number; finHoy: number; hasta: number };
type YMD = { y: number; m: number; d: number };

function esZonaValida(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Offset (horaLocal − horaUTC) en ms para el instante `utcMs` en la zona `tz`. */
function offsetMs(tz: string, utcMs: number): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const m: Record<string, number> = {};
  for (const p of dtf.formatToParts(new Date(utcMs))) {
    if (p.type !== "literal") m[p.type] = Number(p.value);
  }
  const hour = m.hour === 24 ? 0 : m.hour; // algunas plataformas devuelven "24"
  const asUTC = Date.UTC(m.year, m.month - 1, m.day, hour, m.minute, m.second);
  return asUTC - utcMs;
}

/** UTC (ms) de la medianoche local (00:00 en `tz`) de la fecha calendario y-m-d. */
function medianocheLocalUtc(f: YMD, tz: string): number {
  const naive = Date.UTC(f.y, f.m - 1, f.d, 0, 0, 0);
  const off1 = offsetMs(tz, naive);
  let utc = naive - off1;
  const off2 = offsetMs(tz, utc);
  if (off2 !== off1) utc = naive - off2; // corrige en el borde de una transición DST
  return utc;
}

/** Fecha calendario del instante `utcMs` en la zona `tz`. */
function fechaEnZona(tz: string, utcMs: number): YMD {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const m: Record<string, number> = {};
  for (const p of dtf.formatToParts(new Date(utcMs))) {
    if (p.type !== "literal") m[p.type] = Number(p.value);
  }
  return { y: m.year, m: m.month, d: m.day };
}

function parseFecha(fechaLocal: string): YMD {
  if (typeof fechaLocal !== "string" || !RE_FECHA.test(fechaLocal)) {
    throw new ConvexError("fechaLocal inválida (se espera YYYY-MM-DD)");
  }
  const [y, m, d] = fechaLocal.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    throw new ConvexError("fechaLocal no corresponde a una fecha real");
  }
  return { y, m, d };
}

function diffDias(a: YMD, b: YMD): number {
  return Math.round((Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(b.y, b.m - 1, b.d)) / MS_DIA);
}

/** Suma `n` días calendario a una fecha (maneja fin de mes/año). */
function sumarDias(f: YMD, n: number): YMD {
  const dt = new Date(Date.UTC(f.y, f.m - 1, f.d + n));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

/**
 * Calcula (y valida) los intervalos de la agenda. Rechaza argumentos incoherentes
 * con ConvexError en lugar de corregirlos en silencio.
 */
export function calcularIntervalos(
  args: { timeZone: string; fechaLocal: string; horizonteDias?: number },
  serverNowMs: number,
): Intervalos {
  const { timeZone, fechaLocal } = args;
  const horizonteDias = args.horizonteDias ?? HORIZONTE_DIAS_DEFAULT;

  if (typeof timeZone !== "string" || !esZonaValida(timeZone)) {
    throw new ConvexError("timeZone inválida");
  }
  if (
    !Number.isSafeInteger(horizonteDias) ||
    horizonteDias < 1 ||
    horizonteDias > MAX_HORIZONTE_DIAS
  ) {
    throw new ConvexError(`horizonteDias fuera de rango (1..${MAX_HORIZONTE_DIAS})`);
  }

  const hoy = parseFecha(fechaLocal);
  const hoyServidor = fechaEnZona(timeZone, serverNowMs);
  if (Math.abs(diffDias(hoy, hoyServidor)) > MAX_DESFASE_DIAS) {
    throw new ConvexError("fechaLocal demasiado lejos del día actual del servidor");
  }

  const inicioHoy = medianocheLocalUtc(hoy, timeZone);
  const finHoy = medianocheLocalUtc(sumarDias(hoy, 1), timeZone);
  // `hasta` = último ms del último día incluido (hoy + horizonteDias).
  const hasta = medianocheLocalUtc(sumarDias(hoy, horizonteDias + 1), timeZone) - 1;

  if (!(inicioHoy < finHoy && finHoy <= hasta)) {
    throw new ConvexError("intervalos calculados incoherentes");
  }
  return { inicioHoy, finHoy, hasta };
}
