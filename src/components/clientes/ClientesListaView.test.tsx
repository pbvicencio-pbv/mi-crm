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

/** Cada card es un <article> (patrón stretched-link + menú ⋮). En orden del DOM. */
function cards() {
  return screen.queryAllByRole("article");
}
const cardDe = (nombre: string) => cards().find((c) => c.textContent?.includes(nombre))!;

describe("ClientesListaView", () => {
  it("renderiza las cards con badges de canal, estado y prioridad", () => {
    render(<ClientesListaView clientes={CLIENTES} />);
    expect(cards()).toHaveLength(4);
    const beto = cardDe("Beto Ruiz");
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

  it("el nombre de cada card enlaza a la ficha del cliente", () => {
    render(<ClientesListaView clientes={CLIENTES} />);
    // Menú cerrado → el único enlace de la card es el del nombre (stretched-link).
    expect(within(cardDe("Ana Torres")).getByRole("link")).toHaveAttribute("href", "/clientes/c1");
  });

  it("busca por nombre", async () => {
    render(<ClientesListaView clientes={CLIENTES} />);
    await userEvent.type(screen.getByLabelText("Buscar clientes"), "carla");
    expect(cards()).toHaveLength(1);
    expect(cards()[0].textContent).toContain("Carla Díaz");
  });

  it("busca por teléfono", async () => {
    render(<ClientesListaView clientes={CLIENTES} />);
    await userEvent.type(screen.getByLabelText("Buscar clientes"), "1111");
    expect(cards()).toHaveLength(1);
    expect(cards()[0].textContent).toContain("Beto Ruiz");
  });

  it("filtra por prioridad (Alta) y combina con la búsqueda", async () => {
    render(<ClientesListaView clientes={CLIENTES} />);
    await userEvent.click(screen.getByRole("button", { name: "Alta" }));
    expect(cards()).toHaveLength(2); // Beto + Carla (ambos alta)
    await userEvent.type(screen.getByLabelText("Buscar clientes"), "beto");
    expect(cards()).toHaveLength(1);
    expect(cards()[0].textContent).toContain("Beto Ruiz");
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

describe("ClientesListaView · menú ⋮ (Editar / Eliminar · TAL-59)", () => {
  it("el menú está cerrado por defecto (sin opciones visibles)", () => {
    render(<ClientesListaView clientes={CLIENTES} onArchivar={() => {}} />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("abre el menú y ofrece Editar (con href) y Eliminar", async () => {
    render(<ClientesListaView clientes={CLIENTES} onArchivar={() => {}} />);
    const beto = cardDe("Beto Ruiz");
    await userEvent.click(within(beto).getByRole("button", { name: "Acciones de Beto Ruiz" }));
    // Editar/Eliminar exponen role="menuitem" (dentro de un role="menu").
    expect(within(beto).getByRole("menuitem", { name: /Editar/ })).toHaveAttribute(
      "href",
      "/clientes/c2/editar",
    );
    expect(within(beto).getByRole("menuitem", { name: /Eliminar/ })).toBeEnabled();
  });

  it("'Eliminar' invoca onArchivar con el cliente y cierra el menú", async () => {
    const onArchivar = vi.fn();
    render(<ClientesListaView clientes={CLIENTES} onArchivar={onArchivar} />);
    const beto = cardDe("Beto Ruiz");
    await userEvent.click(within(beto).getByRole("button", { name: "Acciones de Beto Ruiz" }));
    await userEvent.click(within(beto).getByRole("menuitem", { name: /Eliminar/ }));
    expect(onArchivar).toHaveBeenCalledTimes(1);
    expect(onArchivar).toHaveBeenCalledWith(expect.objectContaining({ _id: "c2", nombre: "Beto Ruiz" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument(); // se cerró
  });

  it("sin onArchivar: 'Eliminar' queda deshabilitado", async () => {
    render(<ClientesListaView clientes={CLIENTES} />);
    const beto = cardDe("Beto Ruiz");
    await userEvent.click(within(beto).getByRole("button", { name: "Acciones de Beto Ruiz" }));
    expect(within(beto).getByRole("menuitem", { name: /Eliminar/ })).toBeDisabled();
  });

  it("Escape cierra el menú", async () => {
    render(<ClientesListaView clientes={CLIENTES} onArchivar={() => {}} />);
    const beto = cardDe("Beto Ruiz");
    await userEvent.click(within(beto).getByRole("button", { name: "Acciones de Beto Ruiz" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
