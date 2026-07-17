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

## Autenticación (Convex Auth · M2)

Convex Auth (provider **Password**) corre en el deployment de Convex. Estas variables se fijan en el **deployment de Convex** (`npx convex env set`), NO en `.env.local`:

| Variable | Obligatoria | Para qué |
|---|---|---|
| `JWT_PRIVATE_KEY` | ✅ | Clave RS256 (PKCS8) para firmar los tokens de acceso. |
| `JWKS` | ✅ | JWKS público correspondiente. |
| `SITE_URL` | Condicional / futura | Origen de la app. Solo la ejercen flujos OAuth y email (reset·verify), ausentes en el MVP (Password-only). La fija el initializer; documentada como futura. |
| `CRM_SEED_PW_DUENA`, `CRM_SEED_PW_VENDEDOR`, `CRM_SEED_PW_MARTA` | Solo aprovisionar | Contraseñas (≥ 8) de las cuentas demo. **Fuera del repo.** |
| `CRM_ALLOW_SEED` | Solo aprovisionar | Habilita `seed`/`seedAuth`; se retira tras sembrar. |

**Llaves** (una vez por deployment): generar el par RS256 (`JWT_PRIVATE_KEY` + `JWKS`) con el generador de Convex Auth y fijarlas con `npx convex env set …`.

**Aprovisionar las cuentas de acceso** (idempotente; NO hay auto-registro público):
```
npx convex env set CRM_SEED_PW_DUENA '<contraseña>'
npx convex env set CRM_SEED_PW_VENDEDOR '<contraseña>'
npx convex env set CRM_SEED_PW_MARTA '<contraseña>'
npx convex env set CRM_ALLOW_SEED true
npx convex run seedAuth:run
npx convex env remove CRM_ALLOW_SEED
```
Cuentas: **Elena** (`elena.demo@pulsecrm.test`, dueña), **Carlos** (`carlos.demo@pulsecrm.test`, vendedor) y **Marta** (`marta.demo@pulsecrm.test`, dueña). El aprovisionamiento es idempotente (reconcilia las existentes y crea las que falten). La sesión persiste 30 días.

## Datos de demo
Para poblar la Agenda con datos de demostración (clientes, ventas, seguimientos) en un deployment de Convex:
```
npx convex env set CRM_ALLOW_SEED true
npx convex run seed:run
npx convex env remove CRM_ALLOW_SEED
```
El fallback de desarrollo `CRM_DEV_USER_EMAIL` (resuelve un usuario **solo cuando no hay sesión**, p. ej. desde el CLI) sigue disponible; sin él y sin sesión, las funciones responden "No autenticado" (falla cerrado; sin fuga de datos).

## Requisitos
- **Node ≥ 20** (fijado en `package.json` → `engines`).
- Comandos: `npm run build` (producción), `npm run start` (servir), `npm test` (Vitest), `npm run lint`.
