import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

/**
 * Protección de rutas (M2.2 · TAL-10).
 *  - `/login` es público; con sesión activa redirige a la Agenda (`/hoy`).
 *  - `/e2e/preflight` es público SOLO en builds E2E (`NEXT_PUBLIC_E2E==="1"`, inlineada en build):
 *    lo necesita el preflight del runner ANTES del login. En prod la variable no existe → la
 *    excepción no aplica → la ruta cae en la protección normal (redirige a `/login`, sin marcadores).
 *  - Cualquier otra ruta exige sesión; sin ella redirige a `/login`.
 * La sesión persiste 30 días (`cookieConfig.maxAge`).
 */
const isLoginPage = createRouteMatcher(["/login"]);
const isE2EPreflight = createRouteMatcher(["/e2e/preflight"]);

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    if (process.env.NEXT_PUBLIC_E2E === "1" && isE2EPreflight(request)) return;
    const autenticado = await convexAuth.isAuthenticated();
    if (isLoginPage(request)) {
      if (autenticado) return nextjsMiddlewareRedirect(request, "/hoy");
      return;
    }
    if (!autenticado) return nextjsMiddlewareRedirect(request, "/login");
  },
  { cookieConfig: { maxAge: 60 * 60 * 24 * 30 } },
);

export const config = {
  // Corre en todas las rutas excepto estáticos y _next.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
