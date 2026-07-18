/**
 * Helpers de fecha en la ZONA LOCAL DEL NAVEGADOR (usan el `Date` nativo del dispositivo), para los
 * formularios de captura (interacción P6, seguimiento P7). Deliberadamente distintos de
 * `src/lib/agenda.ts`, que es TZ-aware (IANA vía `Intl`) para clasificar la Agenda del día: NO
 * mezclar ambas semánticas. Aquí "local" = la hora del navegador, que es la que el usuario ve al
 * elegir una fecha en el formulario.
 */

/** "YYYY-MM-DD" de una fecha en hora local del navegador (para `<input type="date">` y comparaciones). */
export function fechaLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Un día "YYYY-MM-DD" → ms del MEDIODÍA local (hora estable; evita "00:00" y bordes de TZ/medianoche). */
export function mediodiaLocalMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
}

/** Suma `dias` a un "YYYY-MM-DD" (aritmética de calendario local, con acarreo de mes/año) → "YYYY-MM-DD". */
export function sumarDiasISO(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return fechaLocalISO(new Date(y, m - 1, d + dias));
}
