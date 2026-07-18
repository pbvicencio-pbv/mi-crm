import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Calendario } from "./Calendario";

const HOY = "2026-07-15";

describe("Calendario", () => {
  it("muestra el mes/año de hoy y la fila de días en lunes (con X para miércoles)", () => {
    render(<Calendario value={null} onChange={() => {}} hoy={HOY} />);
    expect(screen.getByText("Julio 2026")).toBeInTheDocument();
    expect(screen.getByText("X")).toBeInTheDocument(); // miércoles desambiguado
    expect(screen.getByText("L")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("al tocar un día llama onChange con su ISO", async () => {
    const onChange = vi.fn();
    render(<Calendario value={null} onChange={onChange} hoy={HOY} />);
    await userEvent.click(screen.getByRole("button", { name: "2026-07-20" }));
    expect(onChange).toHaveBeenCalledWith("2026-07-20");
  });

  it("navega de mes con las flechas", async () => {
    render(<Calendario value={null} onChange={() => {}} hoy={HOY} />);
    await userEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(screen.getByText("Agosto 2026")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
    expect(screen.getByText("Julio 2026")).toBeInTheDocument();
  });

  it("deshabilita los días anteriores a min (no se puede agendar en el pasado)", () => {
    render(<Calendario value={null} onChange={() => {}} min={HOY} hoy={HOY} />);
    expect(screen.getByRole("button", { name: "2026-07-14" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "2026-07-15" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "2026-07-16" })).toBeEnabled();
  });

  it("si el value externo cae en otro mes, navega el calendario a ese mes", () => {
    const { rerender } = render(<Calendario value={null} onChange={() => {}} hoy={HOY} />);
    expect(screen.getByText("Julio 2026")).toBeInTheDocument();
    rerender(<Calendario value="2026-09-03" onChange={() => {}} hoy={HOY} />);
    expect(screen.getByText("Septiembre 2026")).toBeInTheDocument();
  });
});
