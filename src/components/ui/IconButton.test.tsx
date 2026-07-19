import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { IconButton } from "./IconButton";

describe("IconButton", () => {
  it("expone aria-label y área táctil 44×44 (h-11 w-11)", () => {
    render(
      <IconButton label="Cerrar">
        <svg />
      </IconButton>,
    );
    const btn = screen.getByRole("button", { name: "Cerrar" });
    expect(btn).toHaveClass("h-11", "w-11");
  });

  it("dispara onClick y respeta disabled", async () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <IconButton label="Acción" onClick={onClick}>
        <svg />
      </IconButton>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Acción" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(
      <IconButton label="Acción" onClick={onClick} disabled>
        <svg />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Acción" })).toBeDisabled();
  });

  it("tono danger aplica color de peligro", () => {
    render(
      <IconButton label="Eliminar" tono="danger">
        <svg />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Eliminar" })).toHaveClass("text-danger");
  });
});
