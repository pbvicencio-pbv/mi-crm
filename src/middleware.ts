import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

/**
 * Protección de rutas (M2.2 · TAL-10).
 *  - `/login` es público; con sesión activa redirige a la Agenda (`/hoy`).
 *  - Cualquier otra ruta exige sesión; sin ella redirige a `/login`.
 * La sesión persiste 30 días (`cookieConfig.maxAge`).
 */
const isLoginPage = createRouteMatcher(["/login"]);

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
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
