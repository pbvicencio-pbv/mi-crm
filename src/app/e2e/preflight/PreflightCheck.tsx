"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

/**
 * Ejecuta `api.e2e.ping` con el MISMO ConvexReactClient que usan todas las escrituras del front
 * (construido con `NEXT_PUBLIC_CONVEX_URL` inlineado). Publica el resultado en atributos `data-*`
 * que el runner lee para confirmar que su canal de escritura apunta a `E2E_CONVEX_URL`. Si `ping`
 * lanza (deployment sin `E2E_ALLOW_RESET`, p. ej. prod), el `error.tsx` de la ruta pinta
 * `data-e2e-ping="fail"` → el runner agota el timeout de "ok" y aborta sin escribir.
 */
export function PreflightCheck() {
  const ping = useQuery(api.e2e.ping, {});
  const estado = ping === undefined ? "loading" : "ok";
  return (
    <main
      data-e2e-ping={estado}
      data-cloud-url={ping?.cloudUrl ?? ""}
      style={{ fontFamily: "monospace", padding: 24 }}
    >
      <h1>E2E preflight</h1>
      <p>estado: {estado}</p>
      {ping?.cloudUrl && <p>cloudUrl: {ping.cloudUrl}</p>}
    </main>
  );
}
