"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useAction } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Pencil, Lock, Users, LogOut, ChevronRight } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";

const rolLabel = (r: "duena" | "vendedor") => (r === "duena" ? "Dueña" : "Vendedor");

function mensajeError(e: unknown): string {
  const d = (e as { data?: unknown } | null)?.data;
  return typeof d === "string" ? d : "No se pudo completar la acción";
}

export function CuentaPerfil() {
  const router = useRouter();
  const actual = useQuery(api.usuarios.actual);
  const { signOut } = useAuthActions();
  const actualizarPerfil = useMutation(api.usuarios.actualizarPerfil);
  const cambiarPassword = useAction(api.usuarios.cambiarPassword);

  const [modal, setModal] = useState<null | "datos" | "password">(null);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "danger"; msg: string } | null>(null);

  useEffect(() => {
    if (actual === null) router.replace("/login");
  }, [actual, router]);

  if (actual === undefined) return <CuentaSkeleton />;
  if (actual === null) return <p className="text-sm text-slate-500">Redirigiendo…</p>;

  const esDuena = actual.rol === "duena";

  const guardarNombre = async (nombre: string) => {
    setGuardando(true);
    try {
      await actualizarPerfil({ nombre });
      setModal(null);
      setToast({ tone: "success", msg: "Datos actualizados" });
    } finally {
      setGuardando(false);
    }
  };

  const guardarPassword = async (actualPw: string, nueva: string) => {
    setGuardando(true);
    try {
      await cambiarPassword({ actual: actualPw, nueva });
      setModal(null);
      setToast({ tone: "success", msg: "Contraseña actualizada" });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      {/* Tarjeta de perfil */}
      <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-[18px] shadow-xs">
        <Avatar name={actual.nombre} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="text-[19px] font-extrabold tracking-tight">{actual.nombre}</div>
          <div className="mono truncate text-[13px] text-slate-600">{actual.email}</div>
        </div>
        <Badge tone="brand" dot>
          {rolLabel(actual.rol)}
        </Badge>
      </div>

      {/* Acciones de cuenta */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
        <FilaAccion icon={<Pencil size={18} />} label="Editar datos" onClick={() => setModal("datos")} />
        <FilaAccion icon={<Lock size={18} />} label="Cambiar contraseña" onClick={() => setModal("password")} borderTop />
      </div>

      {/* Administración (solo dueña) */}
      {esDuena && (
        <div>
          <div className="mb-2 ml-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Administración
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
            <Link
              href="/equipo"
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50"
            >
              <span className="text-brand">
                <Users size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">Usuarios</span>
                <span className="block text-xs text-slate-500">Gestiona el acceso de tu equipo</span>
              </span>
              <ChevronRight size={18} className="text-slate-400" />
            </Link>
          </div>
        </div>
      )}

      {/* Cerrar sesión */}
      <button
        type="button"
        onClick={async () => {
          await signOut();
          router.push("/login");
        }}
        className="mt-1 flex items-center justify-center gap-2 rounded-lg border border-danger bg-danger-bg py-3 text-sm font-bold text-danger hover:brightness-95"
      >
        <LogOut size={18} /> Cerrar sesión
      </button>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === "password" ? "Cambiar contraseña" : "Editar datos"}
      >
        {modal === "datos" && (
          <EditarDatosForm
            nombreInicial={actual.nombre}
            guardando={guardando}
            onCancel={() => setModal(null)}
            onSubmit={guardarNombre}
          />
        )}
        {modal === "password" && (
          <CambiarPasswordForm guardando={guardando} onCancel={() => setModal(null)} onSubmit={guardarPassword} />
        )}
      </Modal>

      {toast && (
        <div className="fixed bottom-20 right-4 z-[60] w-[calc(100%-2rem)] max-w-sm md:bottom-6 md:right-6">
          <Toast
            tone={toast.tone}
            title={toast.tone === "success" ? "Listo" : "Error"}
            description={toast.msg}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}

function FilaAccion({
  icon,
  label,
  onClick,
  borderTop = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  borderTop?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 ${borderTop ? "border-t border-slate-100" : ""}`}
    >
      <span className="text-slate-500">{icon}</span>
      <span className="flex-1 text-sm font-semibold text-slate-800">{label}</span>
      <ChevronRight size={18} className="text-slate-400" />
    </button>
  );
}

function EditarDatosForm({
  nombreInicial,
  guardando,
  onCancel,
  onSubmit,
}: {
  nombreInicial: string;
  guardando: boolean;
  onCancel: () => void;
  onSubmit: (nombre: string) => Promise<void>;
}) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return setErr("El nombre es obligatorio");
    setErr(null);
    try {
      await onSubmit(nombre.trim());
    } catch (e2) {
      setErr(mensajeError(e2));
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      {err && <p className="text-[13px] font-semibold text-danger">{err}</p>}
      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

function CambiarPasswordForm({
  guardando,
  onCancel,
  onSubmit,
}: {
  guardando: boolean;
  onCancel: () => void;
  onSubmit: (actual: string, nueva: string) => Promise<void>;
}) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (nueva.length < 8) return setErr("La nueva contraseña debe tener al menos 8 caracteres");
    if (nueva !== confirmar) return setErr("La confirmación no coincide");
    setErr(null);
    try {
      await onSubmit(actual, nueva);
    } catch (e2) {
      setErr(mensajeError(e2));
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input label="Contraseña actual" type="password" value={actual} onChange={(e) => setActual(e.target.value)} required />
      <Input label="Nueva contraseña" type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Mínimo 8 caracteres" required />
      <Input label="Confirmar nueva contraseña" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required />
      {err && <p className="text-[13px] font-semibold text-danger">{err}</p>}
      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={guardando}>
          {guardando ? "Guardando…" : "Cambiar contraseña"}
        </Button>
      </div>
    </form>
  );
}

function CuentaSkeleton() {
  return (
    <div className="mx-auto flex max-w-2xl animate-pulse flex-col gap-4">
      <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-[18px] shadow-xs">
        <div className="h-12 w-12 rounded-full bg-slate-200" />
        <div className="flex-1">
          <div className="h-4 w-40 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-56 rounded bg-slate-100" />
        </div>
      </div>
      <div className="h-[116px] rounded-lg border border-slate-200 bg-white shadow-xs" />
    </div>
  );
}
