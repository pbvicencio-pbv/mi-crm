import { EquipoAdmin } from "@/components/equipo/EquipoAdmin";

/**
 * P11 · Gestión de usuarios / Equipo (M2.3 · TAL-32). SOLO rol "duena".
 * El guard de rol (redirección) + los estados de carga viven en <EquipoAdmin> (cliente);
 * la seguridad real la imponen las funciones Convex (requireDuena, no RLS).
 */
export default function EquipoPage() {
  return (
    <section>
      <h1 className="text-2xl font-extrabold tracking-tight">Equipo</h1>
      <p className="mt-1 text-sm text-slate-500">Gestiona el acceso y el rol de tu equipo.</p>
      <div className="mt-5">
        <EquipoAdmin />
      </div>
    </section>
  );
}
