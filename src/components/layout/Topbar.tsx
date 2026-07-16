"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { tituloDeRuta, mostrarAtras } from "./nav-items";
import { AccountMenu } from "./AccountMenu";

/** Topbar (56px): título de sección + (en móvil) menú de cuenta. */
export function Topbar() {
  const pathname = usePathname();
  const titulo = tituloDeRuta(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-2">
        {mostrarAtras(pathname) && (
          <Link
            href="/clientes"
            aria-label="Volver"
            className="-ml-1.5 flex h-11 w-11 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </Link>
        )}
        <span className="text-[17px] font-extrabold tracking-tight">{titulo}</span>
      </div>

      {/* En escritorio la cuenta vive en el pie de la sidebar. */}
      <div className="md:hidden">
        <AccountMenu variant="topbar" />
      </div>
    </header>
  );
}
