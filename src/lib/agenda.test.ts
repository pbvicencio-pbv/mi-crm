import { describe, it, expect } from "vitest";
import { fechaLocal, msHastaProximaMedianoche } from "./agenda";

describe("fechaLocal (según zona)", () => {
  it("resuelve el día local correcto en distintas zonas", () => {
    const ts = Date.parse("2026-01-01T02:00:00Z");
    expect(fechaLocal(ts, "America/Mexico_City")).toBe("2025-12-31"); // UTC-6 → 20:00 del 31
    expect(fechaLocal(ts, "UTC")).toBe("2026-01-01");
    expect(fechaLocal(ts, "Asia/Tokyo")).toBe("2026-01-01"); // UTC+9 → 11:00 del 1
  });
});

describe("msHastaProximaMedianoche", () => {
  it("es positivo y no supera 24h en varias zonas", () => {
    const now = Date.parse("2026-06-15T15:30:00Z");
    for (const tz of ["UTC", "America/Mexico_City", "Asia/Tokyo", "America/New_York"]) {
      const ms = msHastaProximaMedianoche(now, tz);
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThanOrEqual(24 * 3_600_000);
    }
  });

  it("apunta exactamente a la próxima medianoche local", () => {
    const now = Date.parse("2026-06-15T18:00:00Z"); // 12:00 en Ciudad de México (UTC-6)
    const objetivo = Date.parse("2026-06-16T06:00:00Z"); // 00:00 del 16 en MX
    expect(now + msHastaProximaMedianoche(now, "America/Mexico_City")).toBe(objetivo);
  });
});
