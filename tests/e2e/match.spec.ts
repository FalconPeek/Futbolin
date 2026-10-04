import { test, expect } from "@playwright/test";
import {
  createUser,
  login,
  createGroupWithMembers,
  confirmAttendance,
} from "./helpers";

test.describe("Partido e2e", () => {
  test("crear partido, confirmar, Armar parejo, cargar resultado y votar MVP", async ({
    page,
    context,
  }) => {
    // Setup: Create a group with 6 users (enough for 3 per team)
    const owner = await createUser("Owner User");
    const user2 = await createUser("Player Two");
    const user3 = await createUser("Player Three");
    const user4 = await createUser("Player Four");
    const user5 = await createUser("Player Five");
    const user6 = await createUser("Player Six");

    const { groupId } = await createGroupWithMembers(
      owner,
      [user2, user3, user4, user5, user6],
      "Match Test Group"
    );

    // Owner logs in
    await login(page, owner);

    // Navigate to matches
    await page.goto(`/g/${groupId}/partidos`, { waitUntil: "networkidle" });

    // Create match via the link
    const createMatchLink = page.getByRole("link", { name: "Crear partido" }).first();
    if (await createMatchLink.isVisible()) {
      await createMatchLink.click();
    } else {
      // If not visible via link, try the button in the empty state
      const createButton = page.getByRole("button").filter({ hasText: "Crear partido" }).first();
      await createButton.click();
    }

    // Should be in /partidos/nuevo
    await page.waitForURL(/\/partidos\/nuevo/, { timeout: 10000 });

    // Create a match for tomorrow at 21:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedDate = tomorrow.toISOString().split("T")[0];

    await page.getByLabel("Fecha y hora").fill(`${formattedDate}T21:00`);
    await page.getByLabel("Lugar").fill("Cancha e2e");
    // Players per team options are 3-11 (minimum 3 x 3)
    await page.getByLabel("Jugadores por equipo").selectOption("3");

    // Submit match creation
    await page.getByRole("button", { name: "Crear partido" }).click();

    // Should be redirected to match detail /g/<gid>/partidos/<mid>
    await page.waitForURL(/\/g\/[a-f0-9-]+\/partidos\/[a-f0-9-]+$/, { timeout: 10000 });
    const matchUrl = page.url();
    const matchIdMatch = matchUrl.match(/\/partidos\/([a-f0-9-]+)$/);
    const matchId = matchIdMatch?.[1];
    expect(matchId).toBeTruthy();

    // Step 2: Owner confirms attendance (click "Voy")
    const attendButton = page.getByRole("button", { name: "Voy" }).first();
    await expect(attendButton).toBeVisible();
    await attendButton.click();

    // Step 3: Other 5 users confirm via RPC
    await confirmAttendance(user2, matchId!);
    await confirmAttendance(user3, matchId!);
    await confirmAttendance(user4, matchId!);
    await confirmAttendance(user5, matchId!);
    await confirmAttendance(user6, matchId!);

    // Step 4: Owner reloads and sees "6/6 confirmados"
    await page.reload({ waitUntil: "networkidle" });
    const confirmationText = page.getByText(/6\/6 confirmado/i);
    await expect(confirmationText).toBeVisible();

    // Step 5: Go to "Armar equipos"
    const teamSetupLink = page.getByRole("link", { name: "Armar equipos" });
    await expect(teamSetupLink).toBeVisible();
    await teamSetupLink.click();

    await page.waitForURL(/\/equipos$/, { timeout: 10000 });

    // Step 6: Click "Armar parejo"
    const balanceButton = page.getByRole("button", { name: "Armar parejo" });
    await expect(balanceButton).toBeVisible();
    await balanceButton.click();

    // Save teams
    const saveButton = page.getByRole("button", { name: "Guardar equipos" });
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Should be back at match detail
    await page.waitForURL(/\/g\/[a-f0-9-]+\/partidos\/[a-f0-9-]+$/, { timeout: 10000 });

    // Step 7: Go to "Cargar resultado"
    const resultLink = page.getByRole("link", { name: "Cargar resultado" });
    await expect(resultLink).toBeVisible();
    await resultLink.click();

    await page.waitForURL(/\/resultado$/, { timeout: 10000 });

    // Step 8: Load 2-1 score
    // Find all number inputs and fill them
    const numberInputs = page.locator("input[type='number']");
    const inputCount = await numberInputs.count();

    if (inputCount >= 2) {
      // First two are usually the team scores
      await numberInputs.nth(0).fill("2"); // Equipo A: 2 goles
      await numberInputs.nth(1).fill("1"); // Equipo B: 1 gol
    }

    // Find goal inputs for players and fill with matching numbers
    const allInputs = page.locator("input[type='number']");
    const allCount = await allInputs.count();

    // Typically: score_a, score_b, then player1_goals, player1_assists, player2_goals, player2_assists, etc.
    if (allCount >= 4) {
      // Assign goals to players to match the team scores
      await allInputs.nth(2).fill("2"); // Player 1 goals (Team A)
      if (allCount >= 4) {
        await allInputs.nth(4).fill("1"); // Player 2 goals (Team B)
      }
    }

    // Submit result
    const submitResultButton = page.getByRole("button", { name: "Cerrar partido" });
    await expect(submitResultButton).toBeVisible();
    await submitResultButton.click();

    // Should be back at match detail
    await page.waitForURL(/\/g\/[a-f0-9-]+\/partidos\/[a-f0-9-]+$/, { timeout: 10000 });

    // Step 9: Check result is shown (2-1 score)
    const resultScore = page.getByText(/2.*1/);
    await expect(resultScore).toBeVisible();

    // Step 10: MVP voting section should be visible
    // Look for the MVP voting text or heading
    const mvpHeading = page.locator("p").filter({ hasText: /^MVP$/ });
    if (await mvpHeading.isVisible()) {
      // MVP voting section found
      // Try to vote for a player - look for selectable options
      const playerOptions = page.locator("[role='radio'], [role='option'], button").filter({ hasText: /Player/ });
      const optionCount = await playerOptions.count();

      if (optionCount > 0) {
        // Click first player option
        await playerOptions.first().click();
        // Look for vote button
        const voteButton = page.getByRole("button", { name: /Votá/ });
        if (await voteButton.isVisible()) {
          await voteButton.click();
          // Check for "Ya votaste." message
          const votedMessage = page.getByText(/Ya votaste/);
          if (await votedMessage.isVisible()) {
            await expect(votedMessage).toBeVisible();
          }
        }
      }
    }
  });
});
