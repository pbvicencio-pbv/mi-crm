import { ClientesLista } from "@/components/clientes/ClientesLista";

/**
 * P3 · Lista de clientes (M3.2 · TAL-12 + orden/filtro por prioridad TAL-36).
 * Diseño: design/PROY CRM Pulse/ClientesLista.screen.dc.html.
 * Datos reactivos en <ClientesLista> (contenedor); búsqueda/orden/filtro en la vista pura.
 */
export default function ClientesPage() {
  return <ClientesLista />;
}
