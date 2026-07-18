"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FichaClienteView } from "./FichaClienteView";

/** Contenedor: trae la ficha (reactiva) y delega el render a la vista pura (testeable). */
export function FichaCliente({ id }: { id: string }) {
  const ficha = useQuery(api.clientes.ficha, { id: id as Id<"clientes"> });
  if (ficha === undefined) return <FichaSkeleton />;
  if (ficha === null) return <FichaNoDisponible />;
  return <FichaClienteView ficha={ficha} />;
}

function FichaNoDisponible() {
  return (
    <div className="mx-auto max-w-[560px] rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
      <div className="text-base font-extrabold text-slate-900">Cliente no disponible</div>
      <p className="mt-1.5 text-sm text-slate-600">No existe o fue archivado.</p>
      <Link
        href="/clientes"
        className="mt-4 inline-block text-sm font-semibold text-brand hover:underline"
      >
        Volver a clientes
      </Link>
    </div>
  );
}

function FichaSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-4">
      <div className="h-8 w-48 rounded bg-slate-200" />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-4">
          <div className="h-40 rounded-lg border border-slate-200 bg-white shadow-xs" />
          <div className="h-56 rounded-lg border border-slate-200 bg-white shadow-xs" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="h-28 rounded-lg border border-slate-200 bg-white shadow-xs" />
          <div className="h-40 rounded-lg border border-slate-200 bg-white shadow-xs" />
        </div>
      </div>
    </div>
  );
}
