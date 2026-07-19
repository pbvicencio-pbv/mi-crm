// Suite E2E de los 3 recorridos del PRD (M6.2 · TAL-20). Playwright headless, parametrizada por env.
//
// SEGURIDAD:
//  - Escribe datos → corre SOLO contra el deployment DESECHABLE de E2E (nunca `elated-donkey-854`).
//  - `resetE2E` es el baseline Y el GUARDIÁN: si el entorno apunta a un deployment sin
//    `E2E_ALLOW_RESET=true` (p. ej. producción), lanza y el runner ABORTA antes de escribir nada.
//  - Credenciales solo por env `E2E_*`; se valida su presencia y NUNCA se imprimen.
//
// Uso (ver DEPLOY.md): con el front E2E sirviendo en E2E_BASE_URL y el deployment desechable
// configurado (CONVEX_DEPLOYMENT/CONVEX_DEPLOY_KEY), ejecutar `npm run e2e`.
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const REQUIRED = ["E2E_BASE_URL", "E2E_EMAIL_DUENA", "E2E_PW_DUENA", "E2E_EMAIL_VENDEDOR", "E2E_PW_VENDEDOR"];
const faltan = REQUIRED.filter((k) => !process.env[k]);
if (faltan.length) {
  console.error(`Faltan variables E2E: ${faltan.join(", ")} (ver DEPLOY.md). No se imprime ningún valor.`);
  process.exit(2);
}
const BASE = process.env.E2E_BASE_URL;
const CRED = {
  duena: { email: process.env.E2E_EMAIL_DUENA, pw: process.env.E2E_PW_DUENA },
  vendedor: { email: process.env.E2E_EMAIL_VENDEDOR, pw: process.env.E2E_PW_VENDEDOR },
};

const log = (...a) => console.log("•", ...a);
function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

/** Baseline + guardián: resetea el desechable; si apunta a prod (sin E2E_ALLOW_RESET) → lanza. */
function resetBaseline() {
  try {
    execSync("npx convex run e2e:resetE2E", { stdio: "pipe" });
  } catch {
    throw new Error(
      "resetE2E falló: el deployment configurado no es el desechable de E2E (E2E_ALLOW_RESET). Abortando para NO escribir en producción.",
    );
  }
}

async function nuevaPagina(browser, width) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 812 : 900 } });
  const page = await ctx.newPage();
  const errores = [];
  page.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  page.on("pageerror", (e) => errores.push(String(e)));
  page.__errores = errores;
  return page;
}

async function login(page, rol) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', CRED[rol].email);
  await page.fill('input[name="password"]', CRED[rol].pw);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !location.pathname.startsWith("/login"), { timeout: 25000 });
}

const modal = (page) => page.getByRole("dialog");
async function esperarToast(page, texto) {
  await page.getByText(texto, { exact: false }).first().waitFor({ timeout: 8000 });
}

// ── Recorrido 1: Carlos (vendedor, móvil) — flujo completo del día ──────────────
async function recorridoCarlos(browser) {
  const page = await nuevaPagina(browser, 375);
  await login(page, "vendedor");

  await page.goto(`${BASE}/hoy`, { waitUntil: "domcontentloaded" });
  const tarea = page.getByRole("article").first();
  await tarea.waitFor({ timeout: 15000 });
  const href = await tarea.getByRole("link").first().getAttribute("href");
  assert(href && href.startsWith("/clientes/"), "la agenda de Carlos debe listar tareas con enlace a ficha");

  await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1 }).first().waitFor({ timeout: 15000 });

  // Anotar interacción
  await page.getByRole("button", { name: /Anotar/ }).first().click();
  await modal(page).waitFor({ timeout: 6000 });
  await modal(page).getByLabel("¿Qué pasó?").fill("E2E: llamada de prueba");
  await modal(page).getByRole("button", { name: /Guardar interacción/ }).click();
  await esperarToast(page, "Interacción registrada");

  // Programar seguimiento (atajo Mañana)
  await page.getByRole("button", { name: /Programar seguimiento/ }).first().click().catch(async () => {
    await page.getByRole("button", { name: /Anotar/ }).first().click(); // fallback: sección con historial
  });
  await modal(page).waitFor({ timeout: 6000 });
  await modal(page).getByRole("button", { name: "Mañana" }).click();
  await modal(page).getByRole("button", { name: /Agendar seguimiento/ }).click();
  await esperarToast(page, "Seguimiento agendado");

  // Registrar venta
  await page.getByRole("button", { name: /Registrar venta|^Registrar$/ }).first().click();
  await modal(page).waitFor({ timeout: 6000 });
  await modal(page).getByLabel("¿Qué se vendió?").fill("E2E Producto");
  await modal(page).getByLabel("Importe").fill("1500");
  await modal(page).getByRole("button", { name: /Registrar venta/ }).click();
  await esperarToast(page, "Venta registrada");
  await page.getByText("E2E Producto").first().waitFor({ timeout: 8000 }); // aparece en la ficha

  // Volver a la agenda y marcar hecho
  await page.goto(`${BASE}/hoy`, { waitUntil: "domcontentloaded" });
  await page.getByRole("article").first().waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: /Marcar hecho/ }).first().click();
  await esperarToast(page, "Seguimiento completado");

  assert(page.__errores.length === 0, `errores de consola: ${page.__errores.join(" | ")}`);
  await page.context().close();
}

// ── Recorrido 2: cliente nuevo (móvil) ──────────────────────────────────────────
async function recorridoClienteNuevo(browser) {
  const page = await nuevaPagina(browser, 375);
  await login(page, "vendedor");

  await page.goto(`${BASE}/clientes/nuevo`, { waitUntil: "domcontentloaded" });
  const nombre = "E2E Lead Instagram";
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByRole("button", { name: "Instagram" }).click();
  await page.getByRole("button", { name: /Guardar cliente/ }).click();
  await page.getByRole("heading", { name: nombre, level: 1 }).waitFor({ timeout: 12000 });

  // Programar seguimiento al nuevo cliente
  await page.getByRole("button", { name: /Programar seguimiento/ }).first().click();
  await modal(page).waitFor({ timeout: 6000 });
  await modal(page).getByRole("button", { name: "Mañana" }).click();
  await modal(page).getByRole("button", { name: /Agendar seguimiento/ }).click();
  await esperarToast(page, "Seguimiento agendado");
  await page.getByText("Sin seguimiento programado.").waitFor({ state: "detached", timeout: 8000 });

  assert(page.__errores.length === 0, `errores de consola: ${page.__errores.join(" | ")}`);
  await page.context().close();
}

// ── Recorrido 3: Marta (dueña, escritorio) — lectura del negocio ─────────────────
async function recorridoMarta(browser) {
  const page = await nuevaPagina(browser, 1280);
  await login(page, "duena");

  await page.goto(`${BASE}/hoy`, { waitUntil: "domcontentloaded" });
  await page.getByRole("article").first().waitFor({ timeout: 15000 });

  await page.goto(`${BASE}/clientes`, { waitUntil: "domcontentloaded" });
  const card = page.getByRole("article").first();
  await card.waitFor({ timeout: 15000 });
  const href = await card.getByRole("link").first().getAttribute("href");
  await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
  await page.getByText("Datos").first().waitFor({ timeout: 12000 });

  await page.goto(`${BASE}/ventas`, { waitUntil: "domcontentloaded" });
  await page.getByRole("group", { name: "En marcha" }).waitFor({ timeout: 12000 });
  await page.getByRole("group", { name: "Ganado" }).waitFor({ timeout: 8000 });

  assert(page.__errores.length === 0, `errores de consola: ${page.__errores.join(" | ")}`);
  await page.context().close();
}

const RECORRIDOS = [
  ["Carlos (vendedor · móvil)", recorridoCarlos],
  ["Cliente nuevo (móvil)", recorridoClienteNuevo],
  ["Marta (dueña · escritorio)", recorridoMarta],
];

const browser = await chromium.launch();
let fallos = 0;
try {
  for (const [nombre, fn] of RECORRIDOS) {
    resetBaseline(); // baseline + guardián anti-prod antes de cada recorrido
    try {
      await fn(browser);
      log(`PASS · ${nombre}`);
    } catch (e) {
      fallos++;
      console.error(`FAIL · ${nombre}: ${e.message}`);
    }
  }
} finally {
  await browser.close();
}
console.log(fallos === 0 ? "\n=== E2E PASS (3/3) ===" : `\n=== E2E FAIL (${fallos} recorrido(s)) ===`);
process.exit(fallos === 0 ? 0 : 1);
