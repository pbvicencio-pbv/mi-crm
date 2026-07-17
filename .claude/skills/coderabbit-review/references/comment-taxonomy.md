# Comment Taxonomy

Cómo reconocer cada tipo de comentario de CodeRabbit y qué hacer con él.

## Estructura general

Un comentario de CR típicamente tiene:

```
_⚠️ Potential issue_ | _🔒 Security_

**<Título del issue en una línea>**

<Descripción del problema, 1-4 párrafos>

<Opcional: bloque de código con el problema señalado>

```suggestion
<código corregido listo para aplicar con un click>
```

<Opcional: "🔗 Analysis chain" colapsado con el razonamiento>

<Opcional: "🤖 Prompt for AI Agents">
> En un bloque fenced, un prompt optimizado para que un agente como
> Claude Code aplique el fix correctamente.

Committable suggestion skipped: line range outside the PR's diff.
```

## Categorías principales

### 🛡️ Security

Marca: emoji de escudo/candado, títulos con "Security", "vulnerability", "injection", "XSS", "SSRF", "SQL injection", "secret exposed".

**Ejemplo:**
```
_🔒 Security_

**Potential SQL injection via string interpolation**

The query is built with f-string interpolation using user-controlled
input (`user_id` from request body). This allows arbitrary SQL execution.

Use parameterized queries instead:

```suggestion
db.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```
```

**Acción:** SIEMPRE atender. Si hay duda, challenge explícitamente con razonamiento.

---

### ⚠️ Potential Issue / Bug

Marca: emoji ⚠️, títulos con "Potential issue", "Bug risk", "Null reference", "Race condition", "Uncaught exception", "Memory leak".

**Ejemplo:**
```
_⚠️ Potential issue_

**Missing null check on `user` before accessing `user.email`**

If `findUserById` returns `null` (user not found), `user.email` throws.
The caller doesn't handle this path.

```suggestion
const user = await findUserById(id);
if (!user) throw new NotFoundError(`User ${id} not found`);
return user.email;
```

🤖 Prompt for AI Agents
> Fix the null-handling issue at `src/services/userService.ts` line 42.
> After `findUserById`, check if user is null and throw NotFoundError with
> the user id. Keep existing imports and return type.
```

**Acción:** Atender salvo que tengas razón clara para no hacerlo.

---

### 🛠️ Refactor Suggestion

Marca: emoji 🛠️, títulos con "Refactor", "Consider extracting", "Duplication", "Simplify", "Readability".

**Ejemplo:**
```
_🛠️ Refactor suggestion_

**Extract repeated validation logic into a reusable helper**

The same email+password validation block appears in 3 places (register,
login, reset-password). Extract to `validateCredentials(email, password)`
to reduce duplication and ensure consistency.
```

**Acción:** Evaluar. Preguntas clave:
- ¿El refactor mejora mantenibilidad significativamente, o es cosmético?
- ¿El costo (riesgo de regresión + review time) vale la pena?
- Si es un proyecto en activo desarrollo: hacer si es barato, skip si es caro.
- Si es legacy / poco mantenido: probablemente skip.

---

### 🧹 Nitpick (Optional)

Marca: emoji 🧹, título con "Nitpick (optional)", naming minor, consistency de whitespace, comentarios redundantes, uso de `var` vs `let`.

**Ejemplo:**
```
_🧹 Nitpick (optional)_

**Consider using `const` instead of `let` since `counter` is not reassigned**

`counter` is declared with `let` but never reassigned in this scope.
```

**Acción:** Por default, IGNORAR. Resolver el thread sin fix.

**Excepción:** si tu equipo decide explícitamente que un nit particular sí importa (ej: usan `const` religiosamente), atiéndelo — pero ajusta `.coderabbit.yaml` para que no re-sugiera. Lo que acordaste como regla debe estar en el linter, no en CR.

**Si ves >40% de nitpicks en un review**, es signal de que:
- Tu `profile` está en `assertive` en lugar de `chill`, O
- Tu `instructions` no excluye las categorías de nit que te molestan.

---

### ⚡ Performance

Marca: emoji ⚡ (o ninguno), títulos con "Performance", "N+1", "Unnecessary allocation", "Hot path", "O(n²)".

**Ejemplo:**
```
_⚠️ Potential issue_ | _⚡ Performance_

**N+1 query pattern loading orders for each user**

`getUsers` returns 500 users, then for each user the code calls
`getOrders(user.id)`. This triggers 501 DB roundtrips.

Use a single query with `user_id IN (?, ?, ...)` or a JOIN:
...
```

**Acción:** Atender si es hot path (código que corre frecuentemente o con dataset grande). Skip si es un script one-off o un endpoint de admin raramente usado.

---

### 📝 Documentation

Marca: emoji 📝, título con "Documentation", "Missing docstring", "README out of date".

**Acción:** Caso a caso. En funciones públicas de una librería, atender. En funciones internas, generalmente ignorar.

---

### ℹ️ Positive Feedback / LGTM

Marca: emoji de check/pulgar, título con "Good job", "Nice use of...", "LGTM".

**Acción:** Ignorar (no hay nada que hacer). No necesitas resolver el thread — no bloquea nada.

---

## Bloques especiales

### 🤖 Prompt for AI Agents

Bloque pre-formateado que CR escribe específicamente para agentes de IA (como Claude Code). Si está presente, **úsalo literalmente** como guía del fix:

```
🤖 Prompt for AI Agents
> Fix the null check issue at `src/middleware/auth.ts` line 28-35.
> After calling `verifyToken`, check if the result is null and return
> a 401 response with message 'Invalid token'. Keep the existing logger
> statement but move it after the validation.
```

Pasar este prompt a Claude Code es mucho más efectivo que pedirle "resuelve el comentario" en genérico — CR ya analizó el contexto y destiló las instrucciones exactas.

### `suggestion` block

Bloque de código que GitHub renderiza con botón "Commit suggestion":

````
```suggestion
const result = await fetchUser(id);
if (!result) throw new NotFoundError();
return result;
```
````

**Cuándo aplicarlo tal cual:**
- Fix de 1-3 líneas trivial.
- No altera lógica de negocio cross-file.
- Los tests existentes cubren el caso.

**Cuándo NO aplicarlo tal cual:**
- Requiere cambios en otros archivos (import, tests).
- El suggestion está incompleto (línea extra faltante).
- Tu contexto tiene información que CR no vio.

En esos casos, aplicar manualmente con Edit tool y luego resolver el thread.

### 🔗 Analysis chain

Razonamiento colapsado de CR sobre por qué flaggeó algo. Útil para:
- Entender si CR tuvo contexto correcto.
- Decidir si challenge o atender.
- Aprender patrones para evitar en el futuro.

---

## Detección programática

Desde un body de comentario, clasificar con regex:

```bash
# En fetch_cr_comments.sh usamos esta lógica:

category = (
  body
  | if test("🛡️|Security|vulnerabilidad"; "i") then "security"
    elif test("⚠️ Potential issue|Potential bug"; "i") then "bug"
    elif test("🛠️ Refactor"; "i") then "refactor"
    elif test("🧹 Nitpick|nitpick \\(optional\\)"; "i") then "nitpick"
    elif test("⚡|Performance"; "i") then "performance"
    elif test("📝 Documentation"; "i") then "docs"
    else "other" end
);

has_committable = body | test("```suggestion");
has_ai_prompt = body | test("Prompt for AI Agents|🤖");
```

---

## Anti-patterns a reconocer

**CR alucina:** a veces CR inventa cosas (versión inexistente de un paquete,
función que no existe). Si la sugerencia se siente mal, verifica:
- ¿El package.json realmente tiene esa versión?
- ¿La función mencionada existe en la librería?
- ¿El patrón sugerido existe en este runtime?

Cuando CR alucina, challenge con evidencia:
```
@coderabbitai Python 3.14 does not exist; latest stable is 3.13.
The suggestion references a non-existent version.
```

CR aprende de esto.

**CR contradictorio:** en PRs grandes, CR a veces hace comentarios contradictorios entre sí (uno dice "extrae a helper", otro dice "inline"). Elige el que tenga más sentido y resuelve ambos threads.

**CR repetitivo:** en PRs con cambios similares en muchos archivos (refactor masivo), CR puede hacer el mismo comentario 20 veces. Atiende UNO, fíxealo en todos los archivos, y resuelve los otros 19 threads sin fix adicional.
