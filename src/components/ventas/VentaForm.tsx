"use client";

import { useState, type FormEvent } from "react";
import { Minus, Plus } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/Input";
import { Select, type Opcion } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format";
import { fechaLocalISO, mediodiaLocalMs } from "@/lib/fecha";

export type EstadoVenta = "abierta" | "ganada" | "perdida";

/** Datos que emite el form. `fecha` ausente = hoy (el servidor usa `Date.now()`). `cliente_id` solo
 *  cuando hay selector de cliente (alta desde /ventas). `vendedor` es la selección actual (D1). */
export type VentaDatos = {
  producto: string;
  importe: number;
  cantidad: number;
  estado: EstadoVenta;
  fecha?: number;
  vendedor: Id<"usuarios">;
  cliente_id?: Id<"clientes">;
};

const ESTADOS: { value: EstadoVenta; label: string; color: string }[] = [
  { value: "abierta", label: "Abierta", color: "#F59E0B" },
  { value: "ganada", label: "Ganada", color: "#059669" },
  { value: "perdida", label: "Perdida", color: "#DC2626" },
];

/** Deja solo dígitos y UN punto decimal. */
function limpiarImporte(s: string): string {
  const soloNum = s.replace(/[^0-9.]/g, "");
  const partes = soloNum.split(".");
  return partes.length <= 1 ? soloNum : `${partes[0]}.${partes.slice(1).join("")}`;
}

/**
 * Formulario de venta (P8 · vista pura, testeable). El contenedor pasa `guardando`, las opciones y
 * recibe los datos por `onSubmit`; no conoce Convex. Vendedor editable SOLO si se pasan
 * `vendedoresOpts` (dueña, D1); si no, se muestra fijo. Cliente: selector si `clientesOpts` (alta
 * desde /ventas), fijo de solo lectura si `clienteFijoNombre` (edición, cliente bloqueado · D7), o
 * ausente (alta desde la ficha, el cliente lo aporta el contenedor). Contrato de fecha: si el día no
 * cambia (sigue siendo hoy) NO se envía `fecha`; si cambia, se envía el mediodía local.
 */
export function VentaForm({
  modo,
  guardando,
  onCancel,
  onSubmit,
  vendedorInicial,
  vendedoresOpts,
  vendedorFijoNombre,
  clientesOpts,
  clienteFijoNombre,
  inicial,
  hoy,
}: {
  modo: "alta" | "edicion";
  guardando: boolean;
  onCancel: () => void;
  onSubmit: (datos: VentaDatos) => void;
  vendedorInicial: Id<"usuarios">;
  vendedoresOpts?: Opcion[];
  vendedorFijoNombre?: string;
  clientesOpts?: Opcion[];
  clienteFijoNombre?: string;
  inicial?: {
    producto?: string;
    importe?: number;
    cantidad?: number;
    estado?: EstadoVenta;
    fecha?: number;
  };
  hoy?: string;
}) {
  const hoyISO = hoy ?? fechaLocalISO(new Date());
  const [producto, setProducto] = useState(inicial?.producto ?? "");
  const [importe, setImporte] = useState(inicial?.importe != null ? String(inicial.importe) : "");
  const [cantidad, setCantidad] = useState(inicial?.cantidad ?? 1);
  const [estado, setEstado] = useState<EstadoVenta>(inicial?.estado ?? "abierta");
  const [fecha, setFecha] = useState(inicial?.fecha != null ? fechaLocalISO(new Date(inicial.fecha)) : hoyISO);
  const [vendedor, setVendedor] = useState<string>(vendedorInicial);
  const [cliente, setCliente] = useState<string>("");
  const [err, setErr] = useState<{ campo: "cliente" | "producto" | "importe"; msg: string } | null>(null);

  const importeNum = Number(importe) || 0;
  const total = importeNum * cantidad;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    if (clientesOpts && !cliente) return setErr({ campo: "cliente", msg: "Falta elegir el cliente" });
    if (!producto.trim()) return setErr({ campo: "producto", msg: "Indica qué se vendió" });
    if (!(importeNum > 0)) return setErr({ campo: "importe", msg: "Indica el importe" });
    setErr(null);
    onSubmit({
      producto: producto.trim(),
      importe: importeNum,
      cantidad,
      estado,
      // Sin cambio de día → no enviar fecha (server usa Date.now()); cambiada → mediodía local.
      fecha: fecha === hoyISO ? undefined : mediodiaLocalMs(fecha),
      vendedor: vendedor as Id<"usuarios">,
      cliente_id: clientesOpts ? (cliente as Id<"clientes">) : undefined,
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {/* Producto */}
      <Input
        label="¿Qué se vendió?"
        value={producto}
        onChange={(e) => setProducto(e.target.value)}
        placeholder="Ej. Curso de ventas, licencia anual…"
        error={err?.campo === "producto"}
      />
      {err?.campo === "producto" && <p className="-mt-2 text-[12px] font-semibold text-danger">{err.msg}</p>}

      {/* Cliente: selector (alta /ventas) o fijo de solo lectura (edición) */}
      {clientesOpts ? (
        <Select
          label="Cliente"
          options={clientesOpts}
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          placeholder="Selecciona un cliente"
          error={err?.campo === "cliente"}
        />
      ) : (
        clienteFijoNombre && <CampoFijo label="Cliente" valor={clienteFijoNombre} />
      )}
      {err?.campo === "cliente" && <p className="-mt-2 text-[12px] font-semibold text-danger">{err.msg}</p>}

      {/* Vendedor: selector (dueña) o fijo (vendedor) */}
      {vendedoresOpts ? (
        <Select
          label="Vendedor"
          options={vendedoresOpts}
          value={vendedor}
          onChange={(e) => setVendedor(e.target.value)}
        />
      ) : (
        vendedorFijoNombre && <CampoFijo label="Vendedor" valor={vendedorFijoNombre} />
      )}

      {/* Importe + Cantidad */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Input
            label="Importe"
            value={importe}
            onChange={(e) => setImporte(limpiarImporte(e.target.value))}
            placeholder="0.00"
            inputMode="decimal"
            prefix={<span className="mono text-slate-500">$</span>}
            className="mono"
            error={err?.campo === "importe"}
          />
          {err?.campo === "importe" && <p className="text-[12px] font-semibold text-danger">{err.msg}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-slate-700">Cantidad</span>
          <div className="flex items-center gap-2">
            <StepBtn label="Restar" onClick={() => setCantidad((c) => Math.max(1, c - 1))}>
              <Minus size={16} />
            </StepBtn>
            <span className="mono w-12 text-center text-sm font-bold text-slate-900" aria-live="polite">
              {cantidad}
            </span>
            <StepBtn label="Sumar" onClick={() => setCantidad((c) => c + 1)}>
              <Plus size={16} />
            </StepBtn>
          </div>
        </div>
      </div>

      {/* Fecha — hoy por defecto, editable, sin futuro */}
      <Input
        label="Fecha"
        type="date"
        value={fecha}
        max={hoyISO}
        onChange={(e) => setFecha(e.target.value || hoyISO)}
      />

      {/* Estado — segmentado */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-slate-700">Estado</span>
        <div className="flex gap-2">
          {ESTADOS.map((s) => {
            const sel = estado === s.value;
            return (
              <button
                key={s.value}
                type="button"
                aria-pressed={sel}
                onClick={() => setEstado(s.value)}
                className="flex h-10 flex-1 items-center justify-center rounded-lg border text-[13px] font-semibold transition-colors"
                style={
                  sel
                    ? { borderColor: s.color, background: s.color, color: "#fff" }
                    : { borderColor: "#cbd5e1", color: "#475569", background: "transparent" }
                }
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Total — solo lectura (derivado) */}
      <div
        className="flex items-center justify-between rounded-lg border px-4 py-3"
        style={{ background: "var(--success-bg, #ecfdf5)", borderColor: "var(--success-border, #a7f3d0)" }}
      >
        <div>
          <div className="text-[13px] font-bold text-slate-700">Total</div>
          <div className="text-[11px] text-slate-500">Importe × cantidad</div>
        </div>
        <div className="mono text-xl font-extrabold" style={{ color: "#059669" }} aria-live="polite">
          {formatMoney(total)}
        </div>
      </div>

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={guardando}>
          {guardando ? "Guardando…" : modo === "alta" ? "Registrar venta" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

/** Fila de solo lectura para un campo no editable (Cliente/Vendedor fijos). */
function CampoFijo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-slate-700">{label}</span>
      <div className="flex h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
        {valor}
      </div>
    </div>
  );
}

/** Botón del stepper de cantidad (44×44, accesible). */
function StepBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
    >
      {children}
    </button>
  );
}
