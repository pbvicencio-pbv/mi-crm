import type { BadgeTono } from "@/components/ui/Badge";

/**
 * Utilidades de cliente para la Agenda del día (TAL-16). El servidor calcula los
 * intervalos; aquí solo derivamos { timeZone, fechaLocal } y el temporizador de
 * medianoche. Todo es TZ-aware vía Intl (testeable con zona explícita).
 */

/** Estado del cliente → etiqueta + tono del Badge. */
export const ESTADO_CLIENTE_UI: Record<string, { label: string; tone: BadgeTono }> = {
  nuevo_lead: { label: "Nuevo lead", tone: "neutral" },
  en_negociacion: { label: "En negociación", tone: "warning" },
  ganado: { label: "Ganado", tone: "success" },
  perdido: { label: "Perdido", tone: "danger" },
};

/** Zona horaria del navegador (fallback UTC si falta/es inválida). */
export function zonaHoraria(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** "YYYY-MM-DD" del instante `now` en la zona `timeZone`. */
export function fechaLocal(now: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
}

/** Offset (horaLocal − horaUTC) en ms para el instante `utcMs` en `timeZone`. */
function offsetMs(timeZone: string, utcMs: number): number {
  const p: Record<string, number> = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs))) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  const hour = p.hour === 24 ? 0 : p.hour;
  return Date.UTC(p.year, p.month - 1, p.day, hour, p.minute, p.second) - utcMs;
}

/** ms hasta la próxima medianoche local (para reprogramar la agenda al cambiar de día). */
export function msHastaProximaMedianoche(now: number, timeZone: string): number {
  const [y, m, d] = fechaLocal(now, timeZone).split("-").map(Number);
  const mananaNaive = Date.UTC(y, m - 1, d + 1, 0, 0, 0);
  const off1 = offsetMs(timeZone, mananaNaive);
  let medianoche = mananaNaive - off1;
  const off2 = offsetMs(timeZone, medianoche);
  if (off2 !== off1) medianoche = mananaNaive - off2; // borde DST
  return Math.max(1000, medianoche - now);
}
