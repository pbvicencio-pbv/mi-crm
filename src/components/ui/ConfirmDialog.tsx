"use client";

import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/**
 * Diálogo de confirmación reutilizable para acciones destructivas (archivar cliente · TAL-59;
 * lo hereda la pantalla de ventas en M5.2). Envuelve `Modal` con ícono de papelera + copy + botón
 * `danger`. Mientras `pendiente`: el botón de confirmar muestra `pendingLabel`, confirmar y cancelar
 * quedan deshabilitados y se BLOQUEA el cierre por backdrop/Escape — así se evita el doble envío y
 * los estados a medias (la acción, o se completa, o falla y reabre el control).
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  pendingLabel = "Procesando…",
  cancelLabel = "Cancelar",
  pendiente = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  pendiente?: boolean;
}) {
  return (
    <Modal
      open={open}
      // El cierre por backdrop/Escape se ignora mientras la acción está en curso.
      onClose={() => {
        if (!pendiente) onClose();
      }}
      title={title}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={pendiente}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={pendiente}>
            {pendiente ? pendingLabel : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3.5">
        <span
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-danger-bg text-danger"
          aria-hidden="true"
        >
          <Trash2 size={20} />
        </span>
        <div className="min-w-0 text-sm text-slate-600">{description}</div>
      </div>
    </Modal>
  );
}
