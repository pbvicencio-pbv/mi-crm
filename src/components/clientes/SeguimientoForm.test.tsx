import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SeguimientoForm } from "./SeguimientoForm";

const HOY = "2026-07-15";
const mediodia = (y: number, m1: number, d: number) => new Date(y, m1 - 1, d, 12, 0, 0, 0).getTime();

function montar(over: Partial<Parameters<typeof SeguimientoForm>[0]> = {}) {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(<SeguimientoForm guardando={false} onCancel={onCancel} onSubmit={onSubmit} hoy={HOY} {...over} />);
  return { onSubmit, onCancel };
}

describe("SeguimientoForm", () => {
  it("atajo 'Mañana' → onSubmit con fecha_objetivo = mediodía local de hoy+1", async () => {
    const { onSubmit } = montar();
    await userEvent.click(screen.getByRole("button", { name: "Mañana" }));
    await userEvent.click(screen.getByRole("button", { name: "Agendar seguimiento" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].fecha_objetivo).toBe(mediodia(2026, 7, 16));
    expect(onSubmit.mock.calls[0][0].motivo).toBeUndefined();
  });

  it("atajo 'En 1 semana' → hoy+7", async () => {
    const { onSubmit } = montar();
    await userEvent.click(screen.getByRole("button", { name: "En 1 semana" }));
    await userEvent.click(screen.getByRole("button", { name: "Agendar seguimiento" }));
    expect(onSubmit.mock.calls[0][0].fecha_objetivo).toBe(mediodia(2026, 7, 22));
  });

  it("tocar un día del calendario activa el chip 'Elegir fecha' y desmarca los atajos", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Mañana" }));
    await userEvent.click(screen.getByRole("button", { name: "2026-07-20" }));
    expect(screen.getByRole("button", { name: "Elegir fecha" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Mañana" })).toHaveAttribute("aria-pressed", "false");
  });

  it("submit sin elegir fecha → error inline y NO llama onSubmit", async () => {
    const { onSubmit } = montar();
    await userEvent.click(screen.getByRole("button", { name: "Agendar seguimiento" }));
    expect(screen.getByText(/elige una fecha/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("envía el motivo recortado cuando se escribe", async () => {
    const { onSubmit } = montar();
    await userEvent.click(screen.getByRole("button", { name: "En 3 días" }));
    await userEvent.type(screen.getByLabelText("Motivo"), "  Cerrar propuesta  ");
    await userEvent.click(screen.getByRole("button", { name: "Agendar seguimiento" }));
    expect(onSubmit.mock.calls[0][0].fecha_objetivo).toBe(mediodia(2026, 7, 18));
    expect(onSubmit.mock.calls[0][0].motivo).toBe("Cerrar propuesta");
  });

  it("mientras guarda, el botón queda deshabilitado", async () => {
    const { onSubmit } = montar({ guardando: true });
    const btn = screen.getByRole("button", { name: /guardando/i });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
