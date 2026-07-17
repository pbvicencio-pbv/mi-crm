import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { DataModel } from "./_generated/dataModel";
import { normalizarEmail } from "./lib/auth";

/**
 * Convex Auth (M2.1 / TAL-9) — provider Password.
 *
 * SIN auto-registro público: `profile` se ejecuta en TODOS los flujos (signUp/signIn/…);
 * si el flujo es `signUp` aborta. Las cuentas se aprovisionan solo por `seedAuth`
 * (createAccount), nunca desde el formulario de acceso.
 *
 * El email se normaliza (trim + minúsculas) para que el `providerAccountId` que usa el
 * login coincida con el que fija el aprovisionamiento.
 */
const CustomPassword = Password<DataModel>({
  profile(params) {
    if (params.flow === "signUp") {
      throw new ConvexError("Registro deshabilitado: las cuentas se aprovisionan internamente.");
    }
    return { email: normalizarEmail(params.email as string) };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [CustomPassword],
});
