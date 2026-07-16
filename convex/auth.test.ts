import { describe, it, expect, afterEach, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { resolverUsuario } from "./lib/auth";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

afterEach(() => vi.unstubAllEnvs());

async function sembrarDuena(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("usuarios", { nombre: "Elena", email: "elena@x.test", rol: "duena" });
  });
}

describe("resolverUsuario (falla cerrado; fallback dev explícito)", () => {
  it("identidad presente + email conocido (con distinta capitalización) → usuario", async () => {
    const t = convexTest(schema, modules);
    await sembrarDuena(t);
    const u = await t.withIdentity({ email: "Elena@X.test" }).run((ctx) => resolverUsuario(ctx));
    expect(u?.email).toBe("elena@x.test");
    expect(u?.rol).toBe("duena");
  });

  it("identidad presente + email desconocido → null (NO hereda el fallback dev)", async () => {
    const t = convexTest(schema, modules);
    await sembrarDuena(t);
    vi.stubEnv("CRM_DEV_USER_EMAIL", "elena@x.test"); // aunque exista la variable dev...
    const u = await t.withIdentity({ email: "fantasma@x.test" }).run((ctx) => resolverUsuario(ctx));
    expect(u).toBeNull();
  });

  it("sin identidad + CRM_DEV_USER_EMAIL → usuario dev", async () => {
    const t = convexTest(schema, modules);
    await sembrarDuena(t);
    vi.stubEnv("CRM_DEV_USER_EMAIL", "ELENA@x.test");
    const u = await t.run((ctx) => resolverUsuario(ctx));
    expect(u?.email).toBe("elena@x.test");
  });

  it("sin identidad + sin variable → null", async () => {
    const t = convexTest(schema, modules);
    await sembrarDuena(t);
    const u = await t.run((ctx) => resolverUsuario(ctx));
    expect(u).toBeNull();
  });

  it("email duplicado → falla cerrado (throws)", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("usuarios", { nombre: "A", email: "dup@x.test", rol: "vendedor" });
      await ctx.db.insert("usuarios", { nombre: "B", email: "dup@x.test", rol: "vendedor" });
    });
    await expect(
      t.withIdentity({ email: "dup@x.test" }).run((ctx) => resolverUsuario(ctx)),
    ).rejects.toThrow();
  });
});
