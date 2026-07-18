"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FichaClienteView } from "./FichaClienteView";
import { InteraccionForm, type InteraccionDatos } from "./InteraccionForm";
import { SeguimientoForm, type SeguimientoDatos } from "./SeguimientoForm";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";

type ModalState = null | { tipo: "interaccion" } | { tipo: "seguimiento" };

function mensajeError(e: unknown, fallback: string): string {
  const d = (e as { data?: unknown } | null)?.data;
  return typeof d === "string" ? d : fallback;
}

/** Contenedor: trae la ficha (reactiva), delega el render a la vista pura y orquesta las altas de
 *  interacción (P6) y seguimiento (P7) — modal + mutation + toast. Al escribir, la ficha se
 *  recalcula sola (reactiva). */
export function FichaCliente({ id }: { id: string }) {
  const router = useRouter();
  const clienteId = id as Id<"clientes">;
  const ficha = useQuery(api.clientes.ficha, { id: clienteId });
  const registrarInteraccion = useMutation(api.interacciones.registrar);
  const crearSeguimiento = useMutation(api.seguimientos.crearSeguimiento);
  const cerrarSeguimiento = useMutation(api.seguimientos.cerrar);
  const archivarCliente = useMutation(api.clientes.archivarCliente);

  const [modal, setModal] = useState<ModalState>(null);
  const [guardando, setGuardando] = useState(false);
  const [cerrandoSeguimiento, setCerrandoSeguimiento] = useState(false);
  const [confirmarArchivar, setConfirmarArchivar] = useState(false);
  const [archivando, setArchivando] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "danger"; msg: string } | null>(null);

  if (ficha === undefined) return <FichaSkeleton />;
  if (ficha === null) return <FichaNoDisponible />;

  const cerrar = () => setModal(null);

  const onGuardarInteraccion = async (datos: InteraccionDatos) => {
    setGuardando(true);
    try {
      await registrarInteraccion({ cliente_id: clienteId, ...datos });
      setModal(null);
      setToast({ tone: "success", msg: "Interacción registrada" });
    } catch (e) {
      setToast({ tone: "danger", msg: mensajeError(e, "No se pudo registrar la interacción") });
    } finally {
      setGuardando(false);
    }
  };

  const onGuardarSeguimiento = async (datos: SeguimientoDatos) => {
    setGuardando(true);
    try {
      await crearSeguimiento({ cliente_id: clienteId, ...datos });
      setModal(null);
      setToast({ tone: "success", msg: "Seguimiento agendado" });
    } catch (e) {
      setToast({ tone: "danger", msg: mensajeError(e, "No se pudo agendar el seguimiento") });
    } finally {
      setGuardando(false);
    }
  };

  // "Marcar hecho" del próximo seguimiento (TAL-17). Un toque; reutiliza `seguimientos.cerrar`
  // (idempotente). Al cerrar, la ficha re-deriva y el bloque pasa al estado vacío.
  const onCerrarSeguimiento = async () => {
    const seg = ficha.proximoSeguimiento;
    if (!seg || cerrandoSeguimiento) return;
    setCerrandoSeguimiento(true);
    try {
      await cerrarSeguimiento({ id: seg._id });
      setToast({ tone: "success", msg: "Seguimiento completado" });
    } catch (e) {
      setToast({ tone: "danger", msg: mensajeError(e, "No se pudo marcar como hecho") });
    } finally {
      setCerrandoSeguimiento(false);
    }
  };

  // Archivar (soft-delete · TAL-59). Éxito → navega a la lista (el cliente ya no aparece);
  // NO reseteamos `archivando` en el éxito porque el componente se desmonta al navegar. En error,
  // se reabilita el diálogo con el mensaje. La query `ficha` ya devolvería null tras archivar.
  const onArchivar = async () => {
    if (archivando) return;
    setArchivando(true);
    try {
      await archivarCliente({ id: clienteId });
      router.push("/clientes");
    } catch (e) {
      setArchivando(false);
      setToast({ tone: "danger", msg: mensajeError(e, "No se pudo archivar el cliente") });
    }
  };

  return (
    <>
      <FichaClienteView
        ficha={ficha}
        onAnotarInteraccion={() => setModal({ tipo: "interaccion" })}
        onProgramarSeguimiento={() => setModal({ tipo: "seguimiento" })}
        onCerrarSeguimiento={onCerrarSeguimiento}
        cerrandoSeguimiento={cerrandoSeguimiento}
        onArchivar={() => setConfirmarArchivar(true)}
        archivando={archivando}
      />

      <Modal
        open={modal?.tipo === "interaccion"}
        onClose={cerrar}
        title="Registrar interacción"
        subtitle={ficha.nombre}
        size="lg"
      >
        <InteraccionForm guardando={guardando} onCancel={cerrar} onSubmit={onGuardarInteraccion} />
      </Modal>

      <Modal
        open={modal?.tipo === "seguimiento"}
        onClose={cerrar}
        title="Programar seguimiento"
        subtitle={ficha.nombre}
        size="lg"
      >
        <SeguimientoForm guardando={guardando} onCancel={cerrar} onSubmit={onGuardarSeguimiento} />
      </Modal>

      <ConfirmDialog
        open={confirmarArchivar}
        onClose={() => setConfirmarArchivar(false)}
        onConfirm={onArchivar}
        title="Eliminar cliente"
        confirmLabel="Archivar"
        pendingLabel="Archivando…"
        pendiente={archivando}
        description={
          <>
            Se archivará a <span className="font-semibold text-slate-900">{ficha.nombre}</span> y
            dejará de aparecer en tus listas. Podrás recuperarlo más adelante.
          </>
        }
      />

      {toast && (
        <div className="fixed bottom-20 right-4 z-[60] w-[calc(100%-2rem)] max-w-sm md:bottom-6 md:right-6">
          <Toast
            tone={toast.tone}
            title={toast.tone === "success" ? "Listo" : "Error"}
            description={toast.msg}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </>
  );
}

function FichaNoDisponible() {
  return (
    <div className="mx-auto max-w-[560px] rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
      <div className="text-base font-extrabold text-slate-900">Cliente no disponible</div>
      <p className="mt-1.5 text-sm text-slate-600">No existe o fue archivado.</p>
      <Link
        href="/clientes"
        className="mt-4 inline-block text-sm font-semibold text-brand hover:underline"
      >
        Volver a clientes
      </Link>
    </div>
  );
}

function FichaSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-4">
      <div className="h-8 w-48 rounded bg-slate-200" />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-4">
          <div className="h-40 rounded-lg border border-slate-200 bg-white shadow-xs" />
          <div className="h-56 rounded-lg border border-slate-200 bg-white shadow-xs" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="h-28 rounded-lg border border-slate-200 bg-white shadow-xs" />
          <div className="h-40 rounded-lg border border-slate-200 bg-white shadow-xs" />
        </div>
      </div>
    </div>
  );
}
