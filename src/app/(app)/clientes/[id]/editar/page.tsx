"use client";

/**
 * P5 · Editar cliente (M3.1 · TAL-11). Precarga con `clientes.obtener` y reusa <ClienteForm>.
 * Si el cliente no existe o está archivado, `obtener` devuelve null → aviso + vuelta a la lista.
 */
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { ClienteForm } from "@/components/clientes/ClienteForm";

export default function EditarClientePage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"clientes">;
  const cliente = useQuery(api.clientes.obtener, { id });

  if (cliente === undefined) {
    return (
      <div className="animate-pulse mx-auto flex max-w-[560px] flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="h-5 w-40 rounded bg-slate-200" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-11 w-full rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (cliente === null) {
    return (
      <div className="mx-auto max-w-[560px] rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <div className="text-base font-extrabold text-slate-900">Cliente no disponible</div>
        <p className="mt-1.5 text-sm text-slate-600">No existe o fue archivado.</p>
        <Link href="/clientes" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
          Volver a clientes
        </Link>
      </div>
    );
  }

  return <ClienteForm modo="edicion" inicial={cliente} />;
}
