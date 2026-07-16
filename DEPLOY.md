# Despliegue — Railway + Convex

Railway está conectado a GitHub (`pbvicencio-pbv/mi-crm`) y publica **automáticamente en cada push a `main`**.

## Arquitectura de despliegue
- **Frontend (Next.js 15):** Railway (Nixpacks) ejecuta `npm install` → `npm run build` → `npm run start`. `next start` escucha en el `PORT` que inyecta Railway.
- **Backend (Convex):** las funciones viven en `convex/` y corren en el deployment de Convex al que apunta `NEXT_PUBLIC_CONVEX_URL`. `convex/_generated` está versionado, así que el build no depende de regenerarlo.

## Variables de entorno en Railway

| Variable | Obligatoria | Para qué |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | ✅ | URL del deployment de Convex. **Se inlinea en build**, por lo que debe estar definida antes de compilar. |
| `CONVEX_DEPLOY_KEY` | Solo Opción B | Clave de despliegue de producción de Convex (Dashboard → Settings → Deploy Keys). |

### Opción A — Rápida (apuntar a un deployment existente de Convex)
1. En Railway → **Variables**: `NEXT_PUBLIC_CONVEX_URL = https://<deployment>.convex.cloud`.
2. Ese deployment debe tener las funciones desplegadas (`npx convex deploy`).

### Opción B — Recomendada para producción (Convex se despliega en el build)
1. En Railway → **Settings → Build Command**: `npx convex deploy --cmd 'npm run build'`.
2. Añade `CONVEX_DEPLOY_KEY`. `convex deploy` publica las funciones al deployment de producción **e inyecta `NEXT_PUBLIC_CONVEX_URL` automáticamente** en el build.

## Datos de demo (temporal, hasta el login M2.2 / TAL-10)
El acceso real (Convex Auth) llega en M2.2. Mientras tanto, para que la Agenda muestre datos en un deployment, define en **ese** deployment de Convex:
```
npx convex env set CRM_DEV_USER_EMAIL <email de la dueña demo>
npx convex env set CRM_ALLOW_SEED true
npx convex run seed:run
npx convex env remove CRM_ALLOW_SEED
```
Sin `CRM_DEV_USER_EMAIL`, la Agenda responde "No autenticado" (falla cerrado; sin fuga de datos).

## Requisitos
- **Node ≥ 20** (fijado en `package.json` → `engines`).
- Comandos: `npm run build` (producción), `npm run start` (servir), `npm test` (Vitest), `npm run lint`.
