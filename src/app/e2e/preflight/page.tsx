import { notFound } from "next/navigation";
import { PreflightCheck } from "./PreflightCheck";

// Ruta de preflight de E2E (TAL-20). Solo existe para que el runner verifique, ANTES de escribir,
// que el canal de escritura del front apunta al desechable. Doble gate fail-closed:
//  - el middleware la deja pública únicamente si NEXT_PUBLIC_E2E==="1";
//  - aquí, si el build NO es E2E, respondemos 404 (sin marcadores). En prod es inerte.
export default function E2EPreflightPage() {
  if (process.env.NEXT_PUBLIC_E2E !== "1") notFound();
  return <PreflightCheck />;
}
