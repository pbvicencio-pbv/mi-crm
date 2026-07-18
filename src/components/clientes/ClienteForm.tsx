"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

type Canal = "whatsapp" | "instagram" | "telefono" | "email";
type Origen = "recomendacion" | "campana" | "sitio_web" | "evento" | "otro";
type Prioridad = "alta" | "media" | "baja";

export type ClienteInicial = {
  _id: Id<"clientes">;
  nombre: string;
  telefono?: string;
  email?: string;
  empresa?: string;
  cargo?: string;
  ciudad?: string;
  canal?: Canal;
  origen?: Origen;
  notas?: string;
  prioridad: Prioridad;
  propietario: Id<"usuarios">;
};

const CANALES: { value: Canal; label: string; color: string }[] = [
  { value: "whatsapp", label: "WhatsApp", color: "#25D366" },
  { value: "instagram", label: "Instagram", color: "#C13584" },
  { value: "telefono", label: "Teléfono", color: "#64748B" },
  { value: "email", label: "Email", color: "#3B82F6" },
];
const ORIGEN_OPTS = [
  { value: "recomendacion", label: "Recomendación" },
  { value: "campana", label: "Campaña" },
  { value: "sitio_web", label: "Sitio web" },
  { value: "evento", label: "Evento" },
  { value: "otro", label: "Otro" },
];
const PRIORIDADES: { value: Prioridad; label: string; color: string }[] = [
  { value: "alta", label: "Alta", color: "#DC2626" },
  { value: "media", label: "Media", color: "#F59E0B" },
  { value: "baja", label: "Baja", color: "#64748B" },
];

function mensajeError(e: unknown): string {
  const d = (e as { data?: unknown } | null)?.data;
  return typeof d === "string" ? d : "No se pudo guardar el cliente";
}

export function ClienteForm({ modo, inicial }: { modo: "alta" | "edicion"; inicial?: ClienteInicial }) {
  const router = useRouter();
  const yo = useQuery(api.usuarios.actual);
  const opciones = useQuery(api.usuarios.opcionesAsignacion);
  const crear = useMutation(api.clientes.crearCliente);
  const actualizar = useMutation(api.clientes.actualizarCliente);

  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [telefono, setTelefono] = useState(inicial?.telefono ?? "");
  const [email, setEmail] = useState(inicial?.email ?? "");
  const [empresa, setEmpresa] = useState(inicial?.empresa ?? "");
  const [cargo, setCargo] = useState(inicial?.cargo ?? "");
  const [ciudad, setCiudad] = useState(inicial?.ciudad ?? "");
  const [canal, setCanal] = useState<Canal | "">(inicial?.canal ?? "");
  const [origen, setOrigen] = useState<Origen | "">(inicial?.origen ?? "");
  const [prioridad, setPrioridad] = useState<Prioridad>(inicial?.prioridad ?? "media");
  const [propietario, setPropietario] = useState<string>(inicial?.propietario ?? "");
  const [notas, setNotas] = useState(inicial?.notas ?? "");

  const [err, setErr] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // En alta, el propietario por defecto es el usuario actual (una vez cargado).
  useEffect(() => {
    if (modo === "alta" && !propietario && yo) setPropietario(yo._id);
  }, [modo, propietario, yo]);

  const esAlta = modo === "alta";
  const cargando = opciones === undefined || (esAlta && yo === undefined);

  if (cargando) return <FormSkeleton />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErr("El nombre es obligatorio");
      return;
    }
    setErr(null);
    setGuardando(true);
    const base = {
      nombre: nombre.trim(),
      telefono: telefono.trim() || undefined,
      email: email.trim() || undefined,
      empresa: empresa.trim() || undefined,
      cargo: cargo.trim() || undefined,
      ciudad: ciudad.trim() || undefined,
      canal: canal || undefined,
      origen: origen || undefined,
      notas: notas.trim() || undefined,
      prioridad,
    };
    try {
      if (esAlta) {
        const id = await crear({
          ...base,
          propietario: propietario ? (propietario as Id<"usuarios">) : undefined,
        });
        router.push(`/clientes/${id}`);
      } else {
        await actualizar({ id: inicial!._id, ...base, propietario: propietario as Id<"usuarios"> });
        router.push(`/clientes/${inicial!._id}`);
      }
    } catch (e2) {
      setErr(mensajeError(e2));
      setGuardando(false); // permanece en el form
    }
  };

  const propietarioOpts = (opciones ?? []).map((o) => ({ value: o._id, label: o.nombre }));

  return (
    <form
      onSubmit={submit}
      noValidate
      className="animate-in mx-auto flex max-w-[560px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
    >
      <div className="border-b border-slate-100 px-5 py-4">
        <h1 className="text-base font-extrabold tracking-tight text-slate-900">
          {esAlta ? "Nuevo cliente" : "Editar cliente"}
        </h1>
      </div>

      <div className="flex flex-col gap-4 px-5 py-5">
        <Input
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre y apellidos"
          error={!!err && !nombre.trim()}
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+52 55 0000 0000" inputMode="tel" />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@empresa.mx" />
        </div>

        <Input label="Empresa (opcional)" value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Nombre de la empresa" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Cargo (opcional)" value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Puesto o rol" />
          <Input label="Ciudad (opcional)" value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Ciudad" />
        </div>

        {/* Red / canal — chip único (toggle) */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-slate-700">Red / canal</span>
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

        <Select
          label="Origen (opcional)"
          options={ORIGEN_OPTS}
          value={origen}
          onChange={(e) => setOrigen(e.target.value as Origen | "")}
          placeholder="Selecciona un origen"
        />

        <Select
          label="Propietario"
          options={propietarioOpts}
          value={propietario}
          onChange={(e) => setPropietario(e.target.value)}
        />

        {/* Prioridad — segmentado */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-slate-700">Prioridad</span>
          <div className="flex gap-2">
            {PRIORIDADES.map((p) => {
              const sel = prioridad === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  aria-pressed={sel}
                  onClick={() => setPrioridad(p.value)}
                  className="flex h-10 flex-1 items-center justify-center rounded-lg border text-[13px] font-semibold transition-colors"
                  style={
                    sel
                      ? { borderColor: p.color, color: p.color, background: `${p.color}14` }
                      : { borderColor: "#cbd5e1", color: "#475569", background: "transparent" }
                  }
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <Textarea label="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Añade una nota sobre este cliente" rows={3} />

        {err && <p className="text-[13px] font-semibold text-danger">{err}</p>}
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={guardando}>
          {guardando ? "Guardando…" : esAlta ? "Guardar cliente" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

function FormSkeleton() {
  return (
    <div className="animate-pulse mx-auto flex max-w-[560px] flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="h-5 w-40 rounded bg-slate-200" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-11 w-full rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}
