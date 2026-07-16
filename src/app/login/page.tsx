/**
 * P1 · Login (M2.2 · TAL-10).
 * Diseño de referencia: design/PROY CRM Pulse/LoginScreen.dc.html
 * (estados normal/error/loading; modos split escritorio / mobile).
 */
export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-2 px-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Bienvenido de nuevo</h1>
      <p className="text-sm text-slate-600">Inicia sesión en tu espacio de trabajo.</p>
      <p className="mt-6 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        Placeholder de andamiaje. Implementar el formulario de acceso (Convex Auth · Password) en TAL-10.
      </p>
    </main>
  );
}
