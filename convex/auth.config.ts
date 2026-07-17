/**
 * Config de proveedores de identidad para Convex Auth (M2.1 / TAL-9).
 * `CONVEX_SITE_URL` lo inyecta Convex automáticamente (no se setea a mano).
 */
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
