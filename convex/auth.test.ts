import { describe, it, expect, afterEach, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { resolverUsuario } from "./lib/auth";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

afterEach(() => vi.unstubAllEnvs());

/** Crea una identidad de Convex Auth (users) + su usuarios de dominio enlazado por authId. */
async function sembrarConAuth(
  t: ReturnType<typeof convexTest>,
  { email = "elena@x.test", rol = "duena" as const }: { email?: string; rol?: "duena" | "vendedor" } = {},
) {
  return await t.run(async (ctx) => {
    const authUserId = await ctx.db.insert("users", { email });
    await ctx.db.insert("usuarios", { nombre: "Elena", email, rol, authId: authUserId });
    return authUserId;
  });
}

describe("resolverUsuario (authId; falla cerrado; fallback dev explícito)", () => {
  it("identidad presente + authId conocido → usuario", async () => {
    const t = convexTest(schema, modules);
    const authUserId = await sembrarConAuth(t);
    const u = await t
      .withIdentity({ subject: `${authUserId}|s1` })
      .run((ctx) => resolverUsuario(ctx));
    expect(u?.email).toBe("elena@x.test");
    expect(u?.rol).toBe("duena");
  });

  it("identidad presente + authId desconocido → null (NO hereda el fallback dev)", async () => {
    const t = convexTest(schema, modules);
    await sembrarConAuth(t);
    vi.stubEnv("CRM_DEV_USER_EMAIL", "elena@x.test"); // aunque exista la variable dev...
    const fantasmaId = await t.run((ctx) => ctx.db.insert("users", { email: "fantasma@x.test" }));
    const u = await t
      .withIdentity({ subject: `${fantasmaId}|s1` })
      .run((ctx) => resolverUsuario(ctx));
    expect(u).toBeNull();
  });

  it("sin identidad + CRM_DEV_USER_EMAIL (distinta capitalización) → usuario dev", async () => {
    const t = convexTest(schema, modules);
    await sembrarConAuth(t, { email: "elena@x.test" });
    vi.stubEnv("CRM_DEV_USER_EMAIL", "ELENA@x.test");
    const u = await t.run((ctx) => resolverUsuario(ctx));
    expect(u?.email).toBe("elena@x.test");
  });

  it("sin identidad + sin variable → null", async () => {
    const t = convexTest(schema, modules);
    await sembrarConAuth(t);
    const u = await t.run((ctx) => resolverUsuario(ctx));
    expect(u).toBeNull();
  });

  it("authId duplicado → falla cerrado (throws)", async () => {
    const t = convexTest(schema, modules);
    const authUserId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("users", { email: "dup@x.test" });
      await ctx.db.insert("usuarios", { nombre: "A", email: "a@x.test", rol: "vendedor", authId: id });
      await ctx.db.insert("usuarios", { nombre: "B", email: "b@x.test", rol: "vendedor", authId: id });
      return id;
    });
    await expect(
      t.withIdentity({ subject: `${authUserId}|s1` }).run((ctx) => resolverUsuario(ctx)),
    ).rejects.toThrow();
  });
});
