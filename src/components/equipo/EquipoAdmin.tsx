"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";

type Rol = "duena" | "vendedor";
type Usuario = { _id: Id<"usuarios">; nombre: string; email: string; rol: Rol };

const ROL_OPTS = [
  { value: "vendedor", label: "Vendedor" },
  { value: "duena", label: "Dueña" },
];
const rolLabel = (r: Rol) => (r === "duena" ? "Dueña" : "Vendedor");

function mensajeError(e: unknown): string {
  const d = (e as { data?: unknown } | null)?.data;
  return typeof d === "string" ? d : "No se pudo completar la acción";
}

type ModalState = null | { modo: "alta" } | { modo: "edicion"; u: Usuario };

export function EquipoAdmin() {
  const router = useRouter();
  const actual = useQuery(api.usuarios.actual);
  const esDuena = actual?.rol === "duena";
  const equipo = useQuery(api.usuarios.listar, esDuena ? {} : "skip");

  const crear = useAction(api.usuarios.crearUsuario);
  const actualizar = useMutation(api.usuarios.actualizar);
  const desactivar = useAction(api.usuarios.desactivarUsuario);

  const [modal, setModal] = useState<ModalState>(null);
  const [confirmar, setConfirmar] = useState<{ u: Usuario } | null>(null);
  const [pend, setPend] = useState<Record<string, boolean>>({});
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "danger"; msg: string } | null>(null);

  // Guard de RUTA: el acceso directo por URL de un no-dueña se redirige (además del backend).
  useEffect(() => {
    if (actual === null) router.replace("/login");
    else if (actual && actual.rol !== "duena") router.replace("/hoy");
  }, [actual, router]);

  if (actual === undefined || (esDuena && equipo === undefined)) return <EquipoSkeleton />;
  if (!actual || actual.rol !== "duena") {
    return <p className="text-sm text-slate-500">Redirigiendo…</p>;
  }

  const lista = (equipo ?? []) as Usuario[];
  const duenasActivas = lista.filter((u) => u.rol === "duena").length;
  const ocupado = (id: string) => !!pend[id];

  const conPend = async (id: string, fn: () => Promise<unknown>, okMsg: string) => {
    setPend((p) => ({ ...p, [id]: true }));
    try {
      await fn();
      setToast({ tone: "success", msg: okMsg });
    } catch (e) {
      setToast({ tone: "danger", msg: mensajeError(e) });
    } finally {
      setPend((p) => {
        const n = { ...p };
        delete n[id];
        return n;
      });
    }
  };

  const cambiarRol = (u: Usuario, nuevo: Rol) => {
    if (nuevo === u.rol) return;
    if (u.rol === "duena" && nuevo !== "duena" && duenasActivas <= 1) {
      setToast({ tone: "danger", msg: "Debe haber al menos una dueña" });
      return;
    }
    void conPend(u._id, () => actualizar({ id: u._id, nombre: u.nombre, rol: nuevo }), "Rol actualizado");
  };

  const onGuardar = async (datos: { nombre: string; email: string; rol: Rol; password: string }) => {
    setGuardando(true);
    try {
      if (modal?.modo === "alta") {
        await crear({ nombre: datos.nombre, email: datos.email, rol: datos.rol, passwordTemporal: datos.password });
        setToast({ tone: "success", msg: "Usuario añadido" });
      } else if (modal?.modo === "edicion") {
        await actualizar({ id: modal.u._id, nombre: datos.nombre, rol: datos.rol });
        setToast({ tone: "success", msg: "Cambios guardados" });
      }
      setModal(null);
    } catch (e) {
      setToast({ tone: "danger", msg: mensajeError(e) }); // el modal permanece abierto
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="animate-in flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-slate-600">
          <span className="mono font-semibold text-slate-900">{lista.length}</span> usuario
          {lista.length === 1 ? "" : "s"}
        </p>
        <Button variant="primary" size="sm" iconLeft={<IconPlus />} onClick={() => setModal({ modo: "alta" })}>
          Añadir usuario
        </Button>
      </div>

      {lista.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-11 text-center shadow-xs">
          <div className="text-base font-extrabold">Aún no hay usuarios</div>
          <p className="mt-1.5 text-sm text-slate-600">Añade a las personas de tu equipo para darles acceso.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
          {lista.map((u) => {
            const esSelf = u._id === actual._id;
            const esUltimaDuena = u.rol === "duena" && duenasActivas <= 1;
            const noBorrable = esSelf || esUltimaDuena;
            const delTitle = esSelf
              ? "No puedes eliminarte a ti misma"
              : esUltimaDuena
                ? "Debe haber al menos una dueña"
                : "Desactivar usuario";
            return (
              <div
                key={u._id}
                className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
              >
                <Avatar name={u.nombre} size="md" />
                <div className="min-w-[120px] flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">{u.nombre}</div>
                  <div className="mono truncate text-xs text-slate-500">{u.email}</div>
                </div>
                <Badge tone={u.rol === "duena" ? "brand" : "neutral"} dot>
                  {rolLabel(u.rol)}
                </Badge>
                <div className="w-[130px]">
                  <Select
                    size="sm"
                    aria-label={`Rol de ${u.nombre}`}
                    options={ROL_OPTS}
                    value={u.rol}
                    disabled={ocupado(u._id)}
                    onChange={(e) => cambiarRol(u, e.target.value as Rol)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setModal({ modo: "edicion", u })}
                  title="Editar usuario"
                  aria-label={`Editar ${u.nombre}`}
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                >
                  <IconPencil />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmar({ u })}
                  disabled={noBorrable || ocupado(u._id)}
                  title={delTitle}
                  aria-label={`Desactivar ${u.nombre}`}
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-md text-danger hover:bg-danger-bg disabled:pointer-events-none disabled:opacity-40"
                >
                  <IconTrash />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.modo === "edicion" ? "Editar usuario" : "Añadir usuario"}
      >
        {modal && (
          <UsuarioForm
            modo={modal.modo}
            inicial={modal.modo === "edicion" ? modal.u : undefined}
            guardando={guardando}
            onCancel={() => setModal(null)}
            onSubmit={onGuardar}
          />
        )}
      </Modal>

      <Modal
        open={confirmar !== null}
        onClose={() => setConfirmar(null)}
        title="Desactivar usuario"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setConfirmar(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (!confirmar) return;
                const { u } = confirmar;
                setConfirmar(null);
                void conPend(u._id, () => desactivar({ id: u._id }), "Usuario desactivado");
              }}
            >
              Desactivar
            </Button>
          </>
        }
      >
        {confirmar && (
          <p className="text-sm text-slate-600">
            ¿Seguro que quieres desactivar a{" "}
            <span className="font-semibold text-slate-900">{confirmar.u.nombre}</span>? Perderá el
            acceso de inmediato (se cierran sus sesiones) y no hay pantalla de reactivación; para
            devolverle el acceso tendrás que crearlo de nuevo.
          </p>
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
    </section>
  );
}

function UsuarioForm({
  modo,
  inicial,
  guardando,
  onCancel,
  onSubmit,
}: {
  modo: "alta" | "edicion";
  inicial?: Usuario;
  guardando: boolean;
  onCancel: () => void;
  onSubmit: (d: { nombre: string; email: string; rol: Rol; password: string }) => void;
}) {
  const esAlta = modo === "alta";
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [email, setEmail] = useState(inicial?.email ?? "");
  const [rol, setRol] = useState<Rol>(inicial?.rol ?? "vendedor");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return setErr("El nombre es obligatorio");
    if (esAlta && !email.trim()) return setErr("El email es obligatorio");
    if (esAlta && password.length < 8) return setErr("La contraseña temporal debe tener al menos 8 caracteres");
    setErr(null);
    onSubmit({ nombre: nombre.trim(), email: email.trim(), rol, password });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellidos" required />
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="nombre@empresa.mx"
        disabled={!esAlta}
      />
      {!esAlta && <p className="-mt-2 text-[12px] text-slate-500">El email no se puede cambiar.</p>}
      <Select label="Rol" options={ROL_OPTS} value={rol} onChange={(e) => setRol(e.target.value as Rol)} />
      {esAlta && (
        <Input
          label="Contraseña temporal"
          type={verPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres — la persona la cambia luego"
          autoComplete="new-password"
          suffix={
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="text-slate-400 hover:text-slate-600"
            >
              {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />
      )}
      {err && <p className="text-[13px] font-semibold text-danger">{err}</p>}
      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={guardando}>
          {guardando ? "Guardando…" : esAlta ? "Añadir usuario" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

function EquipoSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-4">
      <div className="h-8 w-40 self-end rounded bg-slate-200" />
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
            <div className="h-10 w-10 rounded-full bg-slate-200" />
            <div className="flex-1">
              <div className="h-3.5 w-40 rounded bg-slate-200" />
              <div className="mt-2 h-3 w-56 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconPencil() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
