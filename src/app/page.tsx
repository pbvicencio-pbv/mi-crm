import { redirect } from "next/navigation";

/**
 * Raíz de la app. Tras el login se aterriza en la Agenda del día (/hoy).
 * La protección real de rutas (redirigir a /login si no hay sesión) se añade en M2.2 (TAL-10).
 */
export default function Home() {
  redirect("/hoy");
}
