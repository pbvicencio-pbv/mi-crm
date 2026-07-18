import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { BottomNav } from "@/components/layout/BottomNav";

/**
 * Layout de la zona autenticada (App Shell · M1.4 · TAL-8).
 * Escritorio (≥768px): sidebar fija + topbar; móvil: topbar + bottom-nav.
 * La protección de rutas (redirigir a /login sin sesión) vive en `middleware.ts` (M2.2 · TAL-10).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] md:flex">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-5 pb-24 md:px-8 md:py-8 md:pb-8">
          <div className="mx-auto w-full max-w-[1000px]">{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
