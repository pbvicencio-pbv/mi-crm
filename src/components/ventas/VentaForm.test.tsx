import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { VentaForm } from "./VentaForm";

const base = {
  modo: "alta" as const,
  guardando: false,
  onCancel: () => {},
  vendedorInicial: "u1" as any,
};

describe("VentaForm", () => {
  it("calcula el Total en vivo (importe × cantidad)", async () => {
    render(<VentaForm {...base} onSubmit={() => {}} vendedorFijoNombre="Carlos" />);
    expect(screen.getByText("$0.00")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Importe"), "1200.50");
    expect(screen.getByText("$1,200.50")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Sumar")); // cantidad → 2
    expect(screen.getByText("$2,401.00")).toBeInTheDocument();
  });

  it("el stepper no baja de 1", async () => {
    render(<VentaForm {...base} onSubmit={() => {}} vendedorFijoNombre="Carlos" />);
    await userEvent.click(screen.getByLabelText("Restar"));
    await userEvent.click(screen.getByLabelText("Restar"));
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("valida producto e importe con los mensajes del diseño", async () => {
    render(<VentaForm {...base} onSubmit={() => {}} vendedorFijoNombre="Carlos" />);
    await userEvent.click(screen.getByRole("button", { name: "Registrar venta" }));
    expect(screen.getByText("Indica qué se vendió")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("¿Qué se vendió?"), "Curso");
    await userEvent.click(screen.getByRole("button", { name: "Registrar venta" }));
    expect(screen.getByText("Indica el importe")).toBeInTheDocument();
  });

  it("emite onSubmit con los datos (fecha omitida si es hoy)", async () => {
    const onSubmit = vi.fn();
    render(<VentaForm {...base} onSubmit={onSubmit} vendedorFijoNombre="Carlos" />);
    await userEvent.type(screen.getByLabelText("¿Qué se vendió?"), "  Curso  ");
    await userEvent.type(screen.getByLabelText("Importe"), "500");
    await userEvent.click(screen.getByRole("button", { name: "Registrar venta" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      producto: "Curso",
      importe: 500,
      cantidad: 1,
      estado: "abierta",
      fecha: undefined,
      vendedor: "u1",
      cliente_id: undefined,
    });
  });

  it("Vendedor: editable (selector) cuando se pasan opciones; fijo si no", () => {
    const { unmount } = render(
      <VentaForm
        {...base}
        onSubmit={() => {}}
        vendedoresOpts={[
          { value: "u1", label: "Elena" },
          { value: "u2", label: "Carlos" },
        ]}
      />,
    );
    expect(screen.getByLabelText("Vendedor")).toBeInstanceOf(HTMLSelectElement);
    unmount();
    render(<VentaForm {...base} onSubmit={() => {}} vendedorFijoNombre="Carlos" />);
    // Sin opciones: no hay combobox de Vendedor; el nombre aparece como texto fijo.
    expect(screen.queryByRole("combobox", { name: "Vendedor" })).not.toBeInTheDocument();
    expect(screen.getByText("Carlos")).toBeInTheDocument();
  });

  it("Cliente: con selector exige elegir cliente; sin selector no aparece el campo", async () => {
    const onSubmit = vi.fn();
    const { unmount } = render(
      <VentaForm
        {...base}
        onSubmit={onSubmit}
        vendedorFijoNombre="Carlos"
        clientesOpts={[{ value: "c1", label: "Laura" }]}
      />,
    );
    await userEvent.type(screen.getByLabelText("¿Qué se vendió?"), "Curso");
    await userEvent.type(screen.getByLabelText("Importe"), "500");
    await userEvent.click(screen.getByRole("button", { name: "Registrar venta" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Falta elegir el cliente")).toBeInTheDocument();
    unmount();
    render(<VentaForm {...base} onSubmit={() => {}} vendedorFijoNombre="Carlos" />);
    expect(screen.queryByLabelText("Cliente")).not.toBeInTheDocument();
  });
});
