"use client";

/**
 * P1 · Login (M2.2 · TAL-10).
 * Diseño de referencia: design/PROY CRM Pulse/LoginScreen.dc.html
 * (split escritorio / franja móvil; estados normal / error / cargando; toggle de contraseña).
 *
 * Acceso vía Convex Auth (Password), flujo signIn. NO hay auto-registro (bloqueado en servidor).
 */
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Activity, AlertCircle, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const PANEL_BG = {
  backgroundColor: "#4F46E5",
  backgroundImage:
    "radial-gradient(120% 90% at 18% 12%, rgba(255,255,255,.16), rgba(255,255,255,0) 60%)",
} as const;

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(false);
    setLoading(true);
    try {
      await signIn("password", {
        email: email.trim().toLowerCase(),
        password,
        flow: "signIn",
      });
      router.push("/hoy");
    } catch {
      // En producción el mensaje real se redacta: mostramos copy propio ante cualquier rechazo.
      setError(true);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-[#F8FAFC]">
      {/* Panel de marca — escritorio */}
      <aside
        className="hidden w-[44%] max-w-[520px] flex-col justify-between p-10 text-white md:flex"
        style={PANEL_BG}
      >
        <div className="flex items-center gap-2.5">
          <Activity size={26} strokeWidth={2.4} />
          <span className="text-[22px] font-extrabold tracking-tight">
            Pulse<span className="opacity-70">.</span>
          </span>
        </div>
        <div>
          <div className="text-3xl font-extrabold leading-tight tracking-tight text-balance">
            Tu pipeline, siempre al pulso.
          </div>
          <p className="mt-3.5 max-w-[340px] text-[15px] leading-relaxed text-white/80">
            Gestiona contactos, mueve tratos y cierra más rápido — todo en un espacio de trabajo
            tranquilo.
          </p>
        </div>
        <div className="text-xs text-white/60">Pulse CRM · Espacio de ventas</div>
      </aside>

      {/* Formulario */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Franja de marca — móvil */}
        <div className="px-5 pb-5 pt-6 text-white md:hidden" style={PANEL_BG}>
          <div className="mb-3 flex items-center gap-2.5">
            <Activity size={22} strokeWidth={2.4} />
            <span className="text-[19px] font-extrabold tracking-tight">
              Pulse<span className="opacity-70">.</span>
            </span>
          </div>
          <div className="text-xl font-extrabold leading-tight tracking-tight">
            Tu pipeline, siempre al pulso.
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-[420px]">
            <div className="mb-5">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Bienvenido de nuevo
              </h1>
              <p className="mt-1.5 text-sm text-slate-600">Inicia sesión en tu espacio de trabajo.</p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 flex items-center gap-2.5 rounded-md border border-danger-border bg-danger-bg px-3 py-2.5"
              >
                <AlertCircle size={16} className="flex-none text-danger" />
                <span className="text-[13px] font-semibold text-danger">
                  Correo o contraseña incorrectos
                </span>
              </div>
            )}

            <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
              <Input
                label="Correo"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@empresa.mx"
                prefix={<Mail size={16} />}
                error={error}
              />
              <Input
                label="Contraseña"
                type={showPw ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                error={error}
                suffix={
                  <button
                    type="button"
                    aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onClick={() => setShowPw((v) => !v)}
                    className="flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={loading}
                iconLeft={loading ? <Loader2 size={17} className="animate-spin" /> : undefined}
              >
                {loading ? "Entrando…" : "Entrar"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
