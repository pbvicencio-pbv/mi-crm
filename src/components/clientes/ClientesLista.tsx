"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ClientesListaView } from "./ClientesListaView";

/** Contenedor: trae los datos (reactivo) y delega el render a la vista pura (testeable). */
export function ClientesLista() {
  const clientes = useQuery(api.clientes.listar);
  if (clientes === undefined) return <ListaSkeleton />;
  return <ClientesListaView clientes={clientes} />;
}

function ListaSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-4">
      <div className="h-8 w-40 rounded bg-slate-200" />
      <div className="h-11 w-full rounded-lg bg-slate-100" />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs">
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-40 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
