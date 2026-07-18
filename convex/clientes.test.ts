import { describe, it, expect } from "vitest";
import { convexTest, type TestConvex } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

/** Autentica como el usuario de dominio con ese email (enlaza users._id ↔ usuarios.authId). */
async function como(t: TestConvex<typeof schema>, email: string) {
  const authId = await t.run(async (ctx) => {
    const u = await ctx.db
      .query("usuarios")
      .withIndex("por_email", (q) => q.eq("email", email))
      .unique();
    if (!u) throw new Error(`usuarios no encontrado: ${email}`);
    if (u.authId) return u.authId;
    const id = await ctx.db.insert("users", { email });
    await ctx.db.patch(u._id, { authId: id });
    return id;
  });
  return t.withIdentity({ subject: `${authId}|s` });
}

/** Mundo con 1 dueña (Elena) + 1 vendedor (Carlos), ambos activos. */
async function mundo() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const elena = await ctx.db.insert("usuarios", { nombre: "Elena", email: "elena@x.test", rol: "duena", activo: true });
    const carlos = await ctx.db.insert("usuarios", { nombre: "Carlos", email: "carlos@x.test", rol: "vendedor", activo: true });
    return { elena, carlos };
  });
  return { t, ids };
}

describe("clientes · crearCliente", () => {
  it("crea con defaults (prioridad=media, propietario=yo, registrado_por=yo, archivado=false)", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    const id = await as.mutation(api.clientes.crearCliente, { nombre: "  Ana López  " });
    const c = await t.run((ctx) => ctx.db.get(id));
    expect(c).not.toBeNull();
    expect(c!.nombre).toBe("Ana López"); // recortado
    expect(c!.prioridad).toBe("media");
    expect(c!.propietario).toBe(ids.carlos);
    expect(c!.registrado_por).toBe(ids.carlos);
    expect(c!.archivado).toBe(false);
  });

  it("guarda todos los campos y permite asignar propietario a otro usuario activo", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    const id = await as.mutation(api.clientes.crearCliente, {
      nombre: "Beto", telefono: "+52 55 1", email: "beto@x.test", empresa: "ACME",
      cargo: "Compras", ciudad: "CDMX", canal: "whatsapp", origen: "recomendacion",
      notas: "Nota", prioridad: "alta", propietario: ids.elena,
    });
    const c = await t.run((ctx) => ctx.db.get(id));
    expect(c!.propietario).toBe(ids.elena);
    expect(c!.prioridad).toBe("alta");
    expect(c!.canal).toBe("whatsapp");
    expect(c!.origen).toBe("recomendacion");
    expect(c!.empresa).toBe("ACME");
  });

  it("nombre vacío → rechaza", async () => {
    const { t } = await mundo();
    const as = await como(t, "carlos@x.test");
    await expect(as.mutation(api.clientes.crearCliente, { nombre: "   " })).rejects.toThrow(/nombre/i);
  });

  it("sin sesión → rechaza (requireUsuario)", async () => {
    const { t } = await mundo();
    await expect(t.mutation(api.clientes.crearCliente, { nombre: "X" })).rejects.toThrow();
  });

  it("propietario inexistente → rechaza", async () => {
    const { t } = await mundo();
    // id con formato válido pero borrado → get() = null.
    const fantasma = await t.run(async (ctx) => {
      const uid = await ctx.db.insert("usuarios", { nombre: "Tmp", email: "tmp@x.test", rol: "vendedor", activo: true });
      await ctx.db.delete(uid);
      return uid;
    });
    const as = await como(t, "carlos@x.test");
    await expect(
      as.mutation(api.clientes.crearCliente, { nombre: "X", propietario: fantasma }),
    ).rejects.toThrow(/propietario/i);
  });

  it("propietario inactivo → rechaza", async () => {
    const { t } = await mundo();
    const inactivo = await t.run((ctx) =>
      ctx.db.insert("usuarios", { nombre: "Baja", email: "baja@x.test", rol: "vendedor", activo: false }),
    );
    const as = await como(t, "carlos@x.test");
    await expect(
      as.mutation(api.clientes.crearCliente, { nombre: "X", propietario: inactivo }),
    ).rejects.toThrow(/propietario/i);
  });
});

describe("clientes · actualizarCliente", () => {
  async function conCliente() {
    const { t, ids } = await mundo();
    const elena = await como(t, "elena@x.test");
    const id = await elena.mutation(api.clientes.crearCliente, { nombre: "Original", propietario: ids.elena });
    return { t, ids, id };
  }

  it("edita nombre/prioridad/propietario", async () => {
    const { t, ids, id } = await conCliente();
    const carlos = await como(t, "carlos@x.test");
    await carlos.mutation(api.clientes.actualizarCliente, {
      id, nombre: "Editado", prioridad: "baja", propietario: ids.carlos,
    });
    const c = await t.run((ctx) => ctx.db.get(id));
    expect(c!.nombre).toBe("Editado");
    expect(c!.prioridad).toBe("baja");
    expect(c!.propietario).toBe(ids.carlos);
  });

  it("NO toca archivado ni registrado_por", async () => {
    const { t, ids, id } = await conCliente(); // registrado_por = Elena, archivado = false
    const carlos = await como(t, "carlos@x.test");
    await carlos.mutation(api.clientes.actualizarCliente, {
      id, nombre: "Editado", prioridad: "media", propietario: ids.carlos,
    });
    const c = await t.run((ctx) => ctx.db.get(id));
    expect(c!.registrado_por).toBe(ids.elena); // intacto
    expect(c!.archivado).toBe(false); // intacto
  });

  it("cliente inexistente → rechaza", async () => {
    const { t, ids, id } = await conCliente();
    await t.run((ctx) => ctx.db.delete(id));
    const carlos = await como(t, "carlos@x.test");
    await expect(
      carlos.mutation(api.clientes.actualizarCliente, { id, nombre: "X", prioridad: "media", propietario: ids.carlos }),
    ).rejects.toThrow(/no encontrado/i);
  });

  it("cliente archivado → rechaza", async () => {
    const { t, ids, id } = await conCliente();
    await t.run((ctx) => ctx.db.patch(id, { archivado: true }));
    const carlos = await como(t, "carlos@x.test");
    await expect(
      carlos.mutation(api.clientes.actualizarCliente, { id, nombre: "X", prioridad: "media", propietario: ids.carlos }),
    ).rejects.toThrow(/no encontrado/i);
  });

  it("propietario inactivo → rechaza", async () => {
    const { t, id } = await conCliente();
    const inactivo = await t.run((ctx) =>
      ctx.db.insert("usuarios", { nombre: "Baja", email: "baja@x.test", rol: "vendedor", activo: false }),
    );
    const carlos = await como(t, "carlos@x.test");
    await expect(
      carlos.mutation(api.clientes.actualizarCliente, { id, nombre: "X", prioridad: "media", propietario: inactivo }),
    ).rejects.toThrow(/propietario/i);
  });
});

describe("clientes · obtener", () => {
  it("devuelve el cliente crudo; null si archivado", async () => {
    const { t, ids } = await mundo();
    const elena = await como(t, "elena@x.test");
    const id = await elena.mutation(api.clientes.crearCliente, { nombre: "Ficha", propietario: ids.elena });
    const ok = await elena.query(api.clientes.obtener, { id });
    expect(ok?.nombre).toBe("Ficha");
    await t.run((ctx) => ctx.db.patch(id, { archivado: true }));
    const archivado = await elena.query(api.clientes.obtener, { id });
    expect(archivado).toBeNull();
  });

  it("sin sesión → rechaza", async () => {
    const { t, ids } = await mundo();
    const elena = await como(t, "elena@x.test");
    const id = await elena.mutation(api.clientes.crearCliente, { nombre: "X", propietario: ids.elena });
    await expect(t.query(api.clientes.obtener, { id })).rejects.toThrow();
  });
});

describe("usuarios · opcionesAsignacion", () => {
  it("lista activos, excluye inactivos, y la puede llamar un vendedor", async () => {
    const { t } = await mundo();
    await t.run((ctx) =>
      ctx.db.insert("usuarios", { nombre: "Baja", email: "baja@x.test", rol: "vendedor", activo: false }),
    );
    const carlos = await como(t, "carlos@x.test");
    const ops = await carlos.query(api.usuarios.opcionesAsignacion, {});
    const nombres = ops.map((o) => o.nombre).sort();
    expect(nombres).toEqual(["Carlos", "Elena"]); // "Baja" (inactivo) fuera
  });
});

describe("clientes · listar", () => {
  // Crea un cliente y le adjunta ventas (no archivadas salvo que se indique).
  async function clienteCon(
    t: TestConvex<typeof schema>,
    dueno: string,
    nombre: string,
    ventas: { estado: "ganada" | "abierta" | "perdida"; archivado?: boolean }[],
    archivado = false,
  ) {
    return await t.run(async (ctx) => {
      const cid = await ctx.db.insert("clientes", {
        nombre, prioridad: "media", propietario: dueno as never, registrado_por: dueno as never, archivado,
      });
      for (const vta of ventas) {
        await ctx.db.insert("ventas", {
          cliente_id: cid, producto: "P", importe: 100, cantidad: 1,
          estado: vta.estado, fecha: 1, vendedor: dueno as never, registrado_por: dueno as never,
          archivado: vta.archivado ?? false,
        });
      }
      return cid;
    });
  }

  it("estado derivado por ventas: ganada / abierta / solo perdida / sin ventas", async () => {
    const { t, ids } = await mundo();
    const d = ids.elena as unknown as string;
    await clienteCon(t, d, "SinVentas", []); // → nuevo_lead
    await clienteCon(t, d, "Abierta", [{ estado: "abierta" }]); // → en_negociacion
    await clienteCon(t, d, "SoloPerdida", [{ estado: "perdida" }]); // → perdido
    await clienteCon(t, d, "Ganada", [{ estado: "perdida" }, { estado: "ganada" }]); // ganada manda → ganado
    const as = await como(t, "elena@x.test");
    const filas = await as.query(api.clientes.listar, {});
    const estado = Object.fromEntries(filas.map((f) => [f.nombre, f.estado]));
    expect(estado["SinVentas"]).toBe("nuevo_lead");
    expect(estado["Abierta"]).toBe("en_negociacion");
    expect(estado["SoloPerdida"]).toBe("perdido");
    expect(estado["Ganada"]).toBe("ganado");
  });

  it("excluye clientes archivados", async () => {
    const { t, ids } = await mundo();
    const d = ids.elena as unknown as string;
    await clienteCon(t, d, "Activo", []);
    await clienteCon(t, d, "Archivado", [], true);
    const as = await como(t, "elena@x.test");
    const nombres = (await as.query(api.clientes.listar, {})).map((f) => f.nombre);
    expect(nombres).toContain("Activo");
    expect(nombres).not.toContain("Archivado");
  });

  it("ventas archivadas NO cuentan para el estado (siguen nuevo_lead)", async () => {
    const { t, ids } = await mundo();
    const d = ids.elena as unknown as string;
    await clienteCon(t, d, "ConVentaArchivada", [{ estado: "ganada", archivado: true }]);
    const as = await como(t, "elena@x.test");
    const filas = await as.query(api.clientes.listar, {});
    expect(filas.find((f) => f.nombre === "ConVentaArchivada")?.estado).toBe("nuevo_lead");
  });

  it("sin sesión → rechaza", async () => {
    const { t } = await mundo();
    await expect(t.query(api.clientes.listar, {})).rejects.toThrow();
  });
});

describe("clientes · ficha", () => {
  it("null si el cliente no existe o está archivado", async () => {
    const { t, ids } = await mundo();
    const elena = await como(t, "elena@x.test");
    const id = await elena.mutation(api.clientes.crearCliente, { nombre: "X", propietario: ids.elena });
    // Inexistente:
    const borrado = await t.run(async (ctx) => {
      const c = await ctx.db.insert("clientes", {
        nombre: "Tmp", prioridad: "media", propietario: ids.elena, registrado_por: ids.elena, archivado: false,
      });
      await ctx.db.delete(c);
      return c;
    });
    expect(await elena.query(api.clientes.ficha, { id: borrado })).toBeNull();
    // Archivado:
    await t.run((ctx) => ctx.db.patch(id, { archivado: true }));
    expect(await elena.query(api.clientes.ficha, { id })).toBeNull();
  });

  it("valor derivado = Σ ganadas (importe*cantidad); ignora perdidas/abiertas/archivadas", async () => {
    const { t, ids } = await mundo();
    const cid = await t.run(async (ctx) => {
      const c = await ctx.db.insert("clientes", {
        nombre: "ConVentas", prioridad: "media", propietario: ids.elena, registrado_por: ids.elena, archivado: false,
      });
      const v = (estado: "ganada" | "abierta" | "perdida", importe: number, cantidad: number, archivado = false) =>
        ctx.db.insert("ventas", {
          cliente_id: c, producto: "P", importe, cantidad, estado, fecha: 1,
          vendedor: ids.carlos, registrado_por: ids.carlos, archivado,
        });
      await v("ganada", 100, 3); // 300
      await v("ganada", 50, 1); // 50
      await v("abierta", 1000, 5); // ignorada
      await v("perdida", 999, 9); // ignorada
      await v("ganada", 500, 2, true); // archivada → ignorada
      return c;
    });
    const ficha = await (await como(t, "elena@x.test")).query(api.clientes.ficha, { id: cid });
    expect(ficha!.valor).toBe(350);
    expect(ficha!.estado).toBe("ganado"); // hay ganada no archivada
  });

  it("ventas listadas con total = importe*cantidad (cantidad > 1) y vendedorNombre", async () => {
    const { t, ids } = await mundo();
    const cid = await t.run(async (ctx) => {
      const c = await ctx.db.insert("clientes", {
        nombre: "V", prioridad: "media", propietario: ids.elena, registrado_por: ids.elena, archivado: false,
      });
      await ctx.db.insert("ventas", {
        cliente_id: c, producto: "Plan Pro", importe: 120, cantidad: 4, estado: "abierta", fecha: 10,
        vendedor: ids.carlos, registrado_por: ids.carlos, archivado: false,
      });
      await ctx.db.insert("ventas", {
        cliente_id: c, producto: "Archivada", importe: 1, cantidad: 1, estado: "ganada", fecha: 20,
        vendedor: ids.carlos, registrado_por: ids.carlos, archivado: true, // no debe listarse
      });
      return c;
    });
    const ficha = await (await como(t, "elena@x.test")).query(api.clientes.ficha, { id: cid });
    expect(ficha!.ventas).toHaveLength(1);
    expect(ficha!.ventas[0].total).toBe(480); // 120 * 4
    expect(ficha!.ventas[0].vendedorNombre).toBe("Carlos");
    expect(ficha!.ventas[0].producto).toBe("Plan Pro");
  });

  it("interacciones desc por fecha; ultimoContacto = max; autorNombre resuelto", async () => {
    const { t, ids } = await mundo();
    const cid = await t.run(async (ctx) => {
      const c = await ctx.db.insert("clientes", {
        nombre: "I", prioridad: "media", propietario: ids.elena, registrado_por: ids.elena, archivado: false,
      });
      const i = (fecha: number, autor: typeof ids.elena) =>
        ctx.db.insert("interacciones", { cliente_id: c, tipo: "llamada", fecha, registrado_por: autor });
      await i(100, ids.elena);
      await i(300, ids.carlos);
      await i(200, ids.elena);
      return c;
    });
    const ficha = await (await como(t, "elena@x.test")).query(api.clientes.ficha, { id: cid });
    expect(ficha!.interacciones.map((x) => x.fecha)).toEqual([300, 200, 100]);
    expect(ficha!.ultimoContacto).toBe(300);
    expect(ficha!.interacciones[0].autorNombre).toBe("Carlos");
  });

  it("sin interacciones → ultimoContacto null y lista vacía", async () => {
    const { t, ids } = await mundo();
    const id = await (await como(t, "elena@x.test")).mutation(api.clientes.crearCliente, {
      nombre: "SinInter", propietario: ids.elena,
    });
    const ficha = await (await como(t, "elena@x.test")).query(api.clientes.ficha, { id });
    expect(ficha!.ultimoContacto).toBeNull();
    expect(ficha!.interacciones).toEqual([]);
  });

  it("proximoSeguimiento = pendiente más próximo; ignora 'hecho'; null si no hay pendientes", async () => {
    const { t, ids } = await mundo();
    const cid = await t.run(async (ctx) => {
      const c = await ctx.db.insert("clientes", {
        nombre: "S", prioridad: "media", propietario: ids.elena, registrado_por: ids.elena, archivado: false,
      });
      await ctx.db.insert("seguimientos", { cliente_id: c, fecha_objetivo: 500, estado: "pendiente", responsable: ids.carlos, motivo: "Tarde" });
      await ctx.db.insert("seguimientos", { cliente_id: c, fecha_objetivo: 300, estado: "pendiente", responsable: ids.carlos, motivo: "Pronto" });
      await ctx.db.insert("seguimientos", { cliente_id: c, fecha_objetivo: 100, estado: "hecho", responsable: ids.carlos, motivo: "Viejo" });
      return c;
    });
    const elena = await como(t, "elena@x.test");
    const ficha = await elena.query(api.clientes.ficha, { id: cid });
    expect(ficha!.proximoSeguimiento?.fechaObjetivo).toBe(300);
    expect(ficha!.proximoSeguimiento?.motivo).toBe("Pronto");

    // Sin pendientes → null
    const soloHecho = await t.run(async (ctx) => {
      const c = await ctx.db.insert("clientes", {
        nombre: "SH", prioridad: "media", propietario: ids.elena, registrado_por: ids.elena, archivado: false,
      });
      await ctx.db.insert("seguimientos", { cliente_id: c, fecha_objetivo: 10, estado: "hecho", responsable: ids.carlos });
      return c;
    });
    expect((await elena.query(api.clientes.ficha, { id: soloHecho }))!.proximoSeguimiento).toBeNull();
  });

  it("fallback 'Usuario no disponible' si el propietario/autor no resuelve", async () => {
    const { t, ids } = await mundo();
    const fantasma = await t.run(async (ctx) => {
      const u = await ctx.db.insert("usuarios", { nombre: "Fantasma", email: "f@x.test", rol: "vendedor", activo: true });
      await ctx.db.delete(u);
      return u;
    });
    const cid = await t.run((ctx) =>
      ctx.db.insert("clientes", {
        nombre: "Huerfano", prioridad: "media", propietario: fantasma, registrado_por: ids.elena, archivado: false,
      }),
    );
    const ficha = await (await como(t, "elena@x.test")).query(api.clientes.ficha, { id: cid });
    expect(ficha!.propietarioNombre).toBe("Usuario no disponible");
  });

  it("sin sesión → rechaza", async () => {
    const { t, ids } = await mundo();
    const id = await (await como(t, "elena@x.test")).mutation(api.clientes.crearCliente, {
      nombre: "X", propietario: ids.elena,
    });
    await expect(t.query(api.clientes.ficha, { id })).rejects.toThrow();
  });
});
