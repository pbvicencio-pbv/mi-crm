import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { calcularIntervalos } from "./lib/fechas";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const TZ = "America/Mexico_City";
const H = 3_600_000;

const hoyLocal = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );

const idset = (r: { page: Array<{ seguimientoId: string }> }) =>
  new Set(r.page.map((i) => i.seguimientoId));

async function mundo() {
  const iv = calcularIntervalos({ timeZone: TZ, fechaLocal: hoyLocal() }, Date.now());
  const medio = Math.floor((iv.inicioHoy + iv.finHoy) / 2);
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const duena = await ctx.db.insert("usuarios", { nombre: "Elena", email: "elena@x.test", rol: "duena" });
    const vend = await ctx.db.insert("usuarios", { nombre: "Carlos", email: "carlos@x.test", rol: "vendedor" });
    const cli = (nombre: string, archivado = false) =>
      ctx.db.insert("clientes", { nombre, prioridad: "media", propietario: vend, registrado_por: vend, archivado });
    const cOk = await cli("Activo");
    const cArch = await cli("Archivado", true);
    const seg = (
      cliente_id: any,
      fecha_objetivo: number,
      responsable: any,
      estado: "pendiente" | "hecho" = "pendiente",
    ) => ctx.db.insert("seguimientos", { cliente_id, fecha_objetivo, estado, responsable });
    return {
      vencido: await seg(cOk, iv.inicioHoy - H, vend),
      hoyInicio: await seg(cOk, iv.inicioHoy, vend), // borde exacto → Hoy
      hoyMedio: await seg(cOk, medio, vend),
      hoyDuena: await seg(cOk, medio, duena),
      hoyArchivado: await seg(cArch, medio, vend),
      finHoy: await seg(cOk, iv.finHoy, vend), // borde exacto → Próximas
      proxima: await seg(cOk, iv.finHoy + H, vend),
      hecho: await seg(cOk, medio, vend, "hecho"),
    };
  });
  const args = { paginationOpts: { numItems: 50, cursor: null }, timeZone: TZ, fechaLocal: hoyLocal() };
  return { t, ids, args };
}

describe("agenda* (autorización, intervalos, archivados)", () => {
  it("vendedor · Hoy: solo lo propio, sin lo de la dueña, sin archivados ni hechos", async () => {
    const { t, ids, args } = await mundo();
    const s = idset(await t.withIdentity({ email: "carlos@x.test" }).query(api.seguimientos.agendaHoy, args));
    expect(s.has(ids.hoyInicio)).toBe(true);
    expect(s.has(ids.hoyMedio)).toBe(true);
    expect(s.has(ids.hoyDuena)).toBe(false); // scope de responsable en el índice
    expect(s.has(ids.hoyArchivado)).toBe(false); // cliente archivado excluido
    expect(s.has(ids.hecho)).toBe(false); // solo pendientes
    expect(s.has(ids.finHoy)).toBe(false); // finHoy exacto → Próximas
  });

  it("dueña · Hoy: ve también lo de la dueña", async () => {
    const { t, ids, args } = await mundo();
    const s = idset(await t.withIdentity({ email: "elena@x.test" }).query(api.seguimientos.agendaHoy, args));
    expect(s.has(ids.hoyDuena)).toBe(true);
    expect(s.has(ids.hoyInicio)).toBe(true);
  });

  it("Vencidos y Próximas ubican bien los bordes semiabiertos", async () => {
    const { t, ids, args } = await mundo();
    const as = t.withIdentity({ email: "carlos@x.test" });
    const venc = idset(await as.query(api.seguimientos.agendaVencidos, args));
    const prox = idset(await as.query(api.seguimientos.agendaProximas, args));
    expect(venc.has(ids.vencido)).toBe(true);
    expect(prox.has(ids.finHoy)).toBe(true);
    expect(prox.has(ids.proxima)).toBe(true);
  });

  it("atraviesa clientes archivados por cursor sin perder el válido posterior", async () => {
    const iv = calcularIntervalos({ timeZone: TZ, fechaLocal: hoyLocal() }, Date.now());
    const medio = Math.floor((iv.inicioHoy + iv.finHoy) / 2);
    const t = convexTest(schema, modules);
    const validoId = await t.run(async (ctx) => {
      const v = await ctx.db.insert("usuarios", { nombre: "C", email: "carlos@x.test", rol: "vendedor" });
      const cArch = await ctx.db.insert("clientes", { nombre: "A", prioridad: "media", propietario: v, registrado_por: v, archivado: true });
      const cOk = await ctx.db.insert("clientes", { nombre: "B", prioridad: "media", propietario: v, registrado_por: v, archivado: false });
      await ctx.db.insert("seguimientos", { cliente_id: cArch, fecha_objetivo: medio - 300, estado: "pendiente", responsable: v });
      await ctx.db.insert("seguimientos", { cliente_id: cArch, fecha_objetivo: medio - 200, estado: "pendiente", responsable: v });
      await ctx.db.insert("seguimientos", { cliente_id: cArch, fecha_objetivo: medio - 100, estado: "pendiente", responsable: v });
      return await ctx.db.insert("seguimientos", { cliente_id: cOk, fecha_objetivo: medio, estado: "pendiente", responsable: v });
    });
    const as = t.withIdentity({ email: "carlos@x.test" });
    const encontrados = new Set<string>();
    const cursores = new Set<string>();
    let cursor: string | null = null;
    for (let i = 0; i < 12; i++) {
      const r: { page: Array<{ seguimientoId: string }>; isDone: boolean; continueCursor: string } =
        await as.query(api.seguimientos.agendaHoy, {
          paginationOpts: { numItems: 1, cursor },
          timeZone: TZ,
          fechaLocal: hoyLocal(),
        });
      for (const it of r.page) encontrados.add(it.seguimientoId);
      if (r.isDone) break;
      cursor = r.continueCursor;
      cursores.add(cursor);
    }
    expect(encontrados.has(validoId)).toBe(true);
    expect(encontrados.size).toBe(1);
    // Lo relevante es que atravesó VARIAS páginas por cursor, no el número absoluto.
    expect(cursores.size).toBeGreaterThanOrEqual(2);
  });
});

describe("agenda* · sanitización de paginationOpts", () => {
  it("acota numItems a MAX_PAGE_SIZE (50)", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const v = await ctx.db.insert("usuarios", { nombre: "C", email: "carlos@x.test", rol: "vendedor" });
      const c = await ctx.db.insert("clientes", { nombre: "C", prioridad: "media", propietario: v, registrado_por: v, archivado: false });
      const iv = calcularIntervalos({ timeZone: TZ, fechaLocal: hoyLocal() }, Date.now());
      const medio = Math.floor((iv.inicioHoy + iv.finHoy) / 2);
      for (let i = 0; i < 60; i++) {
        await ctx.db.insert("seguimientos", { cliente_id: c, fecha_objetivo: medio + i, estado: "pendiente", responsable: v });
      }
    });
    const r = await t.withIdentity({ email: "carlos@x.test" }).query(api.seguimientos.agendaHoy, {
      paginationOpts: { numItems: 1000, cursor: null },
      timeZone: TZ,
      fechaLocal: hoyLocal(),
    });
    expect(r.page.length).toBe(50); // el cliente no puede pedir páginas gigantes
    expect(r.isDone).toBe(false);
  });

  it("rechaza numItems inválido (0 o negativo)", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("usuarios", { nombre: "C", email: "carlos@x.test", rol: "vendedor" });
    });
    const as = t.withIdentity({ email: "carlos@x.test" });
    const base = { timeZone: TZ, fechaLocal: hoyLocal() };
    await expect(
      as.query(api.seguimientos.agendaHoy, { ...base, paginationOpts: { numItems: 0, cursor: null } }),
    ).rejects.toThrow();
    await expect(
      as.query(api.seguimientos.agendaHoy, { ...base, paginationOpts: { numItems: -3, cursor: null } }),
    ).rejects.toThrow();
  });
});
