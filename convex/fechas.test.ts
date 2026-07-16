import { describe, it, expect } from "vitest";
import { calcularIntervalos } from "./lib/fechas";

const H = 3_600_000;
const serverNoonUTC = (fecha: string) => Date.parse(fecha + "T12:00:00Z");

describe("calcularIntervalos (DST-safe)", () => {
  it("día normal sin DST dura 24h", () => {
    const iv = calcularIntervalos(
      { timeZone: "America/Mexico_City", fechaLocal: "2026-06-15" },
      serverNoonUTC("2026-06-15"),
    );
    expect(iv.finHoy - iv.inicioHoy).toBe(24 * H);
  });

  it("spring forward en New York dura 23h", () => {
    const iv = calcularIntervalos(
      { timeZone: "America/New_York", fechaLocal: "2026-03-08" },
      serverNoonUTC("2026-03-08"),
    );
    expect(iv.finHoy - iv.inicioHoy).toBe(23 * H);
  });

  it("fall back en New York dura 25h", () => {
    const iv = calcularIntervalos(
      { timeZone: "America/New_York", fechaLocal: "2026-11-01" },
      serverNoonUTC("2026-11-01"),
    );
    expect(iv.finHoy - iv.inicioHoy).toBe(25 * H);
  });

  it("hasta > finHoy > inicioHoy", () => {
    const iv = calcularIntervalos({ timeZone: "UTC", fechaLocal: "2026-06-15" }, serverNoonUTC("2026-06-15"));
    expect(iv.finHoy).toBeGreaterThan(iv.inicioHoy);
    expect(iv.hasta).toBeGreaterThan(iv.finHoy);
  });

  it("rechaza argumentos incoherentes", () => {
    const now = serverNoonUTC("2026-06-15");
    expect(() => calcularIntervalos({ timeZone: "No/Zone", fechaLocal: "2026-06-15" }, now)).toThrow();
    expect(() => calcularIntervalos({ timeZone: "UTC", fechaLocal: "2026-13-40" }, now)).toThrow();
    expect(() => calcularIntervalos({ timeZone: "UTC", fechaLocal: "15/06/2026" }, now)).toThrow();
    expect(() =>
      calcularIntervalos({ timeZone: "UTC", fechaLocal: "2026-06-15", horizonteDias: 0 }, now),
    ).toThrow();
    expect(() =>
      calcularIntervalos({ timeZone: "UTC", fechaLocal: "2026-06-15", horizonteDias: 999 }, now),
    ).toThrow();
    // fechaLocal demasiado lejos del día del servidor
    expect(() => calcularIntervalos({ timeZone: "UTC", fechaLocal: "2020-01-01" }, now)).toThrow();
  });
});
