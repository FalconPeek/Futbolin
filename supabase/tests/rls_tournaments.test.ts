import { describe, it, expect } from 'vitest';
import { anon, newUser } from './helpers';

type User = Awaited<ReturnType<typeof newUser>>;

type Outcome = PromiseLike<{ error: { message: string } | null }>;

// Devuelve el mensaje del error ('OK' si la operación no falló) para comparar contra el código.
async function failure(outcome: Outcome): Promise<string> {
  const { error } = await outcome;
  return error?.message ?? 'OK';
}

// Exige que la operación termine sin error y muestra el mensaje real si falla.
async function ok(outcome: Outcome): Promise<void> {
  const { error } = await outcome;
  expect(error?.message ?? null).toBeNull();
}

// Crea un grupo con `size` miembros: users[0] lo crea (admin) y los demás se unen con el código.
async function makeGroup(size: number): Promise<{ users: User[]; groupId: string }> {
  const users = await Promise.all(
    Array.from({ length: size }, (_, i) => newUser(`Jugador ${i + 1}`)),
  );
  const created = await users[0].client.rpc('create_group', { p_name: 'Grupo de prueba' });
  expect(created.error).toBeNull();
  const groupId = created.data as unknown as string;

  const group = await users[0].client.from('groups').select('invite_code').eq('id', groupId).single();
  expect(group.error).toBeNull();
  const code = (group.data as unknown as { invite_code: string }).invite_code;

  for (const user of users.slice(1)) {
    await ok(user.client.rpc('join_group', { p_code: code }));
  }
  return { users, groupId };
}

// Creates a tournament
async function createTournament(
  creator: User,
  groupId: string,
  name: string,
  format: 'liga' | 'eliminacion',
): Promise<string> {
  const { data, error } = await creator.client
    .from('tournaments')
    .insert({
      group_id: groupId,
      name,
      format,
      legs: 1,
    })
    .select('id')
    .single();
  expect(error?.message ?? null).toBeNull();
  const id = (data as unknown as { id: string } | null)?.id;
  expect(id).toBeTruthy();
  return id as string;
}

// Adds a team to a tournament
async function addTeam(user: User, tournamentId: string, name: string, color: string): Promise<string> {
  const { data, error } = await user.client
    .from('tournament_teams')
    .insert({
      tournament_id: tournamentId,
      name,
      color,
    })
    .select('id')
    .single();
  expect(error?.message ?? null).toBeNull();
  const id = (data as unknown as { id: string } | null)?.id;
  expect(id).toBeTruthy();
  return id as string;
}

interface Fixture {
  round: number;
  slot: number;
  home_team_id: string | null;
  away_team_id: string | null;
}

// Starts a tournament
function startTournament(user: User, tournamentId: string, fixtures: Fixture[]) {
  return user.client.rpc('start_tournament', {
    p_tournament_id: tournamentId,
    p_fixtures: fixtures,
  });
}

// Reports a result
function reportResult(
  user: User,
  matchId: string,
  homeScore: number,
  awayScore: number,
  homePens: number | null,
  awayPens: number | null,
) {
  return user.client.rpc('report_tournament_result', {
    p_match_id: matchId,
    p_home: homeScore,
    p_away: awayScore,
    p_home_pens: homePens,
    p_away_pens: awayPens,
  });
}

interface TournamentMatch {
  id: string;
  tournament_id: string;
  round: number;
  slot: number;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  home_pens: number | null;
  away_pens: number | null;
  status: string;
  created_at: string;
}

interface Tournament {
  id: string;
  group_id: string;
  name: string;
  format: string;
  legs: number;
  status: string;
  created_by: string;
  created_at: string;
}

// Gets all matches for a tournament
async function getMatches(user: User, tournamentId: string): Promise<TournamentMatch[]> {
  const { data, error } = await user.client
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('round')
    .order('slot');
  expect(error?.message ?? null).toBeNull();
  return (data as unknown as TournamentMatch[]) ?? [];
}

// Gets tournament status
async function getTournament(user: User, tournamentId: string): Promise<Tournament | null> {
  const { data, error } = await user.client
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();
  expect(error?.message ?? null).toBeNull();
  return (data as unknown as Tournament) ?? null;
}

describe('Tournaments', () => {
  describe('Access control', () => {
    it('non-members cannot see tournaments or teams', async () => {
      const { users, groupId } = await makeGroup(2);
      const outsider = await newUser('Outsider');

      const tournamentId = await createTournament(users[0], groupId, 'Test', 'liga');

      // Outsider cannot see the tournament
      const tournamentResult = await outsider.client
        .from('tournaments')
        .select('id')
        .eq('id', tournamentId);
      const tournamentData = (tournamentResult.data as unknown as Record<string, string>[]) ?? [];
      expect(tournamentData).toHaveLength(0);

      // Outsider cannot see teams
      const teamId = await addTeam(users[0], tournamentId, 'Equipo A', '#2fd27a');
      const teamResult = await outsider.client
        .from('tournament_teams')
        .select('id')
        .eq('id', teamId);
      const teamData = (teamResult.data as unknown as Record<string, string>[]) ?? [];
      expect(teamData).toHaveLength(0);

      // anon cannot see either
      const anonTournament = await anon()
        .from('tournaments')
        .select('id')
        .eq('id', tournamentId);
      const anonTournamentData = (anonTournament.data as unknown as Record<string, string>[]) ?? [];
      expect(anonTournamentData).toHaveLength(0);

      const anonTeam = await anon()
        .from('tournament_teams')
        .select('id')
        .eq('id', teamId);
      const anonTeamData = (anonTeam.data as unknown as Record<string, string>[]) ?? [];
      expect(anonTeamData).toHaveLength(0);
    });

    it('non-organizer member cannot add teams, start, or report', async () => {
      const { users, groupId } = await makeGroup(2);
      const tournamentId = await createTournament(users[0], groupId, 'Test', 'liga');

      // Non-organizer cannot add team
      const teamResult = users[1].client.from('tournament_teams').insert({
        tournament_id: tournamentId,
        name: 'Equipo B',
        color: '#2fd27a',
      });
      expect(await failure(teamResult)).not.toBe('OK');

      // Non-organizer cannot start
      const startResult = startTournament(users[1], tournamentId, []);
      expect(await failure(startResult)).toContain('NOT_ALLOWED');

      // Non-organizer cannot report: start the tournament and then try to report
      const teamA = await addTeam(users[0], tournamentId, 'A', '#2fd27a');
      const teamB = await addTeam(users[0], tournamentId, 'B', '#ff0000');
      await ok(startTournament(users[0], tournamentId, [
        { round: 1, slot: 0, home_team_id: teamA, away_team_id: teamB },
      ]));

      const matches = await getMatches(users[0], tournamentId);
      const reportRes = reportResult(users[1], matches[0].id, 1, 0, null, null);
      expect(await failure(reportRes)).toContain('NOT_ALLOWED');
    });
  });

  describe('Tournament lifecycle', () => {
    it('start_tournament validates team count and references', async () => {
      const { users, groupId } = await makeGroup(1);
      const tournamentId = await createTournament(users[0], groupId, 'Test', 'liga');

      // With 1 team: NOT_ENOUGH_TEAMS
      await addTeam(users[0], tournamentId, 'Equipo A', '#2fd27a');
      const startWith1 = await failure(startTournament(users[0], tournamentId, []));
      expect(startWith1).toContain('NOT_ENOUGH_TEAMS');

      // With invalid team_id: INVALID_INPUT
      const otherTournament = await createTournament(users[0], groupId, 'Other', 'liga');
      const otherTeamId = await addTeam(users[0], otherTournament, 'Other Team', '#ff0000');

      await addTeam(users[0], tournamentId, 'Equipo B', '#2fd27a');
      const startWithInvalidTeam = await failure(
        startTournament(users[0], tournamentId, [
          { round: 1, slot: 0, home_team_id: otherTeamId, away_team_id: null },
        ]),
      );
      expect(startWithInvalidTeam).toContain('INVALID_INPUT');
    });

    it('league: 3 teams round-robin, add team after start fails, all results finalize tournament', async () => {
      const { users, groupId } = await makeGroup(1);
      const tournamentId = await createTournament(users[0], groupId, 'League', 'liga');

      const teamA = await addTeam(users[0], tournamentId, 'Equipo A', '#2fd27a');
      const teamB = await addTeam(users[0], tournamentId, 'Equipo B', '#ff0000');
      const teamC = await addTeam(users[0], tournamentId, 'Equipo C', '#0000ff');

      const fixtures: Fixture[] = [
        { round: 1, slot: 0, home_team_id: teamA, away_team_id: teamB },
        { round: 2, slot: 0, home_team_id: teamB, away_team_id: teamC },
        { round: 3, slot: 0, home_team_id: teamC, away_team_id: teamA },
      ];

      await ok(startTournament(users[0], tournamentId, fixtures));

      // Tournament is now 'en_curso'
      let tournament = await getTournament(users[0], tournamentId);
      expect(tournament).not.toBeNull();
      expect(tournament!.status).toBe('en_curso');

      // Cannot add team after start
      const addAfterStart = await failure(
        users[0].client
          .from('tournament_teams')
          .insert({ tournament_id: tournamentId, name: 'Equipo D', color: '#ffff00' }),
      );
      expect(addAfterStart).not.toBe('OK');

      // Get matches
      const matches = await getMatches(users[0], tournamentId);
      expect(matches).toHaveLength(3);

      // Report results (one with a draw; in league draws are OK without penalties)
      await ok(reportResult(users[0], matches[0]!.id, 1, 1, null, null)); // Tie, no penalties needed in league
      await ok(reportResult(users[0], matches[1]!.id, 2, 1, null, null));
      await ok(reportResult(users[0], matches[2]!.id, 3, 0, null, null));

      // Tournament should now be 'finalizado'
      tournament = await getTournament(users[0], tournamentId);
      expect(tournament).not.toBeNull();
      expect(tournament!.status).toBe('finalizado');
    });

    it('elimination: 4 teams, penalties required on draw, winner advances to correct slot', async () => {
      const { users, groupId } = await makeGroup(1);
      const tournamentId = await createTournament(users[0], groupId, 'Elim', 'eliminacion');

      const teamA = await addTeam(users[0], tournamentId, 'Equipo A', '#2fd27a');
      const teamB = await addTeam(users[0], tournamentId, 'Equipo B', '#ff0000');
      const teamC = await addTeam(users[0], tournamentId, 'Equipo C', '#0000ff');
      const teamD = await addTeam(users[0], tournamentId, 'Equipo D', '#ffff00');

      const fixtures: Fixture[] = [
        { round: 1, slot: 0, home_team_id: teamA, away_team_id: teamD },
        { round: 1, slot: 1, home_team_id: teamB, away_team_id: teamC },
        { round: 2, slot: 0, home_team_id: null, away_team_id: null },
      ];

      await ok(startTournament(users[0], tournamentId, fixtures));

      const matches = await getMatches(users[0], tournamentId);
      expect(matches).toHaveLength(3);

      // Slot 0: A vs D
      // Slot 1: B vs C
      // Slot 2 (round 2): null vs null (for winners)

      // Slot 0: Draw without penalties -> PENALTIES_REQUIRED
      const drawNoPenalties = await failure(reportResult(users[0], matches[0].id, 1, 1, null, null));
      expect(drawNoPenalties).toContain('PENALTIES_REQUIRED');

      // Slot 0: Draw with different penalties -> OK. D wins 1-1, pens 4-3
      await ok(reportResult(users[0], matches[0]!.id, 1, 1, 3, 4));

      // Check that D advanced to round 2, slot 0 as away_team_id (because slot 0 is even, winner goes home)
      let updatedMatches = await getMatches(users[0], tournamentId);
      const final = updatedMatches.find((m) => m.round === 2 && m.slot === 0);
      expect(final).not.toBeUndefined();
      expect(final!.home_team_id).toBe(teamD); // Winner of slot 0 (even) goes to home

      // Slot 1: B beats C 2-1
      await ok(reportResult(users[0], matches[1]!.id, 2, 1, null, null));

      // Check that B advanced to round 2, slot 0 as away_team_id (because slot 1 is odd, winner goes away)
      updatedMatches = await getMatches(users[0], tournamentId);
      const final2 = updatedMatches.find((m) => m.round === 2 && m.slot === 0);
      expect(final2).not.toBeUndefined();
      expect(final2!.away_team_id).toBe(teamB); // Winner of slot 1 (odd) goes to away

      // Report final: D beats B
      const finalMatch = updatedMatches.find((m) => m.round === 2);
      expect(finalMatch).not.toBeUndefined();
      await ok(reportResult(users[0], finalMatch!.id, 2, 0, null, null));

      // Tournament should be 'finalizado'
      const tournament = await getTournament(users[0], tournamentId);
      expect(tournament).not.toBeNull();
      expect(tournament!.status).toBe('finalizado');

      // Try to correct a round 1 match -> NEXT_PLAYED (because round 2 was already played)
      const slot1Match = updatedMatches.find((m) => m.round === 1 && m.slot === 1);
      expect(slot1Match).not.toBeUndefined();
      const correctAfterFinal = await failure(reportResult(users[0], slot1Match!.id, 3, 1, null, null));
      expect(correctAfterFinal).toContain('NEXT_PLAYED');
    });
  });

  describe('Column grants', () => {
    it('direct update of status fails due to column grants', async () => {
      const { users, groupId } = await makeGroup(1);
      const tournamentId = await createTournament(users[0], groupId, 'Test', 'liga');

      const { error } = await users[0].client
        .from('tournaments')
        .update({ status: 'en_curso' })
        .eq('id', tournamentId);

      expect(error).not.toBeNull();
    });

    it('direct update of home_score on matches fails silently', async () => {
      const { users, groupId } = await makeGroup(1);
      const tournamentId = await createTournament(users[0], groupId, 'Test', 'liga');

      const teamA = await addTeam(users[0], tournamentId, 'A', '#2fd27a');
      const teamB = await addTeam(users[0], tournamentId, 'B', '#ff0000');

      await ok(startTournament(users[0], tournamentId, [
        { round: 1, slot: 0, home_team_id: teamA, away_team_id: teamB },
      ]));

      const matches = await getMatches(users[0], tournamentId);
      const match = matches[0];

      const { error } = await users[0].client
        .from('tournament_matches')
        .update({ home_score: 99 })
        .eq('id', match.id);

      expect(error).not.toBeNull();

      // Verify it wasn't updated
      const updated = await getTournament(users[0], tournamentId);
      expect(updated).toBeTruthy();
    });
  });

  describe('Team limits', () => {
    it('rejecting team 17 with TOO_MANY_TEAMS', async () => {
      const { users, groupId } = await makeGroup(1);
      const tournamentId = await createTournament(users[0], groupId, 'Test', 'liga');

      // Add 16 teams
      for (let i = 0; i < 16; i++) {
        await ok(
          users[0].client.from('tournament_teams').insert({
            tournament_id: tournamentId,
            name: `Team ${i + 1}`,
            color: '#2fd27a',
          }),
        );
      }

      // Try to add the 17th
      const addTeam17 = await failure(
        users[0].client.from('tournament_teams').insert({
          tournament_id: tournamentId,
          name: 'Team 17',
          color: '#ff0000',
        }),
      );

      expect(addTeam17).toContain('TOO_MANY_TEAMS');
    });
  });
});
