import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ConfirmDialog } from "./ConfirmDialog";

const base = {
  title: "Eliminar cliente",
  description: "Se archivará y dejará de aparecer en tus listas.",
  confirmLabel: "Archivar",
  pendingLabel: "Archivando…",
};

describe("ConfirmDialog", () => {
  it("no renderiza nada cuando open=false", () => {
    render(<ConfirmDialog {...base} open={false} onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abierto: muestra título, descripción y botones (confirmLabel)", () => {
    render(<ConfirmDialog {...base} open onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Se archivará y dejará de aparecer en tus listas.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archivar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled();
  });

  it("confirmar invoca onConfirm; cancelar invoca onClose", async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<ConfirmDialog {...base} open onClose={onClose} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Archivar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("pendiente: confirmar muestra pendingLabel y ambos botones quedan deshabilitados", () => {
    render(<ConfirmDialog {...base} open pendiente onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.getByRole("button", { name: "Archivando…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Archivar" })).not.toBeInTheDocument();
  });

  it("pendiente: Escape no cierra (onClose no se invoca)", async () => {
    const onClose = vi.fn();
    render(<ConfirmDialog {...base} open pendiente onClose={onClose} onConfirm={() => {}} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });
});
