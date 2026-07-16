import { CalendarDays, Users, BarChart3, UserCheck, type LucideIcon } from "lucide-react";

/** Navegación del App Shell (TAL-8). `soloDuena` = visible solo para rol dueña. */
export type NavItem = { href: string; label: string; icon: LucideIcon; soloDuena?: boolean };

export const NAV_ITEMS: NavItem[] = [
  { href: "/hoy", label: "Hoy", icon: CalendarDays },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/ventas", label: "Ventas", icon: BarChart3 },
  { href: "/equipo", label: "Equipo", icon: UserCheck, soloDuena: true },
];

const TITULOS: Record<string, string> = {
  "/hoy": "Hoy",
  "/clientes": "Clientes",
  "/ventas": "Ventas",
  "/equipo": "Equipo",
  "/cuenta": "Mi cuenta",
};

/** Título de sección para la topbar según la ruta. */
export function tituloDeRuta(pathname: string): string {
  if (pathname === "/clientes/nuevo") return "Nuevo cliente";
  if (/^\/clientes\/[^/]+$/.test(pathname)) return "Cliente";
  const base = "/" + (pathname.split("/")[1] ?? "");
  return TITULOS[base] ?? "Pulse";
}

/** Botón atrás: en la ficha de un cliente (P4). */
export function mostrarAtras(pathname: string): boolean {
  return /^\/clientes\/[^/]+$/.test(pathname) && pathname !== "/clientes/nuevo";
}

export function esRutaActiva(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
