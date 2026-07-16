import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/link", () => ({
  default: ({ href, children, ...p }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...p}>
      {children}
    </a>
  ),
}));

import { TareaCard, type ItemAgenda } from "./TareaCard";

const item: ItemAgenda = {
  seguimientoId: "s1",
  clienteId: "c1",
  nombre: "Laura Fernández",
  motivo: "Llamar sobre la propuesta",
  fechaObjetivo: Date.now(),
  estadoCliente: "en_negociacion",
};

describe("TareaCard", () => {
  it("muestra nombre, motivo y estado; enlaza a la ficha del cliente", () => {
    render(<TareaCard item={item} now={Date.now()} cerrando={false} onCerrar={() => {}} />);
    expect(screen.getByText("Laura Fernández")).toBeInTheDocument();
    expect(screen.getByText("Llamar sobre la propuesta")).toBeInTheDocument();
    expect(screen.getByText("En negociación")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/clientes/c1");
  });

  it("al pulsar «Marcar hecho» invoca onCerrar una vez", async () => {
    const onCerrar = vi.fn();
    render(<TareaCard item={item} now={Date.now()} cerrando={false} onCerrar={onCerrar} />);
    await userEvent.click(screen.getByRole("button", { name: /marcar hecho/i }));
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("mientras cierra, el botón queda deshabilitado (evita doble clic)", async () => {
    const onCerrar = vi.fn();
    render(<TareaCard item={item} now={Date.now()} cerrando={true} onCerrar={onCerrar} />);
    const btn = screen.getByRole("button", { name: /marcar hecho/i });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onCerrar).not.toHaveBeenCalled();
  });
});
