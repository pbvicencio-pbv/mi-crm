"use client";

/**
 * Error boundary de la ruta de preflight. Si `api.e2e.ping` LANZA (deployment sin `E2E_ALLOW_RESET`,
 * p. ej. prod), Convex propaga el error aquí y publicamos `data-e2e-ping="fail"`: el runner nunca ve
 * "ok", agota el timeout y ABORTA sin escribir nada. Fail-closed.
 */
export default function E2EPreflightError({ error }: { error: Error }) {
  return (
    <main data-e2e-ping="fail" style={{ fontFamily: "monospace", padding: 24 }}>
      <h1>E2E preflight</h1>
      <p>estado: fail</p>
      <p>{error?.message ?? "ping falló"}</p>
    </main>
  );
}
