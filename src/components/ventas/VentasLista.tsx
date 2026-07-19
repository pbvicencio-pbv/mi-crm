"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { VentasListaView, type FilaVenta } from "./VentasListaView";
import { VentaForm, type VentaDatos } from "./VentaForm";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";

type ModalState = null | { tipo: "alta" } | { tipo: "edicion"; venta: FilaVenta };

function mensajeError(e: unknown, fallback: string): string {
  const d = (e as { data?: unknown } | null)?.data;
  return typeof d === "string" ? d : fallback;
}

/** Contenedor de /ventas (P9): datos reactivos + orquestación de alta/edición (VentaForm) y
 *  archivado (ConfirmDialog). Consulta `usuarios.actual` para aplicar la UI de D1 (selector de
 *  vendedor solo dueña; ⋮ gateado en la vista). */
export function VentasLista() {
  const ventas = useQuery(api.ventas.listar);
  const actual = useQuery(api.usuarios.actual);
  const esDuena = actual?.rol === "duena";
  const vendedoresRaw = useQuery(api.usuarios.opcionesAsignacion, esDuena ? {} : "skip");
  const clientesRaw = useQuery(api.clientes.opcionesActivas);

  const crearVenta = useMutation(api.ventas.crearVenta);
  const actualizarVenta = useMutation(api.ventas.actualizarVenta);
  const archivarVenta = useMutation(api.ventas.archivarVenta);

  const [modal, setModal] = useState<ModalState>(null);
  const [confirmar, setConfirmar] = useState<FilaVenta | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [archivando, setArchivando] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "danger"; msg: string } | null>(null);

  if (ventas === undefined || actual === undefined) return <VentasSkeleton />;
  if (actual === null) return null; // ruta protegida; el middleware redirige

  const vendedoresOpts = esDuena
    ? (vendedoresRaw ?? []).map((u) => ({ value: u._id, label: u.nombre }))
    : undefined;
  const clientesOpts = (clientesRaw ?? []).map((c) => ({ value: c._id, label: c.nombre }));
  const modalListo = !esDuena || vendedoresRaw !== undefined;

  const cerrar = () => setModal(null);

  const onGuardarAlta = async (datos: VentaDatos) => {
    if (!datos.cliente_id) return;
    setGuardando(true);
    try {
      await crearVenta({
        cliente_id: datos.cliente_id,
        producto: datos.producto,
        importe: datos.importe,
        cantidad: datos.cantidad,
        estado: datos.estado,
        fecha: datos.fecha,
        vendedor: datos.vendedor,
      });
      setModal(null);
      setToast({ tone: "success", msg: "Venta registrada" });
    } catch (e) {
      setToast({ tone: "danger", msg: mensajeError(e, "No se pudo registrar la venta") });
    } finally {
      setGuardando(false);
    }
  };

  const onGuardarEdicion = async (datos: VentaDatos) => {
    if (modal?.tipo !== "edicion") return;
    setGuardando(true);
    try {
      await actualizarVenta({
        id: modal.venta._id,
        producto: datos.producto,
        importe: datos.importe,
        cantidad: datos.cantidad,
        estado: datos.estado,
        fecha: datos.fecha,
        vendedor: datos.vendedor,
      });
      setModal(null);
      setToast({ tone: "success", msg: "Venta actualizada" });
    } catch (e) {
      setToast({ tone: "danger", msg: mensajeError(e, "No se pudo actualizar la venta") });
    } finally {
      setGuardando(false);
    }
  };

  const onArchivar = async () => {
    if (!confirmar || archivando) return;
    setArchivando(true);
    try {
      await archivarVenta({ id: confirmar._id });
      setToast({ tone: "success", msg: "Venta archivada" });
      setConfirmar(null);
    } catch (e) {
      setToast({ tone: "danger", msg: mensajeError(e, "No se pudo archivar la venta") });
    } finally {
      setArchivando(false);
    }
  };

  const ed = modal?.tipo === "edicion" ? modal.venta : null;

  return (
    <>
      <VentasListaView
        ventas={ventas}
        yo={{ _id: actual._id, rol: actual.rol }}
        onAnadir={() => setModal({ tipo: "alta" })}
        onEditar={(venta) => setModal({ tipo: "edicion", venta })}
        onEliminar={(venta) => setConfirmar(venta)}
      />

      {/* Alta / Edición de venta */}
      <Modal
        open={modal !== null}
        onClose={cerrar}
        title={modal?.tipo === "edicion" ? "Editar venta" : "Registrar venta"}
        subtitle={ed?.clienteNombre}
        size="lg"
      >
        {modal && modalListo && (
          <VentaForm
            modo={modal.tipo === "edicion" ? "edicion" : "alta"}
            guardando={guardando}
            onCancel={cerrar}
            onSubmit={modal.tipo === "edicion" ? onGuardarEdicion : onGuardarAlta}
            vendedorInicial={ed ? ed.vendedor : actual._id}
            vendedoresOpts={vendedoresOpts}
            vendedorFijoNombre={esDuena ? undefined : ed ? ed.vendedorNombre : actual.nombre}
            clientesOpts={modal.tipo === "alta" ? clientesOpts : undefined}
            clienteFijoNombre={ed ? ed.clienteNombre : undefined}
            inicial={
              ed
                ? { producto: ed.producto, importe: ed.importe, cantidad: ed.cantidad, estado: ed.estado, fecha: ed.fecha }
                : undefined
            }
          />
        )}
      </Modal>

      <ConfirmDialog
        open={confirmar !== null}
        onClose={() => setConfirmar(null)}
        onConfirm={onArchivar}
        title="Eliminar venta"
        confirmLabel="Archivar"
        pendingLabel="Archivando…"
        pendiente={archivando}
        description={
          confirmar ? (
            <>
              Se archivará la venta{" "}
              <span className="font-semibold text-slate-900">{confirmar.producto}</span> y dejará de
              aparecer en las listas y totales. Podrás recuperarla más adelante.
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

function VentasSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-4">
      <div className="h-8 w-40 rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-3.5">
        <div className="h-20 rounded-lg border border-slate-200 bg-white shadow-xs" />
        <div className="h-20 rounded-lg border border-slate-200 bg-white shadow-xs" />
      </div>
      <div className="h-9 w-full rounded-lg bg-slate-100" />
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 border-b border-slate-100 p-3.5 last:border-b-0">
            <div className="h-4 w-40 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-28 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
