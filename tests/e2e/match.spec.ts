import { test, expect } from "@playwright/test";
import {
  createUser,
  login,
  createGroupWithMembers,
  confirmAttendance,
  getTeamAssignments,
  voteMvp,
} from "./helpers";

function localDateInDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

test.describe("Partido (e2e)", () => {
  test("crear partido, confirmar con 4, Armar parejo, cargar resultado y votar MVP", async ({
    page,
  }) => {
    // El formulario permite desde 3 contra 3: con 4 confirmados quedan 2 jugadores por equipo.
    const owner = await createUser("Lucas Dueño");
    const mati = await createUser("Mati Arquero");
    const nico = await createUser("Nico Delantero");
    const fede = await createUser("Fede Zaguero");
    const others = [mati, nico, fede];
    const everyone = [owner, ...others];

    const { groupId } = await createGroupWithMembers(
      owner,
      others,
      "Grupo del partido"
    );

    await login(page, owner);

    // Crear el partido desde la lista de partidos
    await page.goto(`/g/${groupId}/partidos`);
    await page.getByRole("link", { name: "Crear partido" }).first().click();
    await expect(page).toHaveURL(/\/partidos\/nuevo$/);
    await page.waitForLoadState("networkidle");

    await page.getByLabel("Fecha y hora").fill(`${localDateInDays(1)}T21:00`);
    await page.getByLabel("Lugar").fill("Cancha e2e");
    await page.getByLabel("Jugadores por equipo").selectOption("3");
    await page.getByRole("button", { name: "Crear partido" }).click();

    const matchUrl = new RegExp(`/g/${groupId}/partidos/([0-9a-f-]{36})$`);
    await expect(page).toHaveURL(matchUrl);
    const matchId = page.url().match(matchUrl)?.[1] ?? "";
    expect(matchId).not.toBe("");
    const matchDetailUrl = new RegExp(`/partidos/${matchId}$`);

    await expect(page.getByText("Cancha e2e")).toBeVisible();
    await expect(page.getByText("Programado", { exact: true })).toBeVisible();
    await expect(page.getByText("0/6 confirmados")).toBeVisible();

    // El dueño confirma desde la pantalla ("Voy" exacto: "No voy" también lo contiene)
    const goingButton = page.getByRole("button", { name: "Voy", exact: true });
    await goingButton.click();
    await expect(goingButton).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("1/6 confirmados")).toBeVisible();

    // Los otros tres confirman por RPC: son 4 confirmados en total
    for (const player of others) {
      await confirmAttendance(player, matchId);
    }
    await page.reload();
    await expect(page.getByText("4/6 confirmados")).toBeVisible();
    await expect(page.getByText("Confirmados (4)")).toBeVisible();
    for (const player of everyone) {
      await expect(
        page.getByText(player.displayName, { exact: true })
      ).toBeVisible();
    }

    // Armar equipos: "Armar parejo" reparte 2 y 2
    await page.getByRole("link", { name: "Armar equipos" }).click();
    await expect(page).toHaveURL(/\/equipos$/);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("0 jugadores", { exact: true })).toHaveCount(2);
    await page.getByRole("button", { name: "Armar parejo" }).click();
    await expect(page.getByText("2 jugadores", { exact: true })).toHaveCount(2);

    await page.getByRole("button", { name: "Guardar equipos" }).click();
    await expect(page).toHaveURL(matchDetailUrl);
    await expect(page.getByText("Equipo A", { exact: true })).toBeVisible();
    await expect(page.getByText("Equipo B", { exact: true })).toBeVisible();

    // Los equipos quedaron guardados: dos jugadores en cada uno
    const teams = await getTeamAssignments(owner, matchId);
    const teamA = everyone.filter((player) => teams[player.id] === "A");
    const teamB = everyone.filter((player) => teams[player.id] === "B");
    expect(teamA).toHaveLength(2);
    expect(teamB).toHaveLength(2);

    // Cargar resultado 2-1 con goles y una asistencia
    await page.getByRole("link", { name: "Cargar resultado" }).click();
    await expect(page).toHaveURL(/\/resultado$/);
    await page.waitForLoadState("networkidle");

    const [scorerA, assisterA] = teamA;
    const [scorerB] = teamB;

    await page.getByLabel("Equipo A", { exact: true }).fill("2");
    await page.getByLabel("Equipo B", { exact: true }).fill("1");
    await page
      .getByLabel(`Goles de ${scorerA.displayName}`, { exact: true })
      .fill("2");
    await page
      .getByLabel(`Asistencias de ${assisterA.displayName}`, { exact: true })
      .fill("1");
    await page
      .getByLabel(`Goles de ${scorerB.displayName}`, { exact: true })
      .fill("1");
    await page.getByRole("button", { name: "Cerrar partido" }).click();

    // El detalle muestra el partido finalizado con el resultado y los goles
    await expect(page).toHaveURL(matchDetailUrl);
    await expect(page.getByText("Finalizado", { exact: true })).toBeVisible();
    await expect(page.getByText("2 – 1", { exact: true })).toBeVisible();
    await expect(page.getByText("2 G", { exact: true })).toBeVisible();
    await expect(page.getByText("1 A", { exact: true })).toBeVisible();
    await expect(page.getByText("1 G", { exact: true })).toBeVisible();

    // Tarjeta MVP: nadie votó todavía
    const mvpCard = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByText("MVP", { exact: true }) });
    await expect(mvpCard.getByText("0 de 4 votaron")).toBeVisible();

    // El dueño no se puede votar a sí mismo: ve a sus 3 compañeros
    await expect(mvpCard.getByRole("radio")).toHaveCount(3);
    await expect(
      mvpCard.getByRole("radio", { name: owner.displayName, exact: true })
    ).toHaveCount(0);

    // Sin elegir a nadie no se puede votar
    const voteButton = mvpCard.getByRole("button", { name: "Votá" });
    await expect(voteButton).toBeDisabled();

    // Vota a un compañero
    await mvpCard
      .getByRole("radio", { name: mati.displayName, exact: true })
      .check();
    await expect(voteButton).toBeEnabled();
    await voteButton.click();

    await expect(mvpCard.getByText("Ya votaste.")).toBeVisible();
    await expect(mvpCard.getByText("1 de 4 votaron")).toBeVisible();
    await expect(mvpCard.getByRole("radio")).toHaveCount(0);
    await expect(voteButton).toHaveCount(0);

    // La votación sigue abierta: ni el voto ni el nombre aparecen como MVP
    await expect(mvpCard).not.toContainText(mati.displayName);
    await expect(page.getByText(/MVP:/)).toHaveCount(0);

    // Votan dos más por RPC: 3 de 4, todavía abierta, sin MVP a la vista
    await voteMvp(nico, matchId, mati.id);
    await voteMvp(fede, matchId, mati.id);
    await page.reload();
    await expect(mvpCard.getByText("Ya votaste.")).toBeVisible();
    await expect(mvpCard.getByText("3 de 4 votaron")).toBeVisible();
    await expect(page.getByText(/MVP:/)).toHaveCount(0);
    await expect(mvpCard).not.toContainText(mati.displayName);

    // Vota el último y la votación cierra: Mati es el MVP
    await voteMvp(mati, matchId, nico.id);
    await page.reload();
    await expect(
      mvpCard.getByText(`MVP: ${mati.displayName}`, { exact: true })
    ).toBeVisible();
    await expect(mvpCard.getByText(/votaron/)).toHaveCount(0);
    await expect(mvpCard.getByRole("radio")).toHaveCount(0);
    await expect(mvpCard.getByRole("button", { name: "Votá" })).toHaveCount(0);
  });
});
