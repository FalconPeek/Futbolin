import { test, expect, type Page } from "@playwright/test";
import {
  createUser,
  login,
  createGroupWithMembers,
  type TestUser,
} from "./helpers";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

interface TeamSpec {
  name: string;
  color: string;
}

interface MatchRow {
  id: string;
  round: number;
  slot: number;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  home_pens: number | null;
  away_pens: number | null;
  status: "pendiente" | "jugado";
}

interface ScoredMatch {
  match: MatchRow;
  homeName: string;
  awayName: string;
  home: number;
  away: number;
}

// ---------------------------------------------------------------------------
// Lectura de la base con el cliente del dueño (RLS: es miembro del grupo).
// ---------------------------------------------------------------------------

async function fetchTournamentStatus(owner: TestUser, tournamentId: string): Promise<string | null> {
  const { data, error } = await owner.client
    .from("tournaments")
    .select("status")
    .eq("id", tournamentId)
    .single();
  if (error) throw new Error(`No pude leer el torneo: ${error.message}`);
  return data.status;
}

async function fetchMatches(owner: TestUser, tournamentId: string): Promise<MatchRow[]> {
  const { data, error } = await owner.client
    .from("tournament_matches")
    .select(
      "id, round, slot, home_team_id, away_team_id, home_score, away_score, home_pens, away_pens, status"
    )
    .eq("tournament_id", tournamentId)
    .order("round")
    .order("slot");
  if (error) throw new Error(`No pude leer los partidos: ${error.message}`);
  return data;
}

async function fetchMatch(owner: TestUser, matchId: string): Promise<MatchRow> {
  const { data, error } = await owner.client
    .from("tournament_matches")
    .select(
      "id, round, slot, home_team_id, away_team_id, home_score, away_score, home_pens, away_pens, status"
    )
    .eq("id", matchId)
    .single();
  if (error) throw new Error(`No pude leer el partido: ${error.message}`);
  return data;
}

async function fetchTeamNames(owner: TestUser, tournamentId: string): Promise<Map<string, string>> {
  const { data, error } = await owner.client
    .from("tournament_teams")
    .select("id, name")
    .eq("tournament_id", tournamentId);
  if (error) throw new Error(`No pude leer los equipos: ${error.message}`);
  return new Map(data.map((team) => [team.id, team.name]));
}

function teamName(names: Map<string, string>, teamId: string | null): string {
  if (teamId === null) throw new Error("El partido no tiene los dos equipos definidos");
  const name = names.get(teamId);
  if (name === undefined) throw new Error(`Equipo desconocido: ${teamId}`);
  return name;
}

async function reportViaRpc(owner: TestUser, matchId: string, home: number, away: number): Promise<void> {
  const { error } = await owner.client.rpc("report_tournament_result", {
    p_match_id: matchId,
    p_home: home,
    p_away: away,
  });
  if (error) throw new Error(`No pude cargar el resultado por RPC: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Pasos de UI. Cada acción espera su efecto real (URL, lista, base), nunca
// "networkidle": ese estado solo se usa tras cargar una página, para asegurar que
// hidrató antes de interactuar con ella.
// ---------------------------------------------------------------------------

async function createTournamentViaUi(
  page: Page,
  groupId: string,
  name: string,
  format: "liga" | "eliminacion"
): Promise<string> {
  await page.goto(`/g/${groupId}/torneos`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: "Crear torneo" }).first().click();
  await page.waitForURL(new RegExp(`/g/${groupId}/torneos/nuevo$`));
  await page.waitForLoadState("networkidle");

  const nameInput = page.getByLabel("Nombre", { exact: true });
  await nameInput.fill(name);
  await expect(nameInput).toHaveValue(name);

  const ligaRadio = page.getByRole("radio", { name: /^Liga/ });
  const eliminacionRadio = page.getByRole("radio", { name: /^Eliminación directa/ });
  if (format === "liga") {
    await expect(ligaRadio).toBeChecked();
    await expect(page.getByText("Ida y vuelta")).toBeVisible();
  } else {
    await eliminacionRadio.check();
    await expect(eliminacionRadio).toBeChecked();
    await expect(page.getByText("Ida y vuelta")).toHaveCount(0);
  }

  await page.getByRole("button", { name: "Crear torneo" }).click();
  await page.waitForURL(new RegExp(`/g/${groupId}/torneos/${UUID}/equipos$`));

  const match = page.url().match(new RegExp(`/torneos/(${UUID})/equipos$`));
  if (!match) throw new Error(`No pude sacar el id del torneo de ${page.url()}`);
  const tournamentId = match[1];

  await page.waitForLoadState("networkidle");
  return tournamentId;
}

async function addTeamViaUi(page: Page, team: TeamSpec, expectedCount: number): Promise<void> {
  const nameInput = page.getByLabel("Nombre del equipo", { exact: true });
  await nameInput.fill(team.name);
  await expect(nameInput).toHaveValue(team.name);

  const colorRadio = page.getByRole("radio", { name: team.color, exact: true });
  await colorRadio.click();
  await expect(colorRadio).toBeChecked();

  await page.getByRole("button", { name: "Agregar equipo" }).click();

  // Efecto real: el servidor revalidó la lista y el formulario se limpió.
  await expect(page.getByRole("heading", { name: `Equipos (${expectedCount})` })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: team.name })).toHaveCount(1);
  await expect(nameInput).toHaveValue("");
}

async function startTournamentViaUi(
  page: Page,
  owner: TestUser,
  groupId: string,
  tournamentId: string,
  expectedMatches: number
): Promise<void> {
  const startButton = page.getByRole("button", { name: "Empezar torneo" });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  // La acción termina de armar el fixture recién cuando la URL sale de /equipos.
  await page.waitForURL(new RegExp(`/g/${groupId}/torneos/${tournamentId}$`));

  await expect
    .poll(async () => fetchTournamentStatus(owner, tournamentId))
    .toBe("en_curso");
  await expect
    .poll(async () => (await fetchMatches(owner, tournamentId)).length)
    .toBe(expectedMatches);
}

async function openResultFormAndWait(page: Page, groupId: string, tournamentId: string, matchId: string): Promise<void> {
  await page.waitForURL(new RegExp(`/g/${groupId}/torneos/${tournamentId}/partidos/${matchId}$`));
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", { name: "Guardar resultado" })).toBeEnabled();
}

async function fillScore(page: Page, teamLabel: string, goals: number): Promise<void> {
  const input = page.getByLabel(`Goles de ${teamLabel}`, { exact: true });
  await input.fill(String(goals));
  await expect(input).toHaveValue(String(goals));
}

async function saveResultAndWaitForTournament(
  page: Page,
  groupId: string,
  tournamentId: string
): Promise<void> {
  await page.getByRole("button", { name: "Guardar resultado" }).click();
  await expect(page.getByText("Guardamos el resultado.")).toBeVisible();
  await page.waitForURL(new RegExp(`/g/${groupId}/torneos/${tournamentId}$`));
}

async function expectMatchPlayed(
  owner: TestUser,
  matchId: string,
  expected: { home: number; away: number; homePens?: number; awayPens?: number }
): Promise<void> {
  await expect
    .poll(async () => {
      const row = await fetchMatch(owner, matchId);
      return [row.status, row.home_score, row.away_score, row.home_pens, row.away_pens];
    })
    .toEqual([
      "jugado",
      expected.home,
      expected.away,
      expected.homePens ?? null,
      expected.awayPens ?? null,
    ]);
}

// ---------------------------------------------------------------------------

test.describe("Torneos", () => {
  test("liga de 4 equipos: empezar, cargar resultados, tabla y campeón", async ({ page }) => {
    const owner = await createUser("Dueño");
    const member = await createUser("Miembro");
    const { groupId } = await createGroupWithMembers(owner, [member], "Grupo Liga");

    // De más fuerte a más débil: el más fuerte le gana a todos, y así sucesivamente.
    // Con esto la tabla no tiene empates en puntos (9, 6, 3 y 0) sin importar el
    // orden al azar en que la app arme el fixture.
    const teams: TeamSpec[] = [
      { name: "Los Rojos", color: "Rojo" },
      { name: "Los Azules", color: "Azul" },
      { name: "Los Verdes", color: "Verde" },
      { name: "Los Amarillos", color: "Amarillo" },
    ];
    const ranking = teams.map((team) => team.name);

    await login(page, owner);
    const tournamentId = await createTournamentViaUi(page, groupId, "Copa Liga QA", "liga");

    for (const [index, team] of teams.entries()) {
      await addTeamViaUi(page, team, index + 1);
    }
    await expect(page.getByRole("heading", { name: "Equipos (4)" })).toBeVisible();

    await startTournamentViaUi(page, owner, groupId, tournamentId, 6);

    // Fixture armado en la base: 4 equipos, una vuelta = 6 partidos en 3 fechas de 2.
    const names = await fetchTeamNames(owner, tournamentId);
    expect([...names.values()].sort()).toEqual([...ranking].sort());
    const matches = await fetchMatches(owner, tournamentId);
    expect(matches.map((m) => m.round)).toEqual([1, 1, 2, 2, 3, 3]);
    expect(matches.every((m) => m.status === "pendiente")).toBe(true);
    const pairs = new Set(
      matches.map((m) => [teamName(names, m.home_team_id), teamName(names, m.away_team_id)].sort().join("|"))
    );
    expect(pairs.size).toBe(6);

    // El más fuerte gana por la diferencia de posiciones: 2, 3 o 4 goles a 0.
    const scored: ScoredMatch[] = matches.map((match) => {
      const homeName = teamName(names, match.home_team_id);
      const awayName = teamName(names, match.away_team_id);
      const homeRank = ranking.indexOf(homeName);
      const awayRank = ranking.indexOf(awayName);
      const winnerGoals = 1 + Math.abs(homeRank - awayRank);
      return homeRank < awayRank
        ? { match, homeName, awayName, home: winnerGoals, away: 0 }
        : { match, homeName, awayName, home: 0, away: winnerGoals };
    });

    // Fixture en la UI: primer partido cargado desde el formulario.
    await expect(page.getByRole("tab", { name: "Tabla" })).toBeVisible();
    await page.getByRole("tab", { name: "Fixture" }).click();
    await expect(page.getByRole("region", { name: "Fecha 1", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Fecha 3", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cargar resultado" })).toHaveCount(6);

    const [first, ...rest] = scored;
    await page.getByRole("link", { name: "Cargar resultado" }).first().click();
    await openResultFormAndWait(page, groupId, tournamentId, first.match.id);
    await fillScore(page, first.homeName, first.home);
    await fillScore(page, first.awayName, first.away);
    await saveResultAndWaitForTournament(page, groupId, tournamentId);
    await expectMatchPlayed(owner, first.match.id, { home: first.home, away: first.away });

    // En liga con un solo resultado el torneo sigue en curso.
    expect(await fetchTournamentStatus(owner, tournamentId)).toBe("en_curso");

    // Los otros 5 resultados por RPC, como organizador.
    for (const item of rest) {
      await reportViaRpc(owner, item.match.id, item.home, item.away);
    }

    // Recién cuando la base cierra el torneo se navega a verificar la tabla y el campeón.
    await expect
      .poll(async () => fetchTournamentStatus(owner, tournamentId))
      .toBe("finalizado");

    // Tabla esperada, calculada a partir de los resultados que cargamos.
    const stats = new Map(
      ranking.map((name) => [name, { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 }])
    );
    for (const { homeName, awayName, home, away } of scored) {
      const h = stats.get(homeName);
      const a = stats.get(awayName);
      if (!h || !a) throw new Error("Equipo fuera del ranking");
      h.pj += 1;
      a.pj += 1;
      h.gf += home;
      h.gc += away;
      a.gf += away;
      a.gc += home;
      if (home > away) {
        h.g += 1;
        h.pts += 3;
        a.p += 1;
      } else if (away > home) {
        a.g += 1;
        a.pts += 3;
        h.p += 1;
      } else {
        h.e += 1;
        a.e += 1;
        h.pts += 1;
        a.pts += 1;
      }
    }
    // Con estos resultados el orden de la tabla es el del ranking.
    const expectedRows = ranking.map((name, index) => {
      const s = stats.get(name);
      if (!s) throw new Error("Equipo fuera del ranking");
      const dg = s.gf - s.gc;
      return {
        name,
        cells: [
          String(index + 1),
          String(s.pj),
          String(s.g),
          String(s.e),
          String(s.p),
          String(s.gf),
          String(s.gc),
          dg > 0 ? `+${dg}` : String(dg),
          String(s.pts),
        ],
      };
    });
    expect(expectedRows.map((row) => row.cells[8])).toEqual(["9", "6", "3", "0"]);

    await page.goto(`/g/${groupId}/torneos/${tournamentId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(`Campeón: ${ranking[0]}`)).toBeVisible();
    await expect(page.getByRole("tab", { name: "Tabla" })).toHaveAttribute("aria-selected", "true");

    const rows = page.getByRole("table").locator("tbody tr");
    await expect(rows).toHaveCount(4);
    for (const [index, expected] of expectedRows.entries()) {
      const row = rows.nth(index);
      await expect(row.getByRole("rowheader")).toHaveText(expected.name);
      // Las 9 primeras celdas son #, PJ, G, E, P, GF, GC, DG y Pts (después viene la forma).
      const cells = (await row.getByRole("cell").allInnerTexts()).slice(0, 9);
      expect(cells, `fila ${index + 1} (${expected.name})`).toEqual(expected.cells);
    }

    // Terminado: ya no se ofrece cargar resultados y el fixture muestra los 6 marcadores.
    await page.getByRole("tab", { name: "Fixture" }).click();
    await expect(page.getByRole("region", { name: "Fecha 1", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cargar resultado" })).toHaveCount(0);
    await expect(page.getByText(/^\d – \d$/)).toHaveCount(6);
  });

  test("eliminación de 3 equipos: bye en la final, empate con penales, campeón", async ({ page }) => {
    const owner = await createUser("Dueño");
    const member = await createUser("Miembro");
    const { groupId } = await createGroupWithMembers(owner, [member], "Grupo Llave");

    const teams: TeamSpec[] = [
      { name: "Los Tigres", color: "Naranja" },
      { name: "Los Leones", color: "Amarillo" },
      { name: "Los Lobos", color: "Negro" },
    ];

    await login(page, owner);
    const tournamentId = await createTournamentViaUi(page, groupId, "Copa Llave QA", "eliminacion");

    for (const [index, team] of teams.entries()) {
      await addTeamViaUi(page, team, index + 1);
    }

    // Al empezar la acción mezcla los equipos y arma la llave: semifinal + final con bye.
    await startTournamentViaUi(page, owner, groupId, tournamentId, 2);

    const names = await fetchTeamNames(owner, tournamentId);
    const matches = await fetchMatches(owner, tournamentId);
    expect(matches).toHaveLength(2);
    const semifinal = matches.find((m) => m.round === 1);
    const finalMatch = matches.find((m) => m.round === 2);
    if (!semifinal || !finalMatch) throw new Error("Faltan la semifinal o la final en la base");

    // Semifinal: dos equipos reales, pendiente. Final: un equipo con bye y el otro lugar vacío.
    expect(semifinal.home_team_id).not.toBeNull();
    expect(semifinal.away_team_id).not.toBeNull();
    expect(semifinal.status).toBe("pendiente");
    expect(finalMatch.home_team_id).not.toBeNull();
    expect(finalMatch.away_team_id).toBeNull();
    expect(finalMatch.status).toBe("pendiente");
    expect([semifinal.home_team_id, semifinal.away_team_id]).not.toContain(finalMatch.home_team_id);

    const byeName = teamName(names, finalMatch.home_team_id);
    const homeName = teamName(names, semifinal.home_team_id);
    const awayName = teamName(names, semifinal.away_team_id);

    // La llave en la UI: el bye ya figura en la final contra "A definir".
    const semifinalRegion = page.getByRole("region", { name: "Semifinal", exact: true });
    const finalRegion = page.getByRole("region", { name: "Final", exact: true });
    await expect(semifinalRegion).toBeVisible();
    await expect(finalRegion).toBeVisible();
    await expect(semifinalRegion).toContainText(homeName);
    await expect(semifinalRegion).toContainText(awayName);
    await expect(finalRegion).toContainText(byeName);
    await expect(finalRegion).toContainText("A definir");
    await expect(semifinalRegion.getByRole("link", { name: "Cargar resultado" })).toHaveCount(1);
    await expect(finalRegion.getByRole("link", { name: "Cargar resultado" })).toHaveCount(0);

    // Semifinal 2-2: sin penales no deja guardar y con penales iguales tampoco.
    await semifinalRegion.getByRole("link", { name: "Cargar resultado" }).click();
    await openResultFormAndWait(page, groupId, tournamentId, semifinal.id);
    await fillScore(page, homeName, 2);
    await fillScore(page, awayName, 2);

    const homePens = page.getByLabel(`Penales de ${homeName}`, { exact: true });
    const awayPens = page.getByLabel(`Penales de ${awayName}`, { exact: true });
    await expect(homePens).toBeVisible();
    await expect(awayPens).toBeVisible();

    const pensRequired = page.getByText("En eliminación directa no hay empate: cargá los penales.");
    await page.getByRole("button", { name: "Guardar resultado" }).click();
    await expect(pensRequired).toBeVisible();

    await homePens.fill("3");
    await awayPens.fill("3");
    await page.getByRole("button", { name: "Guardar resultado" }).click();
    await expect(pensRequired).toBeVisible();
    expect((await fetchMatch(owner, semifinal.id)).status).toBe("pendiente");

    // Gana el local por penales 4-3.
    await homePens.fill("4");
    await expect(homePens).toHaveValue("4");
    await saveResultAndWaitForTournament(page, groupId, tournamentId);
    await expectMatchPlayed(owner, semifinal.id, { home: 2, away: 2, homePens: 4, awayPens: 3 });

    // El ganador por penales avanzó a la final, del lado visitante (slot 1 de la ronda 1).
    await expect
      .poll(async () => (await fetchMatch(owner, finalMatch.id)).away_team_id)
      .toBe(semifinal.home_team_id);

    // Llave actualizada: marcador con penales y la final lista para jugarse.
    await expect(semifinalRegion).toContainText("2(4)");
    await expect(semifinalRegion).toContainText("2(3)");
    await expect(finalRegion).toContainText(byeName);
    await expect(finalRegion).toContainText(homeName);
    await expect(finalRegion).not.toContainText("A definir");

    // Final 0-1: gana el que llegó por penales.
    await finalRegion.getByRole("link", { name: "Cargar resultado" }).click();
    await openResultFormAndWait(page, groupId, tournamentId, finalMatch.id);
    await fillScore(page, byeName, 0);
    await fillScore(page, homeName, 1);
    await expect(page.getByLabel(`Penales de ${byeName}`, { exact: true })).toHaveCount(0);
    await saveResultAndWaitForTournament(page, groupId, tournamentId);
    await expectMatchPlayed(owner, finalMatch.id, { home: 0, away: 1 });

    // Con la final jugada la base cierra el torneo; recién ahí se verifica el campeón.
    await expect
      .poll(async () => fetchTournamentStatus(owner, tournamentId))
      .toBe("finalizado");

    await page.goto(`/g/${groupId}/torneos/${tournamentId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(`Campeón: ${homeName}`)).toBeVisible();
    await expect(semifinalRegion).toBeVisible();
    await expect(finalRegion).toBeVisible();
    await expect(page.getByRole("link", { name: "Cargar resultado" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Corregir" })).toHaveCount(0);
  });

  test("eliminación: un 0-0 también pide penales", async ({ page }) => {
    // HALLAZGO (app): TournamentResultForm calcula `isTie = homeScore === awayScore && homeScore > 0`,
    // así que con 0-0 en eliminación no muestra los campos de penales, pero tournamentResultSchema
    // (y la RPC) sí los exigen: el organizador queda con el error "cargá los penales" sin dónde cargarlos.
    test.fail(true, "Hallazgo T45: el 0-0 en eliminación no muestra los campos de penales");

    const owner = await createUser("Dueño");
    const member = await createUser("Miembro");
    const { groupId } = await createGroupWithMembers(owner, [member], "Grupo Cero a Cero");

    // Torneo de 2 equipos con una sola final, armado por la base para ir directo al formulario.
    const { data: tournament, error: tournamentError } = await owner.client
      .from("tournaments")
      .insert({ group_id: groupId, name: "Llave 0-0", format: "eliminacion", legs: 1 })
      .select("id")
      .single();
    if (tournamentError) throw new Error(`No pude crear el torneo: ${tournamentError.message}`);

    const { data: createdTeams, error: teamsError } = await owner.client
      .from("tournament_teams")
      .insert([
        { tournament_id: tournament.id, name: "Local FC", color: "#e53935" },
        { tournament_id: tournament.id, name: "Visitante FC", color: "#1e88e5" },
      ])
      .select("id, name");
    if (teamsError) throw new Error(`No pude crear los equipos: ${teamsError.message}`);
    const local = createdTeams.find((team) => team.name === "Local FC");
    const visitante = createdTeams.find((team) => team.name === "Visitante FC");
    if (!local || !visitante) throw new Error("Faltan equipos");

    const { error: startError } = await owner.client.rpc("start_tournament", {
      p_tournament_id: tournament.id,
      p_fixtures: [{ round: 1, slot: 0, home_team_id: local.id, away_team_id: visitante.id }],
    });
    if (startError) throw new Error(`No pude empezar el torneo: ${startError.message}`);

    const [finalMatch] = await fetchMatches(owner, tournament.id);
    await login(page, owner);
    await page.goto(`/g/${groupId}/torneos/${tournament.id}/partidos/${finalMatch.id}`);
    await page.waitForLoadState("networkidle");

    await fillScore(page, "Local FC", 0);
    await fillScore(page, "Visitante FC", 0);
    await expect(page.getByLabel("Penales de Local FC", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Penales de Visitante FC", { exact: true })).toBeVisible();
  });

  test("miembro no organizador no ve links de cargar resultado", async ({ page, browser }) => {
    const owner = await createUser("Dueño");
    const member = await createUser("Miembro");
    const { groupId } = await createGroupWithMembers(owner, [member], "Grupo Permisos");

    await login(page, owner);
    const tournamentId = await createTournamentViaUi(page, groupId, "Torneo Permisos", "liga");

    const teams: TeamSpec[] = [
      { name: "Equipo 1", color: "Rojo" },
      { name: "Equipo 2", color: "Azul" },
    ];
    for (const [index, team] of teams.entries()) {
      await addTeamViaUi(page, team, index + 1);
    }
    await startTournamentViaUi(page, owner, groupId, tournamentId, 1);

    // El organizador sí ve el link.
    await page.getByRole("tab", { name: "Fixture" }).click();
    await expect(page.getByRole("link", { name: "Cargar resultado" })).toHaveCount(1);

    // El miembro, con su propia sesión, ve el fixture pero sin links para cargar.
    const memberContext = await browser.newContext();
    try {
      const memberPage = await memberContext.newPage();
      await login(memberPage, member);

      await memberPage.goto(`/g/${groupId}/torneos/${tournamentId}`);
      await memberPage.waitForLoadState("networkidle");
      await memberPage.getByRole("tab", { name: "Fixture" }).click();
      await expect(memberPage.getByRole("region", { name: "Fecha 1", exact: true })).toBeVisible();
      await expect(memberPage.getByText("Equipo 1").first()).toBeVisible();
      await expect(memberPage.getByRole("link", { name: "Cargar resultado" })).toHaveCount(0);
      await expect(memberPage.getByRole("link", { name: "Corregir" })).toHaveCount(0);

      // Y si entra directo a la URL del formulario, vuelve al torneo.
      const matches = await fetchMatches(owner, tournamentId);
      await memberPage.goto(`/g/${groupId}/torneos/${tournamentId}/partidos/${matches[0].id}`);
      await memberPage.waitForURL(new RegExp(`/g/${groupId}/torneos/${tournamentId}$`));
      await expect(memberPage.getByRole("button", { name: "Guardar resultado" })).toHaveCount(0);
    } finally {
      await memberContext.close();
    }
  });
});
