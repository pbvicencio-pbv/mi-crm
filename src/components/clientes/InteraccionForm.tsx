"use client";

import { useState, type FormEvent } from "react";
import { Phone, MessageCircle, MapPin, Info } from "lucide-react";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { fechaLocalISO, mediodiaLocalMs } from "@/lib/fecha";

type Tipo = "llamada" | "mensaje" | "visita";
type Canal = "whatsapp" | "email" | "telefono" | "instagram";

/** Datos que emite el form. `fecha` ausente = hoy (el servidor usa `Date.now()`). */
export type InteraccionDatos = {
  tipo: Tipo;
  canal?: Canal;
  nota?: string;
  fecha?: number;
};

const MAX_NOTA = 2000;

const TIPOS: { value: Tipo; label: string; icon: React.ReactNode }[] = [
  { value: "llamada", label: "Llamada", icon: <Phone size={16} /> },
  { value: "mensaje", label: "Mensaje", icon: <MessageCircle size={16} /> },
  { value: "visita", label: "Visita", icon: <MapPin size={16} /> },
];
const CANALES: { value: Canal; label: string; color: string }[] = [
  { value: "whatsapp", label: "WhatsApp", color: "#25D366" },
  { value: "email", label: "Email", color: "#3B82F6" },
  { value: "telefono", label: "Teléfono", color: "#64748B" },
  { value: "instagram", label: "Instagram", color: "#C13584" },
];
const CANAL_LABEL: Record<Canal, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  telefono: "Teléfono",
  instagram: "Instagram",
};

/** Medio mostrado (banda "Se registrará como …"): visita→En persona, llamada→Llamada, mensaje→canal|Mensaje. */
function medioDerivado(tipo: Tipo, canal: Canal | ""): string {
  if (tipo === "visita") return "En persona";
  if (tipo === "llamada") return "Llamada";
  return canal ? CANAL_LABEL[canal] : "Mensaje";
}

/**
 * Formulario P6 (vista pura, testeable). El contenedor le pasa `guardando` y recibe los datos por
 * `onSubmit`; no conoce Convex. Contrato de fecha: si el usuario no cambia el día (sigue siendo hoy)
 * NO se envía `fecha` (el servidor pone `Date.now()`); si lo cambia, se envía el mediodía local de ese día.
 */
export function InteraccionForm({
  guardando,
  onCancel,
  onSubmit,
}: {
  guardando: boolean;
  onCancel: () => void;
  onSubmit: (datos: InteraccionDatos) => void;
}) {
  const hoy = fechaLocalISO(new Date());
  const [tipo, setTipo] = useState<Tipo>("llamada");
  const [canal, setCanal] = useState<Canal | "">("");
  const [nota, setNota] = useState("");
  const [fecha, setFecha] = useState(hoy);

  const medio = medioDerivado(tipo, canal);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    const notaLimpia = nota.trim();
    onSubmit({
      tipo,
      canal: tipo === "mensaje" && canal ? canal : undefined,
      nota: notaLimpia || undefined,
      // Sin cambio → no enviar fecha (server usa Date.now()); cambiada → mediodía local.
      fecha: fecha === hoy ? undefined : mediodiaLocalMs(fecha),
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {/* Tipo — segmentado */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-slate-700">Tipo</span>
        <div className="flex gap-2">
          {TIPOS.map((t) => {
            const sel = tipo === t.value;
            return (
              <button
                key={t.value}
                type="button"
                aria-pressed={sel}
                onClick={() => setTipo(t.value)}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border text-[13px] font-semibold transition-colors"
                style={
                  sel
                    ? { borderColor: "#4f46e5", color: "#4f46e5", background: "#4f46e514" }
                    : { borderColor: "#cbd5e1", color: "#475569", background: "transparent" }
                }
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Nota — campo principal */}
      <Textarea
        label="¿Qué pasó?"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Describe brevemente la conversación o el resultado"
        rows={5}
        maxLength={MAX_NOTA}
      />

      {/* Fecha — hoy por defecto, editable, sin futuro */}
      <Input
        label="Fecha"
        type="date"
        value={fecha}
        max={hoy}
        onChange={(e) => setFecha(e.target.value || hoy)}
      />

      {/* Canal — chip único (toggle), opcional */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-slate-700">Canal</span>
        <div className="flex flex-wrap gap-2">
          {CANALES.map((c) => {
            const sel = canal === c.value;
            return (
              <button
                key={c.value}
                type="button"
                aria-pressed={sel}
                onClick={() => setCanal(sel ? "" : c.value)}
                className="inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition-colors"
                style={
                  sel
                    ? { borderColor: c.color, color: c.color, background: `${c.color}14` }
                    : { borderColor: "#cbd5e1", color: "#475569", background: "transparent" }
                }
              >
                <span className="h-2 w-2 flex-none rounded-full" style={{ background: c.color }} />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Banda: medio derivado */}
      <div
        role="status"
        className="flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2.5 text-xs text-slate-600"
      >
        <Info size={14} className="flex-none text-slate-400" aria-hidden="true" />
        <span>
          Se registrará como <span className="font-bold text-slate-900">{medio}</span>
        </span>
      </div>

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar interacción"}
        </Button>
      </div>
    </form>
  );
}
