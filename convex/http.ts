import { httpRouter } from "convex/server";
import { auth } from "./auth";

/**
 * Rutas HTTP de Convex Auth (M2.1 / TAL-9): endpoints de sesión/token que usan
 * el middleware de Next.js y el cliente. Es el único router HTTP del proyecto.
 */
const http = httpRouter();
auth.addHttpRoutes(http);

export default http;
