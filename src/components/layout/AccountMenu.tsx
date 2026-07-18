"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { LogOut, User, Users } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

const ROL_LABEL = { duena: "Dueña", vendedor: "Vendedor" } as const;

/**
 * Menú de cuenta (TAL-8). Accesible: aria-expanded, cierre con Escape con
 * devolución de foco al disparador, y cierre al hacer clic fuera.
 * "Cerrar sesión" llama a `signOut()` de Convex Auth; tras cerrar, el middleware
 * redirige a /login (protección de rutas ya activa desde M2.2 · TAL-10).
 */
export function AccountMenu({ variant }: { variant: "sidebar" | "topbar" }) {
  const usuario = useQuery(api.usuarios.actual);
  const { signOut } = useAuthActions();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  // Foco inicial en el primer ítem al abrir.
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  const onMenuKeyDown = (e: ReactKeyboardEvent) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (items.length === 0) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(i + 1) % items.length].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length].focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1].focus();
    }
  };

  if (!usuario) return null;

  const esDuena = usuario.rol === "duena";

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border",
          variant === "sidebar"
            ? "w-full px-2 py-2 text-left hover:bg-slate-50"
            : "h-11 w-11 justify-center",
        )}
      >
        <Avatar name={usuario.nombre} size="sm" />
        {variant === "sidebar" && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-slate-900">
              {usuario.nombre}
            </span>
            <span className="block text-[11px] text-slate-400">{ROL_LABEL[usuario.rol]}</span>
          </span>
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Menú de cuenta"
          onKeyDown={onMenuKeyDown}
          className={cn(
            "absolute z-30 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg",
            variant === "sidebar" ? "bottom-full left-0 mb-2" : "right-0 top-full mt-2",
          )}
        >
          <div className="px-3 py-2">
            <div className="truncate text-[13px] font-semibold text-slate-900">{usuario.nombre}</div>
            <div className="truncate text-[11px] text-slate-500">{usuario.email}</div>
          </div>
          <div className="my-1 h-px bg-slate-100" />
          <ItemMenu href="/cuenta" icon={<User size={16} />} onNavigate={() => setOpen(false)}>
            Mi cuenta
          </ItemMenu>
          {esDuena && (
            <ItemMenu href="/equipo" icon={<Users size={16} />} onNavigate={() => setOpen(false)}>
              Equipo
            </ItemMenu>
          )}
          <div className="my-1 h-px bg-slate-100" />
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.push("/login");
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium text-danger hover:bg-danger-bg"
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

function ItemMenu({
  href,
  icon,
  children,
  onNavigate,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
    >
      {icon}
      {children}
    </Link>
  );
}
