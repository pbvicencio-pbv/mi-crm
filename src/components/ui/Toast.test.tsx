import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Toast } from "./Toast";

describe("Toast", () => {
  it("muestra título y descripción", () => {
    render(<Toast tone="success" title="Listo" description="Venta registrada" />);
    expect(screen.getByText("Listo")).toBeInTheDocument();
    expect(screen.getByText("Venta registrada")).toBeInTheDocument();
  });

  it("el cierre es icon-only con área táctil 44×44 y dispara onClose (TAL-19)", async () => {
    const onClose = vi.fn();
    render(<Toast tone="danger" title="Error" onClose={onClose} />);
    const cerrar = screen.getByRole("button", { name: "Cerrar aviso" });
    expect(cerrar).toHaveClass("h-11", "w-11");
    await userEvent.click(cerrar);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("sin onClose no renderiza botón de cierre", () => {
    render(<Toast title="Solo lectura" />);
    expect(screen.queryByRole("button", { name: "Cerrar aviso" })).not.toBeInTheDocument();
  });
});
