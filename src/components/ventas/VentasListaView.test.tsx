import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/link", () => ({
  default: ({ href, children, ...p }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...p}>
      {children}
    </a>
  ),
}));

import { VentasListaView, type FilaVenta } from "./VentasListaView";

const NOW = 1_710_000_000_000;
const DAY = 86_400_000;
const U1 = "u1" as any; // Elena (dueña)
const U2 = "u2" as any; // Carlos (vendedor)

const VENTAS: FilaVenta[] = [
  { _id: "v1" as any, cliente_id: "c1" as any, producto: "Curso A", importe: 100, cantidad: 2, total: 200, estado: "abierta", fecha: NOW - 1 * DAY, vendedor: U2, clienteNombre: "Ana", vendedorNombre: "Carlos" },
  { _id: "v2" as any, cliente_id: "c1" as any, producto: "Plan B", importe: 500, cantidad: 1, total: 500, estado: "ganada", fecha: NOW - 10 * DAY, vendedor: U1, clienteNombre: "Ana", vendedorNombre: "Elena" },
  { _id: "v3" as any, cliente_id: "c2" as any, producto: "Serv C", importe: 300, cantidad: 1, total: 300, estado: "perdida", fecha: NOW - 40 * DAY, vendedor: U2, clienteNombre: "Beto", vendedorNombre: "Carlos" },
  { _id: "v4" as any, cliente_id: "c2" as any, producto: "Curso D", importe: 700, cantidad: 1, total: 700, estado: "ganada", fecha: NOW - 2 * DAY, vendedor: U2, clienteNombre: "Beto", vendedorNombre: "Carlos" },
];

const DUENA = { _id: U1, rol: "duena" as const };
const VENDEDOR = { _id: U2, rol: "vendedor" as const };
const noop = () => {};

function rows() {
  return screen.queryAllByRole("article");
}
const chip = (name: RegExp | string) => screen.getByRole("button", { name });

describe("VentasListaView · KPIs y listado", () => {
  it("KPIs En marcha / Ganado con conteo e importe (todo el set)", () => {
    render(<VentasListaView ventas={VENTAS} yo={DUENA} now={NOW} onAnadir={noop} onEditar={noop} onEliminar={noop} />);
    const enMarcha = screen.getByRole("group", { name: "En marcha" });
    expect(within(enMarcha).getByText("1")).toBeInTheDocument(); // 1 abierta
    expect(within(enMarcha).getByText("$200.00")).toBeInTheDocument();
    const ganado = screen.getByRole("group", { name: "Ganado" });
    expect(within(ganado).getByText("2")).toBeInTheDocument(); // v2 + v4
    expect(within(ganado).getByText("$1K")).toBeInTheDocument(); // 500 + 700 = 1200
  });

  it("muestra todas las filas y enlaza cada una a la ficha del cliente (D2)", () => {
    render(<VentasListaView ventas={VENTAS} yo={DUENA} now={NOW} onAnadir={noop} onEditar={noop} onEliminar={noop} />);
    expect(rows()).toHaveLength(4);
    const filaA = rows().find((r) => r.textContent?.includes("Curso A"))!;
    expect(within(filaA).getByRole("link")).toHaveAttribute("href", "/clientes/c1");
  });

  it("los chips muestran contador y filtran el listado por estado", async () => {
    render(<VentasListaView ventas={VENTAS} yo={DUENA} now={NOW} onAnadir={noop} onEditar={noop} onEliminar={noop} />);
    expect(chip(/Todas/)).toHaveTextContent("4");
    expect(chip(/Ganadas/)).toHaveTextContent("2");
    await userEvent.click(chip(/Ganadas/));
    expect(rows()).toHaveLength(2);
    expect(rows().every((r) => /Plan B|Curso D/.test(r.textContent || ""))).toBe(true);
  });
});

describe("VentasListaView · filtros Cliente y Periodo (D4)", () => {
  it("filtrar por cliente acota lista y KPIs", async () => {
    render(<VentasListaView ventas={VENTAS} yo={DUENA} now={NOW} onAnadir={noop} onEditar={noop} onEliminar={noop} />);
    await userEvent.selectOptions(screen.getByLabelText("Cliente"), "c2");
    expect(rows()).toHaveLength(2); // Serv C + Curso D
    // Ganado ahora solo v4 (700)
    expect(within(screen.getByRole("group", { name: "Ganado" })).getByText("1")).toBeInTheDocument();
  });

  it("filtrar por periodo 'Últimos 7 días' descarta ventas viejas", async () => {
    render(<VentasListaView ventas={VENTAS} yo={DUENA} now={NOW} onAnadir={noop} onEditar={noop} onEliminar={noop} />);
    await userEvent.selectOptions(screen.getByLabelText("Periodo"), "7");
    // Solo v1 (-1d) y v4 (-2d) están dentro de 7 días.
    expect(rows()).toHaveLength(2);
    expect(chip(/Todas/)).toHaveTextContent("2");
  });
});

describe("VentasListaView · ⋮ gateado por D1", () => {
  it("dueña: Editar/Eliminar habilitados en cualquier venta", async () => {
    render(<VentasListaView ventas={VENTAS} yo={DUENA} now={NOW} onAnadir={noop} onEditar={noop} onEliminar={noop} />);
    const filaB = rows().find((r) => r.textContent?.includes("Plan B"))!; // venta de Elena
    await userEvent.click(within(filaB).getByRole("button", { name: /Acciones de Plan B/ }));
    expect(within(filaB).getByRole("menuitem", { name: /Editar/ })).toBeEnabled();
    expect(within(filaB).getByRole("menuitem", { name: /Eliminar/ })).toBeEnabled();
  });

  it("vendedor: acciones habilitadas en la suya, deshabilitadas en la ajena", async () => {
    const onEditar = vi.fn();
    render(<VentasListaView ventas={VENTAS} yo={VENDEDOR} now={NOW} onAnadir={noop} onEditar={onEditar} onEliminar={noop} />);
    // Propia (Carlos): Curso A
    const propia = rows().find((r) => r.textContent?.includes("Curso A"))!;
    await userEvent.click(within(propia).getByRole("button", { name: /Acciones de Curso A/ }));
    const editar = within(propia).getByRole("menuitem", { name: /Editar/ });
    expect(editar).toBeEnabled();
    await userEvent.click(editar);
    expect(onEditar).toHaveBeenCalledTimes(1);
    // Ajena (Elena): Plan B
    const ajena = rows().find((r) => r.textContent?.includes("Plan B"))!;
    await userEvent.click(within(ajena).getByRole("button", { name: /Acciones de Plan B/ }));
    expect(within(ajena).getByRole("menuitem", { name: /Editar/ })).toBeDisabled();
    expect(within(ajena).getByRole("menuitem", { name: /Eliminar/ })).toBeDisabled();
  });
});

describe("VentasListaView · estados vacíos", () => {
  it("sin ventas → 'Aún no hay ventas'", () => {
    render(<VentasListaView ventas={[]} yo={DUENA} now={NOW} onAnadir={noop} onEditar={noop} onEliminar={noop} />);
    expect(screen.getByText("Aún no hay ventas")).toBeInTheDocument();
    expect(rows()).toHaveLength(0);
  });

  it("con filtros sin coincidencias → 'Sin ventas que coincidan'", async () => {
    render(<VentasListaView ventas={VENTAS} yo={DUENA} now={NOW} onAnadir={noop} onEditar={noop} onEliminar={noop} />);
    await userEvent.selectOptions(screen.getByLabelText("Cliente"), "c1");
    await userEvent.click(chip(/Perdidas/)); // c1 no tiene perdidas
    expect(rows()).toHaveLength(0);
    expect(screen.getByText("Sin ventas que coincidan")).toBeInTheDocument();
  });
});
