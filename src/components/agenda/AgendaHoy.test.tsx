import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";

type Seccion = { results: any[]; status: string; loadMore: (n: number) => void };

const h = vi.hoisted(() => ({
  user: { _id: "u1", nombre: "Elena Vargas", email: "e@x", rol: "duena" } as any,
  vencidos: { results: [], status: "Exhausted", loadMore: () => {} } as Seccion,
  hoy: { results: [], status: "Exhausted", loadMore: () => {} } as Seccion,
  proximas: { results: [], status: "Exhausted", loadMore: () => {} } as Seccion,
  mutation: (..._: any[]): Promise<any> => Promise.resolve({ ok: true, yaCerrado: false }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...p }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...p}>
      {children}
    </a>
  ),
}));
vi.mock("convex/react", () => ({
  useQuery: () => h.user,
  useMutation: () => h.mutation,
  usePaginatedQuery: (query: any) => {
    const n = getFunctionName(query);
    if (n.includes("agendaVencidos")) return h.vencidos;
    if (n.includes("agendaProximas")) return h.proximas;
    return h.hoy; // agendaHoy
  },
}));

import { AgendaHoy } from "./AgendaHoy";

const AUTO_MAX = 5;
const vacExhausted = (): Seccion => ({ results: [], status: "Exhausted", loadMore: () => {} });

beforeEach(() => {
  h.user = { _id: "u1", nombre: "Elena Vargas", email: "e@x", rol: "duena" };
  h.vencidos = vacExhausted();
  h.hoy = vacExhausted();
  h.proximas = vacExhausted();
  h.mutation = () => Promise.resolve({ ok: true, yaCerrado: false });
});

describe("AgendaHoy", () => {
  it("«Todo al día» solo con las 3 secciones agotadas y vacías", async () => {
    render(<AgendaHoy />);
    expect(await screen.findByText("Todo al día")).toBeInTheDocument();
  });

  it("2 Exhausted vacías + 1 CanLoadMore vacía ⇒ NO muestra «Todo al día»", async () => {
    h.hoy = { results: [], status: "CanLoadMore", loadMore: vi.fn() };
    // vencidos y proximas quedan Exhausted vacías (beforeEach)
    render(<AgendaHoy />);
    await waitFor(() => expect(screen.getAllByText("Mostrar más").length).toBeGreaterThanOrEqual(1));
    expect(screen.queryByText("Todo al día")).toBeNull();
  });

  it("autoavance capado a AUTO_MAX POR SECCIÓN", async () => {
    const lmV = vi.fn();
    const lmH = vi.fn();
    const lmP = vi.fn();
    h.vencidos = { results: [], status: "CanLoadMore", loadMore: lmV };
    h.hoy = { results: [], status: "CanLoadMore", loadMore: lmH };
    h.proximas = { results: [], status: "CanLoadMore", loadMore: lmP };
    render(<AgendaHoy />);
    await waitFor(() => {
      expect(lmV).toHaveBeenCalledTimes(AUTO_MAX);
      expect(lmH).toHaveBeenCalledTimes(AUTO_MAX);
      expect(lmP).toHaveBeenCalledTimes(AUTO_MAX);
    });
    expect(screen.queryByText("Todo al día")).toBeNull();
  });

  it("reinicia el autoavance al cambiar la clave de consulta (usuario)", async () => {
    const lmH = vi.fn();
    h.hoy = { results: [], status: "CanLoadMore", loadMore: lmH };
    const { rerender } = render(<AgendaHoy />);
    await waitFor(() => expect(lmH).toHaveBeenCalledTimes(AUTO_MAX));
    h.user = { _id: "u2", nombre: "Carlos", email: "c@x", rol: "vendedor" };
    rerender(<AgendaHoy />);
    await waitFor(() => expect(lmH.mock.calls.length).toBeGreaterThan(AUTO_MAX));
  });

  it("doble clic real en «Marcar hecho» invoca la mutation una sola vez", async () => {
    const mutation = vi.fn(() => new Promise(() => {})); // queda pendiente tras el primer clic
    h.mutation = mutation;
    h.hoy = {
      results: [
        {
          seguimientoId: "s1",
          clienteId: "c1",
          nombre: "Laura",
          motivo: "m",
          fechaObjetivo: Date.now(),
          estadoCliente: "nuevo_lead",
        },
      ],
      status: "Exhausted",
      loadMore: vi.fn(),
    };
    render(<AgendaHoy />);
    await userEvent.dblClick(screen.getByRole("button", { name: /marcar hecho/i }));
    expect(mutation).toHaveBeenCalledTimes(1);
  });
});
