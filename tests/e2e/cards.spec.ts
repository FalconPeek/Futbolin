import { test, expect } from "@playwright/test";
import { createUser, login, createGroupWithMembers } from "./helpers";

test.describe("Cartas y calificaciones", () => {
  test("la carta es provisional con 2 calificaciones y muestra OVR con 3", async ({
    page,
  }) => {
    // Create 4 users: owner + 3 teammates
    const owner = await createUser("Dueño");
    const teammate1 = await createUser("Compañero 1");
    const teammate2 = await createUser("Compañero 2");
    const teammate3 = await createUser("Compañero 3");

    // Create a group
    const { groupId } = await createGroupWithMembers(
      owner,
      [teammate1, teammate2, teammate3],
      "Equipo QA"
    );

    // Both teammate1 and teammate2 rate teammate3 via RPC with "campo" kind
    // Teammate3 has default position "MC" (medio), so kind should be "campo"
    await teammate1.client
      .from("player_ratings")
      .upsert([
        {
          group_id: groupId,
          rater_id: teammate1.id,
          rated_id: teammate3.id,
          kind: "campo",
          s1: 70,
          s2: 75,
          s3: 65,
          s4: 68,
          s5: 72,
          s6: 71,
        },
      ]);

    await teammate2.client
      .from("player_ratings")
      .upsert([
        {
          group_id: groupId,
          rater_id: teammate2.id,
          rated_id: teammate3.id,
          kind: "campo",
          s1: 72,
          s2: 73,
          s3: 68,
          s4: 70,
          s5: 75,
          s6: 69,
        },
      ]);

    // Login as owner and navigate to teammate3's card
    await login(page, owner);
    await page.goto(`/g/${groupId}/cartas/${teammate3.id}`);
    await page.waitForLoadState("networkidle");

    // Verify the card is provisional
    // Should show "Provisional · faltan votos" text
    await expect(
      page.getByText("Provisional · faltan votos", { exact: false })
    ).toBeVisible();

    // Should show vote count "2 votos"
    await expect(page.getByText("2 votos", { exact: false })).toBeVisible();

    // Should show "Faltan 1 voto..." message
    await expect(
      page.getByText(/Faltan 1 voto/, { exact: false })
    ).toBeVisible();

    // OVR should show "–" (dash) for provisional card
    // The OVR appears in the first large text in the card
    const cardElement = page.locator("article").first();
    const ovrDisplay = cardElement.locator(".font-display.font-bold.tabular").first();
    await expect(ovrDisplay).toHaveText("–");

    // Now the owner rates teammate3
    const rateButton = page.getByRole("link", {
      name: /Calificá a Compañero 3/,
    });
    await expect(rateButton).toBeVisible();
    await rateButton.click();
    await page.waitForLoadState("networkidle");

    // On the rating form, move at least one slider
    // The first slider has aria-label "Ritmo"
    const ritmoSlider = page.getByLabel("Ritmo");
    await expect(ritmoSlider).toBeVisible();

    // Use keyboard to set the value to 80
    await ritmoSlider.fill("80");

    // Click "Guardar calificación" y esperar el efecto real: vuelve a la carta del compañero
    await expect(page.getByRole("button", { name: "Guardar calificación" })).toBeVisible();
    await page.getByRole("button", { name: "Guardar calificación" }).click();
    await page.waitForURL(`**/g/${groupId}/cartas/${teammate3.id}`);

    // Con la tercera calificación se muestran "3 votos" y la carta deja de ser provisional
    await expect(page.getByText("3 votos", { exact: false })).toBeVisible();
    await expect(
      page.getByText("Provisional · faltan votos", { exact: false })
    ).toHaveCount(0);

    // El OVR es un número, no "–"
    const card = page.locator("article").first();
    await expect(card.locator(".font-display.font-bold.tabular").first()).toHaveText(/^\d+$/);
  });

  test("el usuario no puede calificarse a sí mismo", async ({ page }) => {
    // Create 2 users
    const owner = await createUser("Dueño");
    const teammate = await createUser("Compañero");

    // Create a group
    const { groupId } = await createGroupWithMembers(owner, [teammate], "Equipo QA");

    // Login as owner
    await login(page, owner);

    // Try to navigate to /g/<gid>/cartas/<owner.id>/calificar
    await page.goto(`/g/${groupId}/cartas/${owner.id}/calificar`);
    await page.waitForLoadState("networkidle");

    // Should be redirected to the owner's card page (not to calificar)
    await expect(page).toHaveURL(`/g/${groupId}/cartas/${owner.id}`);

    // The card page should show "Esta es tu carta"
    await expect(
      page.getByText("Esta es tu carta", { exact: false })
    ).toBeVisible();
  });
});
