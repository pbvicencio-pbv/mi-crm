# gotchas.md — CRM Pulse

Registro de errores de sesión y patrones a evitar (Regla Absoluta 2 de `CLAUDE.md`).

**Formato de cada entrada:**

```
## AAAA-MM-DD · [categoría] Título corto
- **Qué pasó:** síntoma observado.
- **Causa raíz:** por qué ocurrió.
- **Regla preventiva:** qué hacer para que no se repita.
- **Ocurrencias:** 1  (al llegar a 3 → promover a «Errores Críticos» en CLAUDE.md)
```

Categorías sugeridas: `build` · `types` · `convex` · `auth` · `deploy` · `ui` · `tests` · `git`.

---

## Patrones ya promovidos (ver «Errores Críticos» en CLAUDE.md)

- **[auth]** Autenticación que falla ABIERTA (`identidad ?? dev`). Fallar cerrado.
- **[convex]** Tests de Convex rompen el push de `convex dev` (`import.meta.glob`); mantener la
  exclusión en `convex/tsconfig.json`.

---

## Registro

<!-- Añadir entradas nuevas arriba (más reciente primero) siguiendo el formato. -->

## 2026-07-18 · [tests] `role="menuitem"` anula el rol implícito → `getByRole("button"/"link")` no lo encuentra
- **Qué pasó:** al testear el menú ⋮ de la lista de clientes (TAL-59), 3 tests fallaron con "Unable to find role" pese a que el DOM mostraba el elemento. Buscaba `getByRole("button", {name:/Eliminar/})` y `getByRole("link", {name:/Editar/})`, pero a esos elementos les puse `role="menuitem"` (correcto para un `role="menu"`).
- **Causa raíz:** un atributo `role` explícito SUSTITUYE al rol implícito del elemento; un `<button role="menuitem">` deja de exponerse como `button` para Testing Library (queda como `menuitem`), e igual un `<a role="menuitem">` deja de ser `link`.
- **Regla preventiva:** cuando un elemento lleva `role` explícito, consultar por ESE rol en los tests (`getByRole("menuitem", …)`), no por el implícito. El atributo `href`/`disabled` sigue verificándose con `toHaveAttribute`/`toBeDisabled` sobre el mismo nodo.
- **Ocurrencias:** 1

## 2026-07-18 · [tests] Verify de UI con Playwright contra rutas protegidas (receta que funciona)
- **Qué pasó:** al verificar la Ficha 360 sin extensión de navegador, tres tropiezos: (1) el script en el scratchpad no resolvía `import "playwright"` (`ERR_MODULE_NOT_FOUND`) porque ESM busca `node_modules` desde la carpeta del archivo; (2) todas las rutas salvo `/login` responden `307 → /login` (middleware), así que hay que loguear primero; (3) mi heurística "hay `role=alert` ⇒ login falló" dio falso negativo porque **`/hoy` tiene su propio `role="alert"`** (banner de la Agenda).
- **Causa raíz:** supuestos sobre resolución de módulos ESM y sobre qué señales indican fallo de login.
- **Regla preventiva:** receta de verify Playwright para PULSE: (a) colocar el `.mjs` en la **raíz del proyecto** (o donde esté `node_modules`), correr y borrarlo; (b) login real: `POST` del form en `/login` con `input[name=email]`/`input[name=password]` + `button[type=submit]`; credenciales demo desde `npx convex env get CRM_SEED_PW_DUENA` (dueña `elena.demo@pulsecrm.test` ve todos los clientes) — capturar en variable de shell, **no imprimir**; (c) éxito de login = `page.url()` deja de incluir `/login` (NO usar `role=alert`, que existe en `/hoy`); (d) tras login, navegar a la ficha y screenshot a 1280 y 375. Requiere `npx playwright install chromium` una vez. Read-only sobre `elated-donkey-854` (compartido) → seguro.
- **Ocurrencias:** 1

## 2026-07-17 · [build] OneDrive rompe Next con EINVAL readlink en `.next/diagnostics/framework.json`
- **Qué pasó:** `npm run dev` murió al arrancar con `[Error: EINVAL: invalid argument, readlink '…\.next\diagnostics\framework.json']` (y wipeó el `.next/BUILD_ID` de producción). Más tarde, `npm run build` falló **con el mismo EINVAL de forma INTERMITENTE** (varios builds previos habían pasado); OneDrive bloquea/sincroniza `.next` a mitad de operación.
- **Causa raíz:** el repo vive bajo `OneDrive - FORTIA\…`; los reparse points de OneDrive rompen el `readlink` sobre `.next/diagnostics/*`. Afecta tanto a `next dev` (siempre) como a `next build` (intermitente).
- **Regla preventiva:** (1) para ver/verificar en local usar el **build de producción** `npm run build` → `npm run start` (:3000), NO `next dev`. (2) Si `next build` da EINVAL, **`rm -rf .next` y reconstruir** (resuelve el intermitente). (3) Fix de raíz: sacar el repo de OneDrive o fijar `distDir` fuera de la carpeta sincronizada.
- **Ocurrencias:** 2 (dev al arrancar + build intermitente)

## 2026-07-17 · [deploy] Poll de deploy en background roto por usar `jq` (no instalado)
- **Qué pasó:** un poll en segundo plano para vigilar el redeploy de Railway usó `railway status --json | jq …`. `jq` NO existe en este entorno (Git Bash/Windows), así que devolvió vacío en las 18 iteraciones y agotó el tiempo (~6 min) sin informar el estado real (el deploy sí había quedado SUCCESS).
- **Causa raíz:** asumí `jq` disponible sin verificar; y metí el comando sin probarlo dentro de un background largo. El reintento con `node` también falló al inicio por buscar `commitHash` al nivel equivocado (vive en `meta.commitHash`, no como hermano de `status`).
- **Regla preventiva:** en este entorno NO hay `jq` → parsear JSON con `node -e`. Probar el comando de parseo UNA vez en foreground antes de meterlo en un background/poll largo, y verificar la estructura real del JSON (dónde vive cada campo) antes de escribir el filtro.
- **Ocurrencias:** 1
