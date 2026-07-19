import type { ReactNode } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Pencil,
  Plus,
  Check,
  Clock,
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  Trash2,
} from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, type BadgeTono } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatFecha, formatMoneyShort, formatAgendaFecha } from "@/lib/format";

type Canal = "whatsapp" | "instagram" | "telefono" | "email";
type Prioridad = "alta" | "media" | "baja";
type Estado = "nuevo_lead" | "en_negociacion" | "ganado" | "perdido";
type Origen = "recomendacion" | "campana" | "sitio_web" | "evento" | "otro";
type TipoInteraccion = "llamada" | "mensaje" | "visita";

/** Forma de la ficha (espejo del validador de `clientes.ficha`). El contenedor pasa el
 *  resultado de la query; TypeScript detecta cualquier deriva de forma en compilación. */
export type Ficha = {
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
  estado: Estado;
  valor: number;
  propietarioNombre: string;
  creadoEn: number;
  ultimoContacto: number | null;
  proximoSeguimiento: {
    _id: Id<"seguimientos">;
    motivo: string | null;
    fechaObjetivo: number;
  } | null;
  interacciones: {
    _id: Id<"interacciones">;
    tipo: TipoInteraccion;
    canal?: Canal;
    nota: string | null;
    fecha: number;
    autorNombre: string;
  }[];
  ventas: {
    _id: Id<"ventas">;
    producto: string;
    fecha: number;
    total: number;
    vendedorNombre: string;
  }[];
};

const CANAL_LABEL: Record<Canal, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  telefono: "Teléfono",
  email: "Email",
};
const ORIGEN_LABEL: Record<Origen, string> = {
  recomendacion: "Recomendación",
  campana: "Campaña",
  sitio_web: "Sitio web",
  evento: "Evento",
  otro: "Otro",
};
const ESTADO: Record<Estado, { label: string; tono: BadgeTono }> = {
  nuevo_lead: { label: "Nuevo lead", tono: "neutral" },
  en_negociacion: { label: "En negociación", tono: "warning" },
  ganado: { label: "Ganado", tono: "success" },
  perdido: { label: "Perdido", tono: "danger" },
};
const PRIORIDAD: Record<Prioridad, { label: string; tono: BadgeTono }> = {
  alta: { label: "Alta", tono: "danger" },
  media: { label: "Media", tono: "warning" },
  baja: { label: "Baja", tono: "neutral" },
};
const TIPO_INTERACCION: Record<
  TipoInteraccion,
  { medio: string; icon: ReactNode; wrap: string }
> = {
  llamada: {
    medio: "Llamada",
    icon: <Phone size={15} />,
    wrap: "bg-brand-subtle text-brand",
  },
  mensaje: {
    medio: "Mensaje",
    icon: <MessageCircle size={15} />,
    wrap: "bg-info-bg text-info-fg",
  },
  visita: {
    medio: "Visita",
    icon: <MapPin size={15} />,
    wrap: "bg-success-bg text-success-fg",
  },
};

/** Solo dígitos para `wa.me` (sin +, espacios ni signos). */
function soloDigitos(telefono: string): string {
  return telefono.replace(/\D/g, "");
}

const CARD = "rounded-lg border border-slate-200 bg-white shadow-xs";

export function FichaClienteView({
  ficha,
  now = Date.now(),
  onAnotarInteraccion,
  onProgramarSeguimiento,
  onCerrarSeguimiento,
  cerrandoSeguimiento = false,
  onRegistrarVenta,
  onArchivar,
  archivando = false,
}: {
  ficha: Ficha;
  now?: number;
  /** Abre el alta de interacción (P6). Si no llega, las CTAs de interacción quedan deshabilitadas. */
  onAnotarInteraccion?: () => void;
  /** Abre la programación de seguimiento (P7). Si no llega, la CTA de seguimiento queda deshabilitada. */
  onProgramarSeguimiento?: () => void;
  /** Cierra el próximo seguimiento ("Marcar hecho", P4·TAL-17). Si no llega, el botón queda deshabilitado. */
  onCerrarSeguimiento?: () => void;
  cerrandoSeguimiento?: boolean;
  /** Abre el alta de venta (P8·TAL-18). Si no llega, las CTAs de venta quedan deshabilitadas. */
  onRegistrarVenta?: () => void;
  /** Abre la confirmación de archivar cliente (soft-delete · TAL-59). Sin él, el botón queda deshabilitado. */
  onArchivar?: () => void;
  archivando?: boolean;
}) {
  const subtitulo = [ficha.cargo, ficha.empresa].filter(Boolean).join(" · ");

  return (
    <section className="animate-in flex flex-col gap-4">
      {/* Cabecera: atrás + nombre + editar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href="/clientes"
            aria-label="Volver a clientes"
            className="flex-none rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <ChevronLeft size={20} />
          </Link>
          <h1 className="truncate text-2xl font-extrabold tracking-tight">{ficha.nombre}</h1>
        </div>
        <Link
          href={`/clientes/${ficha._id}/editar`}
          className="inline-flex flex-none items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Pencil size={16} /> Editar
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {/* Columna izquierda: identidad + datos */}
        <div className="flex flex-col gap-4">
          {/* Tarjeta de identidad */}
          <div className={`${CARD} p-4 sm:p-5`}>
            <div className="flex items-center gap-3.5">
              <Avatar name={ficha.nombre} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-extrabold tracking-tight">{ficha.nombre}</div>
                {subtitulo && <div className="truncate text-sm text-slate-500">{subtitulo}</div>}
              </div>
              <div className="flex-none text-right">
                <div className="text-[11px] font-semibold text-slate-400">Valor</div>
                <div className="mono text-lg font-extrabold text-emerald-600">
                  {formatMoneyShort(ficha.valor)}
                </div>
              </div>
            </div>

            <div className="mt-3.5 flex flex-wrap gap-1.5">
              <Badge tone={ESTADO[ficha.estado].tono} dot>
                {ESTADO[ficha.estado].label}
              </Badge>
              {ficha.canal && (
                <Badge variant="outline" tone="neutral">
                  {CANAL_LABEL[ficha.canal]}
                </Badge>
              )}
              <Badge tone={PRIORIDAD[ficha.prioridad].tono}>
                {PRIORIDAD[ficha.prioridad].label}
              </Badge>
            </div>

            {/* Contacto multicanal (F04): cada botón se oculta si falta el dato. */}
            {(ficha.telefono || ficha.email) && (
              <div className="mt-4 flex gap-3">
                {ficha.telefono && (
                  <ContactoCircular
                    href={`https://wa.me/${soloDigitos(ficha.telefono)}`}
                    label="WhatsApp"
                    bg="#25D366"
                    icon={<MessageCircle size={20} />}
                    external
                  />
                )}
                {ficha.telefono && (
                  <ContactoCircular
                    href={`tel:${ficha.telefono}`}
                    label="Llamar"
                    bg="#64748B"
                    icon={<Phone size={20} />}
                  />
                )}
                {ficha.email && (
                  <ContactoCircular
                    href={`mailto:${ficha.email}`}
                    label="Email"
                    bg="#3B82F6"
                    icon={<Mail size={20} />}
                  />
                )}
              </div>
            )}
          </div>

          {/* Datos */}
          <div className={`${CARD} overflow-hidden`}>
            <div className="px-4 py-3 text-sm font-bold">Datos</div>
            <Dato label="Teléfono" valor={ficha.telefono} mono />
            <Dato label="Correo" valor={ficha.email} />
            <Dato label="Empresa" valor={ficha.empresa} />
            <Dato label="Ciudad" valor={ficha.ciudad} />
            {ficha.origen && <Dato label="Origen" valor={ORIGEN_LABEL[ficha.origen]} />}
            <Dato
              label="Último contacto"
              valor={ficha.ultimoContacto !== null ? formatFecha(ficha.ultimoContacto) : undefined}
              mono
            />
            <Dato label="Cliente desde" valor={formatFecha(ficha.creadoEn)} mono />
            <Dato label="Propietario" valor={ficha.propietarioNombre} />
            {ficha.notas && <Dato label="Notas" valor={ficha.notas} />}
          </div>

          {/* Eliminar (archivar · TAL-59): baja lógica. El contenedor confirma y navega a la lista. */}
          <button
            type="button"
            onClick={onArchivar}
            disabled={!onArchivar || archivando}
            title={onArchivar ? "Archivar cliente" : "Próxima fase"}
            className="inline-flex items-center justify-center gap-2 self-start rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-danger hover:border-danger hover:bg-danger-bg disabled:pointer-events-none disabled:opacity-50"
          >
            <Trash2 size={16} /> {archivando ? "Archivando…" : "Eliminar cliente"}
          </button>
        </div>

        {/* Columna derecha: próximo seguimiento + interacciones + ventas */}
        <div className="flex flex-col gap-4">
          {/* Próximo seguimiento */}
          <div className={`${CARD} p-4 sm:p-5`}>
            <div className="mb-3 text-sm font-bold">Próximo seguimiento</div>
            {ficha.proximoSeguimiento ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onCerrarSeguimiento}
                  disabled={!onCerrarSeguimiento || cerrandoSeguimiento}
                  aria-label="Marcar hecho"
                  title={onCerrarSeguimiento ? "Marcar como hecho" : "Próxima fase"}
                  className="flex h-11 w-11 flex-none items-center justify-center rounded-full border-2 border-slate-300 text-slate-400 transition hover:border-brand hover:bg-brand-subtle hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-slate-300 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                >
                  <Check size={18} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">
                    {ficha.proximoSeguimiento.motivo ?? "Seguimiento"}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-warning-fg">
                    <Clock size={14} />
                    <span className="mono text-xs font-semibold">
                      {formatAgendaFecha(ficha.proximoSeguimiento.fechaObjetivo, now)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <SeccionVacia
                texto="Sin seguimiento programado."
                cta="Programar seguimiento"
                onClick={onProgramarSeguimiento}
              />
            )}
          </div>

          {/* Interacciones */}
          <div className={`${CARD} p-4 sm:p-5`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm font-bold">Interacciones</div>
              {ficha.interacciones.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  iconLeft={<Plus size={16} />}
                  onClick={onAnotarInteraccion}
                  disabled={!onAnotarInteraccion}
                  title={onAnotarInteraccion ? undefined : "Próxima fase"}
                >
                  Anotar
                </Button>
              )}
            </div>
            {ficha.interacciones.length > 0 ? (
              <ul className="flex flex-col gap-3.5">
                {ficha.interacciones.map((i) => {
                  const meta = TIPO_INTERACCION[i.tipo];
                  return (
                    <li key={i._id} className="flex gap-3">
                      <span
                        className={`flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg ${meta.wrap}`}
                        aria-hidden="true"
                      >
                        {meta.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-slate-800">{i.nota ?? meta.medio}</div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          <span className="mono">{formatAgendaFecha(i.fecha, now)}</span> ·{" "}
                          {i.autorNombre}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <SeccionVacia
                texto="Aún no hay interacciones registradas."
                cta="Anotar interacción"
                onClick={onAnotarInteraccion}
              />
            )}
          </div>

          {/* Ventas */}
          <div className={`${CARD} p-4 sm:p-5`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm font-bold">Ventas</div>
              {ficha.ventas.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  iconLeft={<Plus size={16} />}
                  onClick={onRegistrarVenta}
                  disabled={!onRegistrarVenta}
                  title={onRegistrarVenta ? undefined : "Próxima fase"}
                >
                  Registrar
                </Button>
              )}
            </div>
            {ficha.ventas.length > 0 ? (
              <div className="flex flex-col">
                {ficha.ventas.map((v) => (
                  <div
                    key={v._id}
                    className="flex items-center gap-3 border-t border-slate-100 py-2.5 first:border-t-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{v.producto}</div>
                      <div className="mono mt-0.5 text-xs text-slate-400">
                        {formatFecha(v.fecha)} · {v.vendedorNombre}
                      </div>
                    </div>
                    <span className="mono flex-none text-sm font-bold text-emerald-600">
                      {formatMoneyShort(v.total)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <SeccionVacia
                texto="Aún no hay ventas registradas."
                cta="Registrar venta"
                onClick={onRegistrarVenta}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Fila de la sección "Datos". Muestra "—" cuando el valor no existe. */
function Dato({ label, valor, mono }: { label: string; valor?: string; mono?: boolean }) {
  return (
    <div className="flex gap-3 border-t border-slate-100 px-4 py-2.5">
      <span className="w-28 flex-none text-xs text-slate-400">{label}</span>
      <span className={`min-w-0 flex-1 break-words text-sm ${mono ? "mono" : ""}`}>
        {valor ?? "—"}
      </span>
    </div>
  );
}

/** Estado vacío de una sección: texto + CTA. Con `onClick` la CTA se activa; sin él queda
 *  deshabilitada (secciones cuya escritura aún no llega — seguimiento/ventas). */
function SeccionVacia({ texto, cta, onClick }: { texto: string; cta: string; onClick?: () => void }) {
  return (
    <>
      <p className="text-sm text-slate-500">{texto}</p>
      <Button
        variant="primary"
        size="sm"
        iconLeft={<Plus size={16} />}
        onClick={onClick}
        disabled={!onClick}
        title={onClick ? undefined : "Próxima fase"}
        className="mt-3"
      >
        {cta}
      </Button>
    </>
  );
}

/** Botón circular de contacto (WhatsApp/Llamar/Email). */
function ContactoCircular({
  href,
  label,
  bg,
  icon,
  external,
}: {
  href: string;
  label: string;
  bg: string;
  icon: ReactNode;
  external?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <a
        href={href}
        aria-label={label}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="flex h-11 w-11 items-center justify-center rounded-full text-white transition-[filter] hover:brightness-95"
        style={{ backgroundColor: bg }}
      >
        {icon}
      </a>
      <span className="text-[11px] text-slate-500">{label}</span>
    </div>
  );
}
