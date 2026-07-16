"use client";

import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = url ? new ConvexReactClient(url) : null;

/**
 * Envuelve la app con el cliente reactivo de Convex.
 * Sin NEXT_PUBLIC_CONVEX_URL NO se renderizan los hijos (usan useQuery y fallarían
 * fuera de un ConvexProvider): se muestra un estado de configuración explícito.
 * Ejecuta `npx convex dev` para poblar la variable y recarga.
 */
export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">
        <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="text-lg font-extrabold tracking-tight text-slate-900">
            Convex no configurado
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Falta <code className="mono">NEXT_PUBLIC_CONVEX_URL</code>. Ejecuta{" "}
            <code className="mono">npx convex dev</code> y recarga la página.
          </p>
        </div>
      </div>
    );
  }
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
