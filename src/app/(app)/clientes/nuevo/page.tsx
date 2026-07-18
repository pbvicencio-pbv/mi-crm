import { ClienteForm } from "@/components/clientes/ClienteForm";

/**
 * P5 · Nuevo cliente (M3.1 · TAL-11 + prioridad TAL-34/35).
 * Diseño: design/PROY CRM Pulse/ClienteForm.screen.dc.html.
 * El formulario (cliente) vive en <ClienteForm>; la escritura y la autorización, en Convex.
 */
export default function NuevoClientePage() {
  return <ClienteForm modo="alta" />;
}
