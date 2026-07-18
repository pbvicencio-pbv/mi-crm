"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FichaClienteView } from "./FichaClienteView";
import { InteraccionForm, type InteraccionDatos } from "./InteraccionForm";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";

function mensajeError(e: unknown): string {
  const d = (e as { data?: unknown } | null)?.data;
  return typeof d === "string" ? d : "No se pudo registrar la interacción";
}

/** Contenedor: trae la ficha (reactiva), delega el render a la vista pura y orquesta el alta de
 *  interacción (modal + mutation + toast). Al registrar, la ficha se recalcula sola (reactiva). */
export function FichaCliente({ id }: { id: string }) {
  const clienteId = id as Id<"clientes">;
  const ficha = useQuery(api.clientes.ficha, { id: clienteId });
  const registrar = useMutation(api.interacciones.registrar);

  const [anotando, setAnotando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "danger"; msg: string } | null>(null);

  if (ficha === undefined) return <FichaSkeleton />;
  if (ficha === null) return <FichaNoDisponible />;

  const onGuardar = async (datos: InteraccionDatos) => {
    setGuardando(true);
    try {
      await registrar({ cliente_id: clienteId, ...datos });
      setAnotando(false);
      setToast({ tone: "success", msg: "Interacción registrada" });
    } catch (e) {
      setToast({ tone: "danger", msg: mensajeError(e) }); // el modal permanece abierto
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <FichaClienteView ficha={ficha} onAnotarInteraccion={() => setAnotando(true)} />

      <Modal
        open={anotando}
        onClose={() => setAnotando(false)}
        title="Registrar interacción"
        subtitle={ficha.nombre}
        size="lg"
      >
        <InteraccionForm
          guardando={guardando}
          onCancel={() => setAnotando(false)}
          onSubmit={onGuardar}
        />
      </Modal>

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
