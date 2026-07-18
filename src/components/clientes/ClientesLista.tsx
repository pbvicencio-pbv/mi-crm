"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ClientesListaView, type ClienteFila } from "./ClientesListaView";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";

function mensajeError(e: unknown, fallback: string): string {
  const d = (e as { data?: unknown } | null)?.data;
  return typeof d === "string" ? d : fallback;
}

/** Contenedor: trae los datos (reactivo), delega el render a la vista pura (testeable) y orquesta
 *  el archivado (soft-delete · TAL-59): confirmación + mutation + toast. Al archivar, la fila
 *  desaparece sola (la query `listar` re-deriva y excluye archivados). */
export function ClientesLista() {
  const clientes = useQuery(api.clientes.listar);
  const archivarCliente = useMutation(api.clientes.archivarCliente);

  const [confirmar, setConfirmar] = useState<ClienteFila | null>(null);
  const [archivando, setArchivando] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "danger"; msg: string } | null>(null);

  if (clientes === undefined) return <ListaSkeleton />;

  const onArchivar = async () => {
    if (!confirmar || archivando) return;
    setArchivando(true);
    try {
      await archivarCliente({ id: confirmar._id });
      setToast({ tone: "success", msg: "Cliente archivado" });
      setConfirmar(null);
    } catch (e) {
      setToast({ tone: "danger", msg: mensajeError(e, "No se pudo archivar el cliente") });
    } finally {
      setArchivando(false);
    }
  };

  return (
    <>
      <ClientesListaView clientes={clientes} onArchivar={(c) => setConfirmar(c)} />

      <ConfirmDialog
        open={confirmar !== null}
        onClose={() => setConfirmar(null)}
        onConfirm={onArchivar}
        title="Eliminar cliente"
        confirmLabel="Archivar"
        pendingLabel="Archivando…"
        pendiente={archivando}
        description={
          confirmar ? (
            <>
              Se archivará a{" "}
              <span className="font-semibold text-slate-900">{confirmar.nombre}</span> y dejará de
              aparecer en tus listas. Podrás recuperarlo más adelante.
            </>
          ) : null
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

function ListaSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-4">
      <div className="h-8 w-40 rounded bg-slate-200" />
      <div className="h-11 w-full rounded-lg bg-slate-100" />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs">
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-40 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
