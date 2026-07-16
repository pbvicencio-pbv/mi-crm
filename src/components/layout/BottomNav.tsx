"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { NAV_ITEMS, esRutaActiva, type NavItem } from "./nav-items";
import { cn } from "@/lib/utils";

/** Bottom-nav móvil (<768px): Hoy · Clientes · [FAB +] · Ventas. */
const MOVIL = NAV_ITEMS.filter((i) => !i.soloDuena); // Hoy, Clientes, Ventas

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-stretch border-t border-slate-200 bg-white md:hidden"
    >
      {MOVIL.slice(0, 2).map((it) => (
        <Tab key={it.href} it={it} pathname={pathname} />
      ))}

      <div className="relative w-[76px] shrink-0">
        <Link
          href="/clientes/nuevo"
          aria-label="Nuevo cliente"
          className="absolute left-1/2 top-[-16px] flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border-[3px] border-white bg-brand text-white shadow-lg"
        >
          <Plus size={26} strokeWidth={2.4} aria-hidden="true" />
        </Link>
      </div>

      {MOVIL.slice(2).map((it) => (
        <Tab key={it.href} it={it} pathname={pathname} />
      ))}
    </nav>
  );
}

function Tab({ it, pathname }: { it: NavItem; pathname: string }) {
  const active = esRutaActiva(pathname, it.href);
  const Icon = it.icon;
  return (
    <Link
      href={it.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5",
        active ? "text-brand" : "text-slate-400",
      )}
    >
      <Icon size={22} aria-hidden="true" />
      <span className="text-[11px] font-semibold">{it.label}</span>
    </Link>
  );
}
