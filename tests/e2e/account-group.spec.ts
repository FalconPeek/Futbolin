import { test, expect } from "@playwright/test";
import { createUser, login, createGroupWithMembers } from "./helpers";

test.describe("Cuenta y Grupo (e2e)", () => {
  test("registrarse → crear grupo → copiar link → unirse", async ({
    page,
    context,
  }) => {
    // Step 1: Register a new user
    const newEmail = `e2e-${Date.now()}-${Math.random().toString(36).substring(7)}@picado.test`;
    const newPassword = "SecurePass123";
    const displayName = "Registrador Test";

    await page.goto("/registrarme");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Tu nombre").fill(displayName);
    await page.getByLabel("Email").fill(newEmail);
    await page.getByLabel("Contraseña").fill(newPassword);
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    // Should land in /grupos after signup
    await page.waitForURL("/grupos", { timeout: 10000 });
    expect(page.url()).toContain("/grupos");

    // Step 2: Should see empty state
    const emptyMessage = page.getByText("Todavía no estás en ningún grupo");
    await expect(emptyMessage).toBeVisible();

    // Step 3: Create a group
    const createLink = page.getByRole("link", { name: "Crear grupo" }).first();
    await expect(createLink).toBeVisible();
    await createLink.click();

    // Should be in /grupos/nuevo
    await page.waitForURL(/\/grupos\/nuevo/, { timeout: 10000 });

    // Fill group creation form
    await page.getByLabel("Nombre del grupo").fill("Grupo e2e");
    const submitButton = page.getByRole("button", { name: "Crear grupo" });
    await submitButton.click();

    // Should be redirected to /g/<gid>
    await page.waitForURL(/\/g\/[a-f0-9-]+/, { timeout: 10000 });
    const groupUrl = page.url();
    const groupIdMatch = groupUrl.match(/\/g\/([a-f0-9-]+)/);
    const groupId = groupIdMatch?.[1];
    expect(groupId).toBeTruthy();

    // Step 4: Navigate to members page and get invite code
    await page.goto(`/g/${groupId}/miembros`, { waitUntil: "networkidle" });

    // Check for invitation code section
    const inviteSection = page.getByText("Código");
    await expect(inviteSection).toBeVisible();

    // Extract the invite code from the display
    const codeDisplay = page.locator("p.text-score").first();
    const inviteCode = (await codeDisplay.textContent())?.trim();
    expect(inviteCode).toMatch(/^[A-Z0-9]{8}$/i);

    // Step 5: Second user joins via /unirse/<code>
    const secondUser = await createUser("Second User");
    const newPageContext = await context.browser()!.newContext();
    const secondPage = await newPageContext.newPage();

    // Login second user
    await login(secondPage, secondUser);

    // Navigate to /unirse/<code>
    await secondPage.goto(`/unirse/${inviteCode}`, { waitUntil: "networkidle" });

    // Should see group name
    const groupNamePreview = secondPage.getByText("Grupo e2e");
    await expect(groupNamePreview).toBeVisible();

    // Should see join button
    const joinButton = secondPage.getByRole("button", { name: "Unite al grupo" });
    await expect(joinButton).toBeVisible();

    // Click to join
    await joinButton.click();

    // Should be redirected to /g/<gid>
    await secondPage.waitForURL(`/g/${groupId}`, { timeout: 10000 });

    // Cleanup
    await newPageContext.close();
  });

  test("usuario sin sesión en /g/<gid> es redirigido a /ingresar", async ({
    page,
    context,
  }) => {
    // Create a test group with an owner
    const owner = await createUser("Owner User");
    const { groupId } = await createGroupWithMembers(owner, [], "Test Group");

    // Create a new browser context without authentication
    const unauthPage = await context.browser()!.newPage();

    // Try to access the group page without authentication
    await unauthPage.goto(`/g/${groupId}`);

    // Should be redirected to /ingresar with ?next parameter
    await unauthPage.waitForURL(/\/ingresar\?next=/, { timeout: 10000 });
    expect(unauthPage.url()).toContain("/ingresar");
    expect(unauthPage.url()).toContain("?next=");

    await unauthPage.close();
  });
});
