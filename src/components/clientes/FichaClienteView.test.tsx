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

import { FichaClienteView, type Ficha } from "./FichaClienteView";

const NOW = 1_710_100_000_000;

const LLENA: Ficha = {
  _id: "c1" as any,
  nombre: "Laura Fernández",
  telefono: "+52 55 1234 5678",
  email: "laura@innovatech.mx",
  empresa: "Innovatech",
  cargo: "Directora de compras",
  ciudad: "CDMX",
  canal: "whatsapp",
  origen: "recomendacion",
  notas: "Prefiere que le llamen por la tarde.",
  prioridad: "alta",
  estado: "en_negociacion",
  valor: 284000,
  propietarioNombre: "Ricardo Salas",
  creadoEn: 1_700_000_000_000,
  ultimoContacto: 1_710_000_000_000,
  proximoSeguimiento: {
    _id: "s1" as any,
    motivo: "Llamar para cierre de contrato",
    fechaObjetivo: 1_710_200_000_000,
  },
  interacciones: [
    {
      _id: "i1" as any,
      tipo: "llamada",
      canal: "telefono",
      nota: "Confirmó interés en el plan anual.",
      fecha: 1_710_000_000_000,
      autorNombre: "Ricardo Salas",
    },
    {
      _id: "i2" as any,
      tipo: "mensaje",
      canal: "whatsapp",
      nota: null, // sin nota → cae al medio
      fecha: 1_709_900_000_000,
      autorNombre: "Elena Vargas",
    },
  ],
  ventas: [
    {
      _id: "v1" as any,
      producto: "Plan Pro anual",
      fecha: 1_709_000_000_000,
      total: 284000,
      vendedorNombre: "Ricardo Salas",
    },
  ],
};

const VACIA: Ficha = {
  _id: "c2" as any,
  nombre: "Daniel Ortega",
  telefono: undefined,
  email: undefined,
  empresa: undefined,
  cargo: undefined,
  ciudad: undefined,
  canal: "instagram",
  origen: undefined,
  notas: undefined,
  prioridad: "media",
  estado: "nuevo_lead",
  valor: 0,
  propietarioNombre: "Ricardo Salas",
  creadoEn: 1_700_000_000_000,
  ultimoContacto: null,
  proximoSeguimiento: null,
  interacciones: [],
  ventas: [],
};

describe("FichaClienteView · escenario poblado", () => {
  it("muestra nombre, valor derivado y badges de estado/canal/prioridad", () => {
    render(<FichaClienteView ficha={LLENA} now={NOW} />);
    expect(screen.getByRole("heading", { name: "Laura Fernández" })).toBeInTheDocument();
    expect(screen.getAllByText("$284K").length).toBeGreaterThanOrEqual(1); // valor + venta
    expect(screen.getByText("En negociación")).toBeInTheDocument();
    // "WhatsApp" aparece como badge de canal y como botón de contacto.
    expect(screen.getAllByText("WhatsApp").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Alta")).toBeInTheDocument();
  });

  it("contacto multicanal con hrefs correctos (teléfono saneado en wa.me)", () => {
    render(<FichaClienteView ficha={LLENA} now={NOW} />);
    expect(screen.getByLabelText("WhatsApp")).toHaveAttribute(
      "href",
      "https://wa.me/525512345678",
    );
    expect(screen.getByLabelText("WhatsApp")).toHaveAttribute("target", "_blank");
    expect(screen.getByLabelText("Llamar")).toHaveAttribute("href", "tel:+52 55 1234 5678");
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "href",
      "mailto:laura@innovatech.mx",
    );
  });

  it("enlaza a la edición del cliente", () => {
    render(<FichaClienteView ficha={LLENA} now={NOW} />);
    expect(screen.getByRole("link", { name: /Editar/ })).toHaveAttribute(
      "href",
      "/clientes/c1/editar",
    );
  });

  it("puebla interacciones (nota o medio) y ventas con su total", () => {
    render(<FichaClienteView ficha={LLENA} now={NOW} />);
    expect(screen.getByText("Confirmó interés en el plan anual.")).toBeInTheDocument();
    expect(screen.getByText("Mensaje")).toBeInTheDocument(); // interacción sin nota → medio
    expect(screen.getByText(/Elena Vargas/)).toBeInTheDocument(); // va junto a la fecha (fecha · autor)
    expect(screen.getByText("Plan Pro anual")).toBeInTheDocument();
    expect(screen.getByText("Llamar para cierre de contrato")).toBeInTheDocument();
    expect(screen.getByText("Propietario")).toBeInTheDocument();
    expect(screen.getByText("Último contacto")).toBeInTheDocument();
  });

  it("las acciones de M4/M5 están deshabilitadas (disabled real, no solo estilo)", () => {
    render(<FichaClienteView ficha={LLENA} now={NOW} />);
    expect(screen.getByRole("button", { name: "Anotar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Registrar" })).toBeDisabled();
    expect(screen.getByLabelText("Marcar hecho")).toBeDisabled();
  });
});

describe("FichaClienteView · botones de contacto ocultos si falta el dato", () => {
  it("sin teléfono y sin email → no hay ningún botón de contacto", () => {
    render(<FichaClienteView ficha={VACIA} now={NOW} />);
    expect(screen.queryByLabelText("WhatsApp")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Llamar")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("con email pero sin teléfono → solo Email", () => {
    render(<FichaClienteView ficha={{ ...VACIA, email: "d@x.mx" }} now={NOW} />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("href", "mailto:d@x.mx");
    expect(screen.queryByLabelText("WhatsApp")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Llamar")).not.toBeInTheDocument();
  });

  it("con teléfono pero sin email → WhatsApp y Llamar, sin Email", () => {
    render(<FichaClienteView ficha={{ ...VACIA, telefono: "5599" }} now={NOW} />);
    expect(screen.getByLabelText("WhatsApp")).toHaveAttribute("href", "https://wa.me/5599");
    expect(screen.getByLabelText("Llamar")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });
});

describe("FichaClienteView · escenario vacío", () => {
  it("muestra '—' en datos faltantes y estados vacíos por sección", () => {
    render(<FichaClienteView ficha={VACIA} now={NOW} />);
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1); // empresa/ciudad/tel…
    expect(screen.getByText("Sin seguimiento programado.")).toBeInTheDocument();
    expect(screen.getByText("Aún no hay interacciones registradas.")).toBeInTheDocument();
    expect(screen.getByText("Aún no hay ventas registradas.")).toBeInTheDocument();
  });

  it("los CTAs vacíos están deshabilitados (disabled real)", () => {
    render(<FichaClienteView ficha={VACIA} now={NOW} />);
    expect(screen.getByRole("button", { name: /Programar seguimiento/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Anotar interacción/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Registrar venta/ })).toBeDisabled();
  });
});

describe("FichaClienteView · CTAs de interacción con onAnotarInteraccion", () => {
  it("con historial: 'Anotar' habilitado y al pulsarlo invoca el callback", async () => {
    const onAnotar = vi.fn();
    render(<FichaClienteView ficha={LLENA} now={NOW} onAnotarInteraccion={onAnotar} />);
    const btn = screen.getByRole("button", { name: "Anotar" });
    expect(btn).toBeEnabled();
    await userEvent.click(btn);
    expect(onAnotar).toHaveBeenCalledTimes(1);
  });

  it("sin interacciones: 'Anotar interacción' habilitado y dispara el callback", async () => {
    const onAnotar = vi.fn();
    render(<FichaClienteView ficha={VACIA} now={NOW} onAnotarInteraccion={onAnotar} />);
    const btn = screen.getByRole("button", { name: /Anotar interacción/ });
    expect(btn).toBeEnabled();
    await userEvent.click(btn);
    expect(onAnotar).toHaveBeenCalledTimes(1);
  });

  it("las CTAs de seguimiento y venta siguen deshabilitadas aunque se registre interacción", () => {
    render(<FichaClienteView ficha={VACIA} now={NOW} onAnotarInteraccion={() => {}} />);
    expect(screen.getByRole("button", { name: /Programar seguimiento/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Registrar venta/ })).toBeDisabled();
  });
});

describe("FichaClienteView · CTA de programar seguimiento", () => {
  it("con onProgramarSeguimiento: la CTA vacía se habilita y dispara el callback", async () => {
    const onProg = vi.fn();
    render(<FichaClienteView ficha={VACIA} now={NOW} onProgramarSeguimiento={onProg} />);
    const btn = screen.getByRole("button", { name: /Programar seguimiento/ });
    expect(btn).toBeEnabled();
    await userEvent.click(btn);
    expect(onProg).toHaveBeenCalledTimes(1);
  });

  it("la CTA de venta sigue deshabilitada aunque se pueda programar seguimiento", () => {
    render(<FichaClienteView ficha={VACIA} now={NOW} onProgramarSeguimiento={() => {}} />);
    expect(screen.getByRole("button", { name: /Registrar venta/ })).toBeDisabled();
  });
});

describe("FichaClienteView · Marcar hecho (cerrar seguimiento)", () => {
  it("con onCerrarSeguimiento: 'Marcar hecho' habilitado y al pulsarlo invoca el callback", async () => {
    const onCerrar = vi.fn();
    render(<FichaClienteView ficha={LLENA} now={NOW} onCerrarSeguimiento={onCerrar} />);
    const btn = screen.getByRole("button", { name: "Marcar hecho" });
    expect(btn).toBeEnabled();
    await userEvent.click(btn);
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("mientras cierra queda deshabilitado (evita doble toque)", () => {
    render(
      <FichaClienteView ficha={LLENA} now={NOW} onCerrarSeguimiento={() => {}} cerrandoSeguimiento />,
    );
    expect(screen.getByRole("button", { name: "Marcar hecho" })).toBeDisabled();
  });

  it("sin callback: 'Marcar hecho' sigue deshabilitado", () => {
    render(<FichaClienteView ficha={LLENA} now={NOW} />);
    expect(screen.getByRole("button", { name: "Marcar hecho" })).toBeDisabled();
  });
});

describe("FichaClienteView · Registrar venta (P8 · TAL-18)", () => {
  it("con onRegistrarVenta y ventas: 'Registrar' habilitado y dispara el callback", async () => {
    const onRegistrar = vi.fn();
    render(<FichaClienteView ficha={LLENA} now={NOW} onRegistrarVenta={onRegistrar} />);
    const btn = screen.getByRole("button", { name: "Registrar" });
    expect(btn).toBeEnabled();
    await userEvent.click(btn);
    expect(onRegistrar).toHaveBeenCalledTimes(1);
  });

  it("sin ventas: 'Registrar venta' habilitado y dispara el callback", async () => {
    const onRegistrar = vi.fn();
    render(<FichaClienteView ficha={VACIA} now={NOW} onRegistrarVenta={onRegistrar} />);
    const btn = screen.getByRole("button", { name: /Registrar venta/ });
    expect(btn).toBeEnabled();
    await userEvent.click(btn);
    expect(onRegistrar).toHaveBeenCalledTimes(1);
  });

  it("sin callback: las CTAs de venta siguen deshabilitadas", () => {
    render(<FichaClienteView ficha={LLENA} now={NOW} />);
    expect(screen.getByRole("button", { name: "Registrar" })).toBeDisabled();
  });
});

describe("FichaClienteView · Eliminar cliente (archivar · TAL-59)", () => {
  it("con onArchivar: 'Eliminar cliente' habilitado y al pulsarlo invoca el callback", async () => {
    const onArchivar = vi.fn();
    render(<FichaClienteView ficha={LLENA} now={NOW} onArchivar={onArchivar} />);
    const btn = screen.getByRole("button", { name: /Eliminar cliente/ });
    expect(btn).toBeEnabled();
    await userEvent.click(btn);
    expect(onArchivar).toHaveBeenCalledTimes(1);
  });

  it("mientras archiva: el botón queda deshabilitado y muestra 'Archivando…'", () => {
    render(<FichaClienteView ficha={LLENA} now={NOW} onArchivar={() => {}} archivando />);
    expect(screen.getByRole("button", { name: /Archivando…/ })).toBeDisabled();
  });

  it("sin callback: 'Eliminar cliente' sigue deshabilitado", () => {
    render(<FichaClienteView ficha={LLENA} now={NOW} />);
    expect(screen.getByRole("button", { name: /Eliminar cliente/ })).toBeDisabled();
  });
});
