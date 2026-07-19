"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fechaLocalISO } from "@/lib/fecha";
import { IconButton } from "@/components/ui/IconButton";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
// Lunes primero. "X" para miércoles (desambigua el "M" duplicado del diseño).
const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

const dos = (n: number) => String(n).padStart(2, "0");
const isoDe = (y: number, m0: number, d: number) => `${y}-${dos(m0 + 1)}-${dos(d)}`;

/**
 * Calendario mensual del DS (vista pura). Semana en lunes; marca HOY (indigo suave) y el día
 * SELECCIONADO (indigo sólido). Los días anteriores a `min` quedan deshabilitados. `hoy` se puede
 * inyectar (tests); por defecto es la fecha local del navegador. Al elegir un día llama `onChange(iso)`.
 */
export function Calendario({
  value,
  onChange,
  min,
  hoy,
}: {
  value: string | null;
  onChange: (iso: string) => void;
  min?: string;
  hoy?: string;
}) {
  const hoyISO = hoy ?? fechaLocalISO(new Date());
  const base = value ?? hoyISO;
  const [ym, setYm] = useState(() => {
    const [y, m] = base.split("-").map(Number);
    return { y, m: m - 1 };
  });

  // Si la selección externa (p. ej. un atajo) cae en otro mes, navega el calendario a ese mes.
  useEffect(() => {
    if (!value) return;
    const [y, m] = value.split("-").map(Number);
    setYm((cur) => (cur.y === y && cur.m === m - 1 ? cur : { y, m: m - 1 }));
  }, [value]);

  const offset = (new Date(ym.y, ym.m, 1).getDay() + 6) % 7; // lunes = 0
  const diasEnMes = new Date(ym.y, ym.m + 1, 0).getDate();

  const irMes = (delta: number) =>
    setYm((c) => {
      const nm = c.m + delta;
      if (nm < 0) return { y: c.y - 1, m: 11 };
      if (nm > 11) return { y: c.y + 1, m: 0 };
      return { y: c.y, m: nm };
    });

  return (
    <div className="rounded-lg border border-slate-200 p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <IconButton label="Mes anterior" onClick={() => irMes(-1)}>
          <ChevronLeft size={18} />
        </IconButton>
        <div className="text-[13px] font-bold text-slate-900">
          {MESES[ym.m]} {ym.y}
        </div>
        <IconButton label="Mes siguiente" onClick={() => irMes(1)}>
          <ChevronRight size={18} />
        </IconButton>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {DIAS.map((d, i) => (
          <div
            key={i}
            className="py-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: diasEnMes }, (_, i) => i + 1).map((dia) => {
          const iso = isoDe(ym.y, ym.m, dia);
          const esSel = iso === value;
          const esHoy = iso === hoyISO;
          const deshabilitado = min !== undefined && iso < min;
          const estilo = esSel
            ? { background: "#4f46e5", color: "#fff" }
            : esHoy
              ? { background: "#eef2ff", color: "#4f46e5" }
              : undefined;
          return (
            <button
              key={dia}
              type="button"
              disabled={deshabilitado}
              aria-pressed={esSel}
              aria-label={iso}
              onClick={() => onChange(iso)}
              // Excepción táctil documentada (TAL-19): grilla densa de 7 columnas → alto 40px (no se
              // exige 44 de ancho para no desbordar a 320px); foco visible + separación adecuada.
              className={`mono flex h-10 items-center justify-center rounded-md text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border enabled:hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 ${
                esSel || esHoy ? "font-bold" : "text-slate-900"
              }`}
              style={estilo}
            >
              {dia}
            </button>
          );
        })}
      </div>
    </div>
  );
}
