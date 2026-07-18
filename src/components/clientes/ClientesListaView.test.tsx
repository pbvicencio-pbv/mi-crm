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

import { ClientesListaView, type ClienteFila } from "./ClientesListaView";

const CLIENTES: ClienteFila[] = [
  { _id: "c1" as any, nombre: "Ana Torres", telefono: "+52 33 3456 7890", canal: "instagram", prioridad: "baja", estado: "ganado" },
  { _id: "c2" as any, nombre: "Beto Ruiz", telefono: "+52 55 1111 2222", canal: "whatsapp", prioridad: "alta", estado: "en_negociacion" },
  { _id: "c3" as any, nombre: "Carla Díaz", telefono: "+52 81 9999 0000", canal: "email", prioridad: "alta", estado: "nuevo_lead" },
  { _id: "c4" as any, nombre: "Diego Luna", telefono: undefined, canal: "telefono", prioridad: "media", estado: "perdido" },
];

/** Cards visibles, en orden del DOM (excluye el enlace "Nuevo cliente" del encabezado). */
function cards() {
  return screen
    .getAllByRole("link")
    .filter((l) => /^\/clientes\/c/.test(l.getAttribute("href") || ""));
}

describe("ClientesListaView", () => {
  it("renderiza las cards con badges de canal, estado y prioridad", () => {
    render(<ClientesListaView clientes={CLIENTES} />);
    expect(cards()).toHaveLength(4);
    const beto = cards().find((c) => c.textContent?.includes("Beto Ruiz"))!;
    expect(within(beto).getByText("WhatsApp")).toBeInTheDocument();
    expect(within(beto).getByText("En negociación")).toBeInTheDocument();
    expect(within(beto).getByText("Alta")).toBeInTheDocument();
  });

  it("ordena por prioridad (Alta>Media>Baja) y luego por nombre", () => {
    render(<ClientesListaView clientes={CLIENTES} />);
    const orden = cards().map((c) => c.textContent);
    expect(orden[0]).toContain("Beto Ruiz"); // alta
    expect(orden[1]).toContain("Carla Díaz"); // alta
    expect(orden[2]).toContain("Diego Luna"); // media
    expect(orden[3]).toContain("Ana Torres"); // baja
  });

  it("cada card enlaza a la ficha del cliente", () => {
    render(<ClientesListaView clientes={CLIENTES} />);
    const ana = cards().find((c) => c.textContent?.includes("Ana Torres"))!;
    expect(ana).toHaveAttribute("href", "/clientes/c1");
  });

  it("busca por nombre", async () => {
    render(<ClientesListaView clientes={CLIENTES} />);
    await userEvent.type(screen.getByLabelText("Buscar clientes"), "carla");
    const c = cards();
    expect(c).toHaveLength(1);
    expect(c[0].textContent).toContain("Carla Díaz");
  });

  it("busca por teléfono", async () => {
    render(<ClientesListaView clientes={CLIENTES} />);
    await userEvent.type(screen.getByLabelText("Buscar clientes"), "1111");
    const c = cards();
    expect(c).toHaveLength(1);
    expect(c[0].textContent).toContain("Beto Ruiz");
  });

  it("filtra por prioridad (Alta) y combina con la búsqueda", async () => {
    render(<ClientesListaView clientes={CLIENTES} />);
    await userEvent.click(screen.getByRole("button", { name: "Alta" }));
    let c = cards();
    expect(c.map((x) => x.textContent).join("|")).toContain("Beto Ruiz");
    expect(c).toHaveLength(2); // Beto + Carla (ambos alta)
    // ahora AND con búsqueda:
    await userEvent.type(screen.getByLabelText("Buscar clientes"), "beto");
    c = cards();
    expect(c).toHaveLength(1);
    expect(c[0].textContent).toContain("Beto Ruiz");
  });

  it("sin coincidencias → 'Sin clientes que coincidan'", async () => {
    render(<ClientesListaView clientes={CLIENTES} />);
    await userEvent.type(screen.getByLabelText("Buscar clientes"), "zzz");
    expect(cards()).toHaveLength(0);
    expect(screen.getByText("Sin clientes que coincidan")).toBeInTheDocument();
  });

  it("limpiar búsqueda restaura la lista", async () => {
    render(<ClientesListaView clientes={CLIENTES} />);
    await userEvent.type(screen.getByLabelText("Buscar clientes"), "carla");
    expect(cards()).toHaveLength(1);
    await userEvent.click(screen.getByLabelText("Limpiar búsqueda"));
    expect(cards()).toHaveLength(4);
  });

  it("lista vacía → estado 'Aún no tienes clientes' con acceso a alta", () => {
    render(<ClientesListaView clientes={[]} />);
    expect(screen.getByText("Aún no tienes clientes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Añadir el primer cliente/ })).toHaveAttribute(
      "href",
      "/clientes/nuevo",
    );
  });
});
