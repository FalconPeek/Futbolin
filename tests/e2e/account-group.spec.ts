import { test, expect } from "@playwright/test";
import { createUser, login, createGroupWithMembers } from "./helpers";

const GROUP_URL = /\/g\/([0-9a-f-]{36})$/;

test.describe("Cuenta y grupo (e2e)", () => {
  test("registrarse, crear grupo, copiar el link y que un segundo usuario se una", async ({
    page,
    context,
    browser,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const ownerName = "Registrador Test";
    const email = `e2e-${crypto.randomUUID()}@picado.test`;

    // Registrarse desde la pantalla
    await page.goto("/registrarme");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Tu nombre").fill(ownerName);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña").fill("SecurePass123");
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    await expect(page).toHaveURL(/\/grupos$/);
    await expect(page.getByText("Todavía no estás en ningún grupo")).toBeVisible();

    // Crear el grupo
    await page.getByRole("link", { name: "Crear grupo" }).first().click();
    await expect(page).toHaveURL(/\/grupos\/nuevo$/);
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Nombre del grupo").fill("Grupo e2e");
    await page.getByRole("button", { name: "Crear grupo" }).click();

    await expect(page).toHaveURL(GROUP_URL);
    const groupId = page.url().match(GROUP_URL)?.[1];
    expect(groupId).toBeTruthy();
    await expect(page.getByRole("heading", { name: "Grupo e2e" })).toBeVisible();

    // Ir a Miembros desde la home del grupo y ver el código de invitación
    await page.getByRole("link", { name: "Miembros" }).click();
    await expect(page).toHaveURL(/\/miembros$/);
    await expect(page.getByText("Invitá a tus amigos")).toBeVisible();
    await expect(page.getByText("Código", { exact: true })).toBeVisible();
    const codeText = page.getByText(/^[A-Z0-9]{8}$/);
    await expect(codeText).toBeVisible();
    const inviteCode = (await codeText.textContent())?.trim() ?? "";
    expect(inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);

    // Copiar el link: el portapapeles tiene que quedar con <origin>/unirse/<CODE>
    const origin = new URL(page.url()).origin;
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Copiar link" }).click();
    await expect(page.getByText("Copiamos el link.")).toBeVisible();

    const copiedLink = await page.evaluate(() => navigator.clipboard.readText());
    expect(copiedLink).toBe(`${origin}/unirse/${inviteCode}`);

    // Segundo usuario: entra con el link copiado
    const second = await createUser("Segundo Jugador");
    const secondContext = await browser.newContext();
    try {
      const secondPage = await secondContext.newPage();
      await login(secondPage, second);

      await secondPage.goto(copiedLink);
      await expect(secondPage.getByText("Te invitaron a")).toBeVisible();
      await expect(secondPage.getByRole("heading", { name: "Grupo e2e" })).toBeVisible();
      await expect(secondPage.getByText("1 miembro", { exact: true })).toBeVisible();

      await secondPage.waitForLoadState("networkidle");
      await secondPage.getByRole("button", { name: "Unite al grupo" }).click();
      await expect(secondPage).toHaveURL(`/g/${groupId}`);
      await expect(secondPage.getByRole("heading", { name: "Grupo e2e" })).toBeVisible();

      // Con el link ya usado, el segundo usuario ya es miembro y se lo manda directo al grupo
      await secondPage.goto(copiedLink);
      await expect(secondPage).toHaveURL(`/g/${groupId}`);
    } finally {
      await secondContext.close();
    }

    // El dueño ve el grupo con 2 miembros en su lista de grupos
    await page.goto("/grupos");
    await expect(page.getByText("Grupo e2e")).toBeVisible();
    await expect(page.getByText("2 miembros", { exact: true })).toBeVisible();
  });

  // HALLAZGO H1 (ver el reporte de T44): /g/<gid>/miembros ordena con
  // .order("profiles.display_name"), PostgREST responde PGRST100 y la página ignora el error:
  // la lista de miembros sale vacía. Cuando se arregle (order con referencedTable: "profiles"),
  // este test pasa a verde y Playwright lo marca como fallo: sacá la línea test.fail().
  test("la lista de miembros muestra a todos los integrantes", async ({ page }) => {
    test.fail(true, "H1: la página de miembros no lista a nadie (PGRST100 al ordenar)");

    const owner = await createUser("Dueña Del Grupo");
    const member = await createUser("Miembro Nuevo");
    const { groupId } = await createGroupWithMembers(owner, [member], "Grupo con miembros");

    await login(page, owner);
    await page.goto(`/g/${groupId}/miembros`);

    await expect(page.getByText("Dueña Del Grupo", { exact: true })).toBeVisible();
    await expect(page.getByText("Miembro Nuevo", { exact: true })).toBeVisible();
    await expect(page.getByText("(vos)")).toBeVisible();
  });

  test("un link de invitación inválido avisa que no sirve", async ({ page }) => {
    const user = await createUser("Invitado Perdido");
    await login(page, user);

    await page.goto("/unirse/ZZZZZZZZ");
    await expect(page.getByRole("heading", { name: "Este link no sirve" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Unite al grupo" })).toHaveCount(0);
  });

  test("usuario sin sesión en /g/<gid> es redirigido a /ingresar", async ({ page }) => {
    const owner = await createUser("Owner User");
    const { groupId } = await createGroupWithMembers(owner, [], "Test Group");

    await page.goto(`/g/${groupId}`);

    await expect(page).toHaveURL(/\/ingresar\?next=/);
    await expect(page.getByRole("button", { name: "Ingresá" })).toBeVisible();
  });
});
