"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Bell } from "lucide-react";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Calendario } from "@/components/ui/Calendario";
import { fechaLocalISO, mediodiaLocalMs, sumarDiasISO } from "@/lib/fecha";

/** Datos que emite el form. `fecha_objetivo` = mediodía local del día elegido (ms). */
export type SeguimientoDatos = { fecha_objetivo: number; motivo?: string };

const MAX_MOTIVO = 2000;
const ATAJOS: { label: string; dias: number }[] = [
  { label: "Mañana", dias: 1 },
  { label: "En 3 días", dias: 3 },
  { label: "En 1 semana", dias: 7 },
];

/**
 * Formulario P7 (vista pura, testeable). El contenedor pasa `guardando` y recibe los datos por
 * `onSubmit`; no conoce Convex. Sin selección por defecto (como el diseño): el submit exige elegir
 * fecha. Los atajos y el calendario están sincronizados (elegir atajo mueve la selección; tocar un
 * día activa "Elegir fecha"). El pasado queda deshabilitado en el calendario (`min = hoy`).
 */
export function SeguimientoForm({
  guardando,
  onCancel,
  onSubmit,
  hoy,
}: {
  guardando: boolean;
  onCancel: () => void;
  onSubmit: (datos: SeguimientoDatos) => void;
  hoy?: string;
}) {
  const hoyISO = hoy ?? fechaLocalISO(new Date());
  const [sel, setSel] = useState<string | null>(null);
  const [atajo, setAtajo] = useState<string>("");
  const [motivo, setMotivo] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const elegirAtajo = (label: string, dias: number) => {
    setAtajo(label);
    setSel(sumarDiasISO(hoyISO, dias));
    setErr(null);
  };
  const elegirDia = (iso: string) => {
    setSel(iso);
    setAtajo("Elegir fecha");
    setErr(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    if (!sel) {
      setErr("Elige una fecha para el seguimiento");
      return;
    }
    onSubmit({ fecha_objetivo: mediodiaLocalMs(sel), motivo: motivo.trim() || undefined });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {/* ¿Cuándo? — atajos rápidos */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-slate-700">¿Cuándo?</span>
        <div className="flex flex-wrap gap-2">
          {ATAJOS.map((a) => (
            <ChipAtajo key={a.label} activo={atajo === a.label} onClick={() => elegirAtajo(a.label, a.dias)}>
              {a.label}
            </ChipAtajo>
          ))}
          <ChipAtajo activo={atajo === "Elegir fecha"} onClick={() => setAtajo("Elegir fecha")}>
            Elegir fecha
          </ChipAtajo>
        </div>
      </div>

      {/* Calendario (siempre visible) */}
      <Calendario value={sel} onChange={elegirDia} min={hoyISO} hoy={hoyISO} />

      {/* Motivo (opcional) */}
      <Textarea
        label="Motivo"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="¿De qué tratará el seguimiento?"
        rows={3}
        maxLength={MAX_MOTIVO}
      />

      {/* Banner: aparecerá en la Agenda */}
      <div
        className="flex items-start gap-2 rounded-md border px-3 py-2.5 text-xs leading-relaxed text-slate-600"
        style={{ background: "#fffbeb", borderColor: "#fef3c7" }}
      >
        <Bell size={14} className="mt-0.5 flex-none" style={{ color: "#F59E0B" }} aria-hidden="true" />
        <span>
          Aparecerá en tu <span className="font-bold text-slate-900">Agenda (Hoy)</span> ese día.
        </span>
      </div>

      {err && <p className="text-[13px] font-semibold text-danger">{err}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={guardando}>
          {guardando ? "Guardando…" : "Agendar seguimiento"}
        </Button>
      </div>
    </form>
  );
}

function ChipAtajo({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className="inline-flex min-h-9 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors"
      style={
        activo
          ? { borderColor: "#4f46e5", color: "#fff", background: "#4f46e5" }
          : { borderColor: "#cbd5e1", color: "#475569", background: "transparent" }
      }
    >
      {children}
    </button>
  );
}
