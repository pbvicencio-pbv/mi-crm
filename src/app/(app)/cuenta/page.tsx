import { CuentaPerfil } from "@/components/cuenta/CuentaPerfil";

/**
 * P10 · Perfil / Mi cuenta (M2.4 · TAL-48).
 * Perfil (nombre/correo/rol), editar nombre, cambiar contraseña, cerrar sesión y
 * (solo dueña) acceso a Gestión de usuarios. Estados y lógica en <CuentaPerfil> (cliente).
 */
export default function CuentaPage() {
  return (
    <section>
      <h1 className="text-2xl font-extrabold tracking-tight">Mi cuenta</h1>
      <p className="mt-1 text-sm text-slate-500">Tus datos, acceso y sesión.</p>
      <div className="mt-5">
        <CuentaPerfil />
      </div>
    </section>
  );
}
