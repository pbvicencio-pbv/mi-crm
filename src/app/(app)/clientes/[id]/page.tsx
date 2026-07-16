/**
 * P4 · Ficha 360 del cliente (M3.3 · TAL-13).
 * Diseño: design/PROY CRM Pulse/Ficha360.screen.dc.html (+ .gallery).
 * Datos (incl. cargo/ciudad/canal/propietario/prioridad/valor derivado), próximo seguimiento,
 * historial de interacciones y ventas, contacto multicanal de un toque.
 */
// Next 15: `params` es un Promise en las páginas dinámicas.
export default async function FichaClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <section>
      <h1 className="text-2xl font-extrabold tracking-tight">Ficha de cliente</h1>
      <p className="mt-1 text-sm text-slate-500">
        Placeholder — Ficha 360 (TAL-13). Cliente: <span className="mono">{id}</span>
      </p>
    </section>
  );
}
