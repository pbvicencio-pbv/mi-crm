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
