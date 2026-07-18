import { redirect } from "next/navigation";

/**
 * Raíz de la app. Tras el login se aterriza en la Agenda del día (/hoy).
 * La protección de rutas (redirigir a /login sin sesión) vive en `middleware.ts` (M2.2 · TAL-10).
 */
export default function Home() {
  redirect("/hoy");
}
