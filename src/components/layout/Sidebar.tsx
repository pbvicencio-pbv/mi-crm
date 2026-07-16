"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { Activity, Plus } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { NAV_ITEMS, esRutaActiva } from "./nav-items";
import { AccountMenu } from "./AccountMenu";
import { cn } from "@/lib/utils";

/** Sidebar de escritorio (≥768px). Equipo solo visible para la dueña. */
export function Sidebar() {
  const pathname = usePathname();
  const usuario = useQuery(api.usuarios.actual);
  const esDuena = usuario?.rol === "duena";

  return (
    <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-[248px] md:shrink-0 md:flex-col md:border-r md:border-slate-200 md:bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-slate-100 px-5">
        <Activity className="text-brand" size={22} strokeWidth={2.4} aria-hidden="true" />
        <span className="text-[19px] font-extrabold tracking-tight">
          Pulse<span className="text-brand">.</span>
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Navegación principal">
        <div className="px-3 pb-2 pt-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
          Trabajo
        </div>
        {NAV_ITEMS.map((it) => {
          if (it.soloDuena && !esDuena) return null;
          const active = esRutaActiva(pathname, it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold",
                active ? "bg-brand-subtle text-brand" : "text-slate-600 hover:bg-slate-50",
              )}
            >
              <Icon size={18} aria-hidden="true" />
              {it.label}
            </Link>
          );
        })}

        <div className="px-1 pt-3.5">
          {/* Enlace estilizado como botón (evita <button> dentro de <a>). */}
          <Link
            href="/clientes/nuevo"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border"
          >
            <Plus size={16} aria-hidden="true" />
            Nuevo cliente
          </Link>
        </div>
      </nav>

      <div className="border-t border-slate-100 p-2">
        <AccountMenu variant="sidebar" />
      </div>
    </aside>
  );
}
