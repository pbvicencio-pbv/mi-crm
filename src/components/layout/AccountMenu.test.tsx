import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const h = vi.hoisted(() => ({
  user: { _id: "u1", nombre: "Elena Vargas", email: "elena@x.test", rol: "duena" } as {
    _id: string;
    nombre: string;
    email: string;
    rol: "duena" | "vendedor";
  } | null,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...p }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...p}>
      {children}
    </a>
  ),
}));
vi.mock("convex/react", () => ({ useQuery: () => h.user }));

import { AccountMenu } from "./AccountMenu";

beforeEach(() => {
  h.user = { _id: "u1", nombre: "Elena Vargas", email: "elena@x.test", rol: "duena" };
});

describe("AccountMenu (accesibilidad)", () => {
  it("abre y cierra con aria-expanded y tecla Escape", async () => {
    render(<AccountMenu variant="sidebar" />);
    const trigger = screen.getByRole("button");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /mi cuenta/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /cerrar sesión/i })).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("la dueña ve Equipo; el vendedor no", async () => {
    render(<AccountMenu variant="topbar" />);
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("menuitem", { name: /equipo/i })).toBeInTheDocument();
  });

  it("un vendedor no ve Equipo en el menú", async () => {
    h.user = { _id: "u2", nombre: "Carlos Méndez", email: "carlos@x.test", rol: "vendedor" };
    render(<AccountMenu variant="topbar" />);
    await userEvent.click(screen.getByRole("button"));
    expect(screen.queryByRole("menuitem", { name: /equipo/i })).toBeNull();
    expect(screen.getByRole("menuitem", { name: /mi cuenta/i })).toBeInTheDocument();
  });

  it("teclado: foco inicial, flechas, Home/End y Escape restaura el foco", async () => {
    render(<AccountMenu variant="sidebar" />);
    const trigger = screen.getByRole("button");
    await userEvent.click(trigger);
    const items = screen.getAllByRole("menuitem");

    expect(items[0]).toHaveFocus(); // foco inicial en el primer ítem
    await userEvent.keyboard("{ArrowDown}");
    expect(items[1]).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(items[items.length - 1]).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(items[0]).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    expect(items[items.length - 1]).toHaveFocus(); // envuelve al final

    await userEvent.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus(); // Escape restaura el foco al disparador
  });
});
