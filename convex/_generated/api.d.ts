/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as clientes from "../clientes.js";
import type * as e2e from "../e2e.js";
import type * as http from "../http.js";
import type * as interacciones from "../interacciones.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_derivados from "../lib/derivados.js";
import type * as lib_fechas from "../lib/fechas.js";
import type * as lib_validadores from "../lib/validadores.js";
import type * as seed from "../seed.js";
import type * as seedAuth from "../seedAuth.js";
import type * as seguimientos from "../seguimientos.js";
import type * as usuarios from "../usuarios.js";
import type * as ventas from "../ventas.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  clientes: typeof clientes;
  e2e: typeof e2e;
  http: typeof http;
  interacciones: typeof interacciones;
  "lib/auth": typeof lib_auth;
  "lib/derivados": typeof lib_derivados;
  "lib/fechas": typeof lib_fechas;
  "lib/validadores": typeof lib_validadores;
  seed: typeof seed;
  seedAuth: typeof seedAuth;
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
