/**
 * P4 · Ficha 360 del cliente (M3.3 · TAL-13).
 * Diseño: design/PROY CRM Pulse/Ficha360.screen.dc.html (+ .gallery).
 * Datos (incl. cargo/ciudad/canal/propietario/prioridad/valor derivado), próximo seguimiento,
 * historial de interacciones y ventas, contacto multicanal de un toque.
 *
 * La ficha se carga reactiva en <FichaCliente> (query `clientes.ficha`); aquí solo se resuelve
 * el `params` (Promise en Next 15) y se delega.
 */
import { FichaCliente } from "@/components/clientes/FichaCliente";

export default async function FichaClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FichaCliente id={id} />;
}
