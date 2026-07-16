/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as clientes from "../clientes.js";
import type * as health from "../health.js";
import type * as interacciones from "../interacciones.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_derivados from "../lib/derivados.js";
import type * as lib_fechas from "../lib/fechas.js";
import type * as seed from "../seed.js";
import type * as seguimientos from "../seguimientos.js";
import type * as usuarios from "../usuarios.js";
import type * as ventas from "../ventas.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  clientes: typeof clientes;
  health: typeof health;
  interacciones: typeof interacciones;
  "lib/auth": typeof lib_auth;
  "lib/derivados": typeof lib_derivados;
  "lib/fechas": typeof lib_fechas;
  seed: typeof seed;
  seguimientos: typeof seguimientos;
  usuarios: typeof usuarios;
  ventas: typeof ventas;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
