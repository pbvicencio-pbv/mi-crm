import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Estado del cliente DERIVADO de sus ventas no archivadas (TAL-16; canónico en M3.4).
 * Precedencia: ganada > abierta > (solo) perdidas > sin ventas.
 */
export type EstadoCliente = "nuevo_lead" | "en_negociacion" | "ganado" | "perdido";

/** Decisión pura de estado a partir de banderas. Testeable sin base de datos. */
export function decidirEstado(f: {
  ganada: boolean;
  abierta: boolean;
  alguna: boolean;
}): EstadoCliente {
  if (f.ganada) return "ganado";
  if (f.abierta) return "en_negociacion";
  if (f.alguna) return "perdido";
  return "nuevo_lead";
}

/**
 * Deriva el estado del cliente con lecturas CONSTANTES (≤ 3 `.first()`) sobre el
 * índice `por_cliente_archivado_estado`, con corto-circuito por precedencia.
 * Cachea por ejecución para no repetir lecturas del mismo cliente.
 */
export async function derivarEstadoCliente(
  ctx: QueryCtx,
  clienteId: Id<"clientes">,
  cache: Map<string, EstadoCliente>,
): Promise<EstadoCliente> {
  const key = clienteId as unknown as string;
  const yaCalculado = cache.get(key);
  if (yaCalculado) return yaCalculado;

  const noArchivada = (estado?: "ganada" | "abierta" | "perdida") =>
    ctx.db
      .query("ventas")
      .withIndex("por_cliente_archivado_estado", (q) => {
        const base = q.eq("cliente_id", clienteId).eq("archivado", false);
        return estado ? base.eq("estado", estado) : base;
      })
      .first();

  let estado: EstadoCliente;
  if (await noArchivada("ganada")) {
    estado = "ganado";
  } else if (await noArchivada("abierta")) {
    estado = "en_negociacion";
  } else if (await noArchivada()) {
    estado = "perdido";
  } else {
    estado = "nuevo_lead";
  }

  cache.set(key, estado);
  return estado;
}

/**
 * Valor DERIVADO del cliente = Σ (importe * cantidad) de sus ventas en estado "ganada" y NO
 * archivadas (TAL-13). No se persiste. Acotado por el índice `por_cliente_archivado_estado`
 * (solo las ganadas de UN cliente; conteo diminuto en el MVP).
 */
export async function derivarValorCliente(
  ctx: QueryCtx,
  clienteId: Id<"clientes">,
): Promise<number> {
  const ganadas = await ctx.db
    .query("ventas")
    .withIndex("por_cliente_archivado_estado", (q) =>
      q.eq("cliente_id", clienteId).eq("archivado", false).eq("estado", "ganada"),
    )
    .collect();
  return ganadas.reduce((suma, v) => suma + v.importe * v.cantidad, 0);
}
