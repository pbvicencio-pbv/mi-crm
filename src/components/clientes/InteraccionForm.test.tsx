import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { InteraccionForm } from "./InteraccionForm";

function montar(over: Partial<Parameters<typeof InteraccionForm>[0]> = {}) {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(<InteraccionForm guardando={false} onCancel={onCancel} onSubmit={onSubmit} {...over} />);
  return { onSubmit, onCancel };
}

describe("InteraccionForm · derivación del medio (banda)", () => {
  it("por defecto Tipo=Llamada → 'Se registrará como Llamada'", () => {
    montar();
    expect(screen.getByRole("status")).toHaveTextContent("Se registrará como Llamada");
  });

  it("Mensaje + canal WhatsApp → 'WhatsApp'", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Mensaje" }));
    await userEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    expect(screen.getByRole("status")).toHaveTextContent("Se registrará como WhatsApp");
  });

  it("Mensaje sin canal → 'Mensaje'", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Mensaje" }));
    expect(screen.getByRole("status")).toHaveTextContent("Se registrará como Mensaje");
  });

  it("Visita → 'En persona' (aunque haya canal marcado)", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    await userEvent.click(screen.getByRole("button", { name: "Visita" }));
    expect(screen.getByRole("status")).toHaveTextContent("Se registrará como En persona");
  });
});

describe("InteraccionForm · submit", () => {
  it("sin cambiar la fecha → onSubmit NO envía fecha (server usa Date.now())", async () => {
    const { onSubmit } = montar();
    await userEvent.type(screen.getByLabelText("¿Qué pasó?"), "Hablamos del plan");
    await userEvent.click(screen.getByRole("button", { name: "Guardar interacción" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const arg = onSubmit.mock.calls[0][0];
    expect(arg.tipo).toBe("llamada");
    expect(arg.nota).toBe("Hablamos del plan");
    expect(arg.canal).toBeUndefined();
    expect(arg.fecha).toBeUndefined();
  });

  it("canal solo viaja cuando Tipo=Mensaje", async () => {
    const { onSubmit } = montar();
    // Selecciono WhatsApp pero con Tipo=Visita → canal descartado.
    await userEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    await userEvent.click(screen.getByRole("button", { name: "Visita" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar interacción" }));
    expect(onSubmit.mock.calls[0][0].canal).toBeUndefined();
  });

  it("Mensaje + WhatsApp → onSubmit envía canal='whatsapp'", async () => {
    const { onSubmit } = montar();
    await userEvent.click(screen.getByRole("button", { name: "Mensaje" }));
    await userEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar interacción" }));
    expect(onSubmit.mock.calls[0][0].canal).toBe("whatsapp");
  });

  it("fecha cambiada a un día pasado → onSubmit envía el MEDIODÍA local de ese día", async () => {
    const { onSubmit } = montar();
    fireEvent.change(screen.getByLabelText("Fecha"), { target: { value: "2020-01-15" } });
    await userEvent.click(screen.getByRole("button", { name: "Guardar interacción" }));
    const { fecha } = onSubmit.mock.calls[0][0];
    const esperado = new Date(2020, 0, 15, 12, 0, 0, 0).getTime();
    expect(fecha).toBe(esperado);
    const d = new Date(fecha);
    expect(d.getHours()).toBe(12); // mediodía local, no medianoche
    expect(d.getFullYear()).toBe(2020);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(15);
  });

  it("mientras guarda, el botón queda deshabilitado", async () => {
    const { onSubmit } = montar({ guardando: true });
    const btn = screen.getByRole("button", { name: /guardando/i });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
