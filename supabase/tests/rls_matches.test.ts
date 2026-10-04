import { describe, it, expect } from 'vitest';
import { admin, anon, newUser } from './helpers';

type User = Awaited<ReturnType<typeof newUser>>;

interface MvpSummary {
  eligible: number;
  votes_cast: number;
  closed: boolean;
  mvp_ids: string[];
  my_vote: string | null;
}

interface Stat {
  user_id: string;
  goals: number;
  assists: number;
}

type Outcome = PromiseLike<{ error: { message: string } | null }>;

const HOUR_MS = 60 * 60 * 1000;

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

async function createMatch(creator: User, groupId: string, playersPerTeam = 3): Promise<string> {
  const { data, error } = await creator.client
    .from('matches')
    .insert({
      group_id: groupId,
      scheduled_at: new Date(Date.now() + 2 * HOUR_MS).toISOString(),
      location: 'Cancha de prueba',
      players_per_team: playersPerTeam,
    })
    .select('id')
    .single();
  expect(error?.message ?? null).toBeNull();
  const id = (data as unknown as { id: string } | null)?.id;
  expect(id).toBeTruthy();
  return id as string;
}

async function confirm(user: User, matchId: string): Promise<void> {
  await ok(user.client.rpc('set_attendance', { p_match_id: matchId, p_status: 'confirmado' }));
}

async function assign(
  organizer: User,
  matchId: string,
  teams: { user: User; team: 'A' | 'B' | null }[],
): Promise<void> {
  await ok(
    organizer.client.rpc('assign_teams', {
      p_match_id: matchId,
      p_assignments: teams.map(({ user, team }) => ({ user_id: user.id, team })),
    }),
  );
}

function finalize(organizer: User, matchId: string, scoreA: number, scoreB: number, stats: Stat[]) {
  return organizer.client.rpc('finalize_match', {
    p_match_id: matchId,
    p_score_a: scoreA,
    p_score_b: scoreB,
    p_stats: stats,
  });
}

function vote(voter: User, matchId: string, voted: User) {
  return voter.client.rpc('vote_mvp', { p_match_id: matchId, p_voted_id: voted.id });
}

async function summary(user: User, matchId: string): Promise<MvpSummary> {
  const { data, error } = await user.client.rpc('get_match_mvp_summary', { p_match_id: matchId });
  expect(error?.message ?? null).toBeNull();
  const rows = data as unknown as MvpSummary[];
  expect(rows).toHaveLength(1);
  return rows[0];
}

interface Scenario {
  users: User[];
  groupId: string;
  matchId: string;
  organizer: User; // users[0], creador del partido y admin del grupo
  players: User[]; // users[0..3]: A = players[0], players[1]; B = players[2], players[3]
  bystander: User; // users[4]: miembro que no juega
}

// Grupo de 5, partido de 3 por lado con 4 confirmados y equipos armados.
// Con `played` el organizador lo finaliza 3 a 2.
async function scenario(played: boolean): Promise<Scenario> {
  const { users, groupId } = await makeGroup(5);
  const organizer = users[0];
  const players = users.slice(0, 4);
  const matchId = await createMatch(organizer, groupId);

  for (const player of players) {
    await confirm(player, matchId);
  }
  await assign(organizer, matchId, [
    { user: players[0], team: 'A' },
    { user: players[1], team: 'A' },
    { user: players[2], team: 'B' },
    { user: players[3], team: 'B' },
  ]);

  if (played) {
    await ok(
      finalize(organizer, matchId, 3, 2, [
        { user_id: players[0].id, goals: 2, assists: 0 },
        { user_id: players[1].id, goals: 1, assists: 2 },
        { user_id: players[2].id, goals: 2, assists: 1 },
      ]),
    );
  }
  return { users, groupId, matchId, organizer, players, bystander: users[4] };
}

async function backdateFinalization(matchId: string, hoursAgo: number): Promise<void> {
  await ok(
    admin
      .from('matches')
      .update({ finalized_at: new Date(Date.now() - hoursAgo * HOUR_MS).toISOString() })
      .eq('id', matchId),
  );
}

describe('T2: partidos y MVP', () => {
  describe('visibilidad y creación de partidos', () => {
    it('un no miembro no ve partidos ni asistentes, un miembro sí, y anon no ve nada', async () => {
      const { users, groupId } = await makeGroup(2);
      const outsider = await newUser('Ajeno');
      const matchId = await createMatch(users[0], groupId);
      await confirm(users[0], matchId);

      const asOutsider = await outsider.client.from('matches').select('id').eq('id', matchId);
      expect(asOutsider.error).toBeNull();
      expect(asOutsider.data).toHaveLength(0);

      const playersAsOutsider = await outsider.client.from('match_players').select('user_id').eq('match_id', matchId);
      expect(playersAsOutsider.error).toBeNull();
      expect(playersAsOutsider.data).toHaveLength(0);

      const asMember = await users[1].client.from('matches').select('id').eq('id', matchId);
      expect(asMember.data).toHaveLength(1);
      const playersAsMember = await users[1].client.from('match_players').select('user_id').eq('match_id', matchId);
      expect(playersAsMember.data).toHaveLength(1);

      const asAnon = await anon().from('matches').select('id').eq('id', matchId);
      expect(asAnon.data ?? []).toHaveLength(0);
    });

    it('solo un miembro crea partidos, siempre programados y a su nombre', async () => {
      const { users, groupId } = await makeGroup(2);
      const outsider = await newUser('Ajeno');
      const base = {
        group_id: groupId,
        scheduled_at: new Date(Date.now() + HOUR_MS).toISOString(),
        location: 'Cancha',
      };

      const byOutsider = await outsider.client.from('matches').insert(base);
      expect(byOutsider.error).not.toBeNull();

      const finished = await users[1].client.from('matches').insert({ ...base, status: 'finalizado' });
      expect(finished.error).not.toBeNull();

      const withScore = await users[1].client.from('matches').insert({ ...base, score_a: 3 });
      expect(withScore.error).not.toBeNull();

      const spoofed = await users[1].client.from('matches').insert({ ...base, created_by: users[0].id });
      expect(spoofed.error).not.toBeNull();

      const valid = await users[1].client.from('matches').insert(base).select('status, created_by, players_per_team').single();
      expect(valid.error).toBeNull();
      expect(valid.data).toMatchObject({ status: 'programado', created_by: users[1].id, players_per_team: 5 });
    });

    it('solo el organizador edita o borra un partido programado, y no puede tocar el resultado', async () => {
      const { users, groupId } = await makeGroup(3);
      // users[1] crea el partido: lo organizan él y el admin del grupo (users[0]); users[2] no.
      const matchId = await createMatch(users[1], groupId);

      const byMember = await users[2].client.from('matches').update({ location: 'Hackeada' }).eq('id', matchId).select('id');
      expect(byMember.data ?? []).toHaveLength(0);
      const deleteByMember = await users[2].client.from('matches').delete().eq('id', matchId).select('id');
      expect(deleteByMember.data ?? []).toHaveLength(0);

      const byCreator = await users[1].client.from('matches').update({ location: 'Cancha nueva' }).eq('id', matchId).select('id');
      expect(byCreator.error).toBeNull();
      expect(byCreator.data).toHaveLength(1);

      const byAdmin = await users[0].client.from('matches').update({ players_per_team: 4 }).eq('id', matchId).select('id');
      expect(byAdmin.error).toBeNull();
      expect(byAdmin.data).toHaveLength(1);

      // Resultado y estado final no se escriben por update directo.
      const score = await users[1].client.from('matches').update({ score_a: 9 }).eq('id', matchId);
      expect(score.error).not.toBeNull();
      const finalized = await users[1].client.from('matches').update({ status: 'finalizado' }).eq('id', matchId);
      expect(finalized.error).not.toBeNull();
      const moved = await users[1].client.from('matches').update({ group_id: crypto.randomUUID() }).eq('id', matchId);
      expect(moved.error).not.toBeNull();

      const stored = await users[1].client.from('matches').select('location, players_per_team, score_a').eq('id', matchId).single();
      expect(stored.data).toMatchObject({ location: 'Cancha nueva', players_per_team: 4, score_a: null });

      const deleted = await users[1].client.from('matches').delete().eq('id', matchId).select('id');
      expect(deleted.data).toHaveLength(1);
    });
  });

  describe('set_attendance', () => {
    it('confirma, da de baja (libera el equipo) y rechaza al que no es miembro', async () => {
      const { users, groupId } = await makeGroup(2);
      const outsider = await newUser('Ajeno');
      const matchId = await createMatch(users[0], groupId);

      await confirm(users[1], matchId);
      await assign(users[0], matchId, [{ user: users[1], team: 'A' }]);

      const teamed = await users[0].client.from('match_players').select('attendance, team').eq('match_id', matchId).eq('user_id', users[1].id).single();
      expect(teamed.data).toMatchObject({ attendance: 'confirmado', team: 'A' });

      // Reconfirmar no pierde el equipo; la baja sí lo libera.
      await confirm(users[1], matchId);
      const kept = await users[0].client.from('match_players').select('team').eq('match_id', matchId).eq('user_id', users[1].id).single();
      expect(kept.data).toMatchObject({ team: 'A' });

      await ok(users[1].client.rpc('set_attendance', { p_match_id: matchId, p_status: 'baja' }));
      const dropped = await users[0].client.from('match_players').select('attendance, team').eq('match_id', matchId).eq('user_id', users[1].id).single();
      expect(dropped.data).toMatchObject({ attendance: 'baja', team: null });

      expect(await failure(outsider.client.rpc('set_attendance', { p_match_id: matchId, p_status: 'confirmado' }))).toContain('NOT_ALLOWED');
      expect(await failure(outsider.client.rpc('set_attendance', { p_match_id: crypto.randomUUID(), p_status: 'confirmado' }))).toContain('NOT_ALLOWED');
      expect(await failure(anon().rpc('set_attendance', { p_match_id: matchId, p_status: 'confirmado' }))).not.toBe('OK');
    });

    it('da MATCH_FULL al llegar a 2 x players_per_team, pero deja reconfirmar y recuperar el lugar tras una baja', async () => {
      const { users, groupId } = await makeGroup(8);
      const matchId = await createMatch(users[0], groupId, 3);

      for (const user of users.slice(0, 6)) {
        await confirm(user, matchId);
      }
      expect(await failure(users[6].client.rpc('set_attendance', { p_match_id: matchId, p_status: 'confirmado' }))).toContain('MATCH_FULL');

      // Quien ya estaba confirmado puede reconfirmar aunque esté lleno.
      await confirm(users[0], matchId);

      // Una baja libera un lugar para el siguiente.
      await ok(users[5].client.rpc('set_attendance', { p_match_id: matchId, p_status: 'baja' }));
      await confirm(users[6], matchId);
      expect(await failure(users[7].client.rpc('set_attendance', { p_match_id: matchId, p_status: 'confirmado' }))).toContain('MATCH_FULL');

      // Darse de baja nunca depende del cupo.
      await ok(users[7].client.rpc('set_attendance', { p_match_id: matchId, p_status: 'baja' }));
    });

    it('da MATCH_CLOSED en partidos cancelados o finalizados', async () => {
      const { users, groupId } = await makeGroup(2);
      const cancelledId = await createMatch(users[0], groupId);
      await ok(users[0].client.from('matches').update({ status: 'cancelado' }).eq('id', cancelledId));
      expect(await failure(users[1].client.rpc('set_attendance', { p_match_id: cancelledId, p_status: 'confirmado' }))).toContain('MATCH_CLOSED');

      const played = await scenario(true);
      expect(await failure(played.bystander.client.rpc('set_attendance', { p_match_id: played.matchId, p_status: 'confirmado' }))).toContain('MATCH_CLOSED');
    });

    it('no deja escribir match_players directamente', async () => {
      const { users, groupId } = await makeGroup(2);
      const matchId = await createMatch(users[0], groupId);
      await confirm(users[1], matchId);

      const insert = await users[0].client.from('match_players').insert({ match_id: matchId, user_id: users[0].id });
      expect(insert.error).not.toBeNull();
      const update = await users[1].client.from('match_players').update({ goals: 9 }).eq('match_id', matchId).eq('user_id', users[1].id);
      expect(update.error).not.toBeNull();
      const remove = await users[1].client.from('match_players').delete().eq('match_id', matchId).eq('user_id', users[1].id);
      expect(remove.error).not.toBeNull();
    });
  });

  describe('assign_teams', () => {
    it('un miembro que no organiza da NOT_ALLOWED; el creador y el admin pueden', async () => {
      const { users, groupId } = await makeGroup(3);
      // users[1] crea el partido; users[0] es admin del grupo; users[2] es un miembro cualquiera.
      const matchId = await createMatch(users[1], groupId);
      await confirm(users[2], matchId);

      const forbidden = await failure(
        users[2].client.rpc('assign_teams', { p_match_id: matchId, p_assignments: [{ user_id: users[2].id, team: 'A' }] }),
      );
      expect(forbidden).toContain('NOT_ALLOWED');

      await assign(users[1], matchId, [{ user: users[2], team: 'A' }]);
      await assign(users[0], matchId, [{ user: users[2], team: 'B' }]);

      const stored = await users[2].client.from('match_players').select('team').eq('match_id', matchId).eq('user_id', users[2].id).single();
      expect(stored.data).toMatchObject({ team: 'B' });
    });

    it('rechaza no confirmados, equipos inválidos y entradas mal formadas sin dejar cambios a medias', async () => {
      const { users, groupId } = await makeGroup(4);
      const matchId = await createMatch(users[0], groupId);
      await confirm(users[0], matchId);
      await confirm(users[1], matchId);
      await ok(users[2].client.rpc('set_attendance', { p_match_id: matchId, p_status: 'baja' }));

      const call = (assignments: unknown) =>
        failure(users[0].client.rpc('assign_teams', { p_match_id: matchId, p_assignments: assignments }));

      // users[3] nunca confirmó y users[2] se dio de baja.
      expect(await call([{ user_id: users[0].id, team: 'A' }, { user_id: users[3].id, team: 'B' }])).toContain('INVALID_INPUT');
      expect(await call([{ user_id: users[2].id, team: 'B' }])).toContain('INVALID_INPUT');
      expect(await call([{ user_id: users[0].id, team: 'C' }])).toContain('INVALID_INPUT');
      expect(await call([{ user_id: 'no-es-un-uuid', team: 'A' }])).toContain('INVALID_INPUT');
      expect(await call({ user_id: users[0].id, team: 'A' })).toContain('INVALID_INPUT');

      const stored = await users[0].client.from('match_players').select('team').eq('match_id', matchId).eq('user_id', users[0].id).single();
      expect(stored.data).toMatchObject({ team: null });

      // team null deja al jugador sin equipo.
      await assign(users[0], matchId, [{ user: users[0], team: 'A' }]);
      await assign(users[0], matchId, [{ user: users[0], team: null }]);
      const cleared = await users[0].client.from('match_players').select('team').eq('match_id', matchId).eq('user_id', users[0].id).single();
      expect(cleared.data).toMatchObject({ team: null });
    });

    it('da MATCH_CLOSED si el partido ya no está programado', async () => {
      const played = await scenario(true);
      const result = await failure(
        played.organizer.client.rpc('assign_teams', {
          p_match_id: played.matchId,
          p_assignments: [{ user_id: played.players[0].id, team: 'B' }],
        }),
      );
      expect(result).toContain('MATCH_CLOSED');
    });
  });

  describe('finalize_match', () => {
    it('un miembro que no organiza da NOT_ALLOWED', async () => {
      const played = await scenario(false);
      const result = await failure(finalize(played.players[1], played.matchId, 1, 0, []));
      expect(result).toContain('NOT_ALLOWED');

      const stored = await played.organizer.client.from('matches').select('status, score_a').eq('id', played.matchId).single();
      expect(stored.data).toMatchObject({ status: 'programado', score_a: null });
    });

    it('rechaza asistencias o goles de más y estadísticas de quien no jugó (INVALID_RESULT)', async () => {
      const played = await scenario(false);
      const [a1, a2, b1] = played.players;

      // Asistencias de más: el equipo A hizo 2 goles pero se cargan 3 asistencias.
      expect(
        await failure(finalize(played.organizer, played.matchId, 2, 1, [
          { user_id: a1.id, goals: 1, assists: 2 },
          { user_id: a2.id, goals: 1, assists: 1 },
        ])),
      ).toContain('INVALID_RESULT');

      // Goles de más en el equipo B.
      expect(
        await failure(finalize(played.organizer, played.matchId, 2, 1, [{ user_id: b1.id, goals: 2, assists: 0 }])),
      ).toContain('INVALID_RESULT');

      // Estadística de alguien sin equipo (confirmado de otro partido o simplemente ajeno).
      expect(
        await failure(finalize(played.organizer, played.matchId, 2, 1, [{ user_id: played.bystander.id, goals: 1, assists: 0 }])),
      ).toContain('INVALID_RESULT');

      // Resultado fuera de rango.
      expect(await failure(finalize(played.organizer, played.matchId, 100, 1, []))).toContain('INVALID_RESULT');
      expect(await failure(finalize(played.organizer, played.matchId, -1, 1, []))).toContain('INVALID_RESULT');

      // Nada se guardó.
      const stored = await played.organizer.client.from('matches').select('status, score_a, finalized_at').eq('id', played.matchId).single();
      expect(stored.data).toMatchObject({ status: 'programado', score_a: null, finalized_at: null });
    });

    it('exige al menos un jugador en cada equipo', async () => {
      const { users, groupId } = await makeGroup(2);
      const matchId = await createMatch(users[0], groupId);
      await confirm(users[0], matchId);
      await confirm(users[1], matchId);
      await assign(users[0], matchId, [{ user: users[0], team: 'A' }]);

      expect(await failure(finalize(users[0], matchId, 1, 0, []))).toContain('INVALID_RESULT');
    });

    it('guarda resultado, goles y asistencias, y después da MATCH_CLOSED', async () => {
      const played = await scenario(true);
      const [a1, a2, b1, b2] = played.players;

      const match = await played.bystander.client.from('matches').select('status, score_a, score_b, finalized_at').eq('id', played.matchId).single();
      expect(match.data).toMatchObject({ status: 'finalizado', score_a: 3, score_b: 2 });
      expect((match.data as unknown as { finalized_at: string | null }).finalized_at).not.toBeNull();

      const rows = await played.bystander.client.from('match_players').select('user_id, team, goals, assists').eq('match_id', played.matchId);
      const byUser = new Map((rows.data as unknown as { user_id: string; team: string; goals: number; assists: number }[]).map((row) => [row.user_id, row]));
      expect(byUser.get(a1.id)).toMatchObject({ team: 'A', goals: 2, assists: 0 });
      expect(byUser.get(a2.id)).toMatchObject({ team: 'A', goals: 1, assists: 2 });
      expect(byUser.get(b1.id)).toMatchObject({ team: 'B', goals: 2, assists: 1 });
      expect(byUser.get(b2.id)).toMatchObject({ team: 'B', goals: 0, assists: 0 });

      expect(await failure(finalize(played.organizer, played.matchId, 1, 1, []))).toContain('MATCH_CLOSED');

      // Un partido finalizado ya no se edita ni se borra.
      const edit = await played.organizer.client.from('matches').update({ location: 'Otra' }).eq('id', played.matchId).select('id');
      expect(edit.data ?? []).toHaveLength(0);
      const remove = await played.organizer.client.from('matches').delete().eq('id', played.matchId).select('id');
      expect(remove.data ?? []).toHaveLength(0);
    });
  });

  describe('vote_mvp', () => {
    it('da VOTING_CLOSED mientras el partido no está finalizado', async () => {
      const open = await scenario(false);
      expect(await failure(vote(open.players[0], open.matchId, open.players[2]))).toContain('VOTING_CLOSED');
    });

    it('no se vota a uno mismo ni a quien no jugó, y vota solo quien jugó (NOT_ELIGIBLE)', async () => {
      const played = await scenario(true);
      const [a1, a2] = played.players;

      expect(await failure(vote(a1, played.matchId, a1))).toContain('NOT_ELIGIBLE');
      expect(await failure(vote(a1, played.matchId, played.bystander))).toContain('NOT_ELIGIBLE');
      expect(await failure(vote(played.bystander, played.matchId, a2))).toContain('NOT_ELIGIBLE');

      const outsider = await newUser('Ajeno');
      expect(await failure(vote(outsider, played.matchId, a2))).toContain('NOT_ALLOWED');

      expect((await summary(a1, played.matchId)).votes_cast).toBe(0);
    });

    it('no se vota dos veces (ALREADY_VOTED), ni siquiera a otra persona', async () => {
      const played = await scenario(true);
      const [a1, a2, b1] = played.players;

      await ok(vote(a1, played.matchId, b1));
      expect(await failure(vote(a1, played.matchId, b1))).toContain('ALREADY_VOTED');
      expect(await failure(vote(a1, played.matchId, a2))).toContain('ALREADY_VOTED');

      expect((await summary(a1, played.matchId)).votes_cast).toBe(1);
    });

    it('da VOTING_CLOSED pasadas las 72 horas', async () => {
      const played = await scenario(true);
      await backdateFinalization(played.matchId, 73);

      expect(await failure(vote(played.players[0], played.matchId, played.players[2]))).toContain('VOTING_CLOSED');
    });

    it('no deja escribir mvp_votes directamente', async () => {
      const played = await scenario(true);
      const [a1, , b1] = played.players;

      const insert = await a1.client.from('mvp_votes').insert({ match_id: played.matchId, voted_id: b1.id });
      expect(insert.error).not.toBeNull();

      await ok(vote(a1, played.matchId, b1));
      const update = await a1.client.from('mvp_votes').update({ voted_id: a1.id }).eq('match_id', played.matchId);
      expect(update.error).not.toBeNull();
      const remove = await a1.client.from('mvp_votes').delete().eq('match_id', played.matchId);
      expect(remove.error).not.toBeNull();
    });
  });

  describe('mvp_votes RLS', () => {
    it('cada uno lee solo su voto: nadie lee votos ajenos, ni el organizador ni anon', async () => {
      const played = await scenario(true);
      const [a1, a2, b1, b2] = played.players;

      await ok(vote(a1, played.matchId, b1));
      await ok(vote(a2, played.matchId, b1));
      await ok(vote(b1, played.matchId, a1));

      const own = await a1.client.from('mvp_votes').select('voter_id, voted_id').eq('match_id', played.matchId);
      expect(own.error).toBeNull();
      expect(own.data).toEqual([{ voter_id: a1.id, voted_id: b1.id }]);

      const ofOthers = await a1.client.from('mvp_votes').select('voter_id').eq('match_id', played.matchId).eq('voter_id', a2.id);
      expect(ofOthers.data).toHaveLength(0);

      // Quien no votó no ve ningún voto.
      const none = await b2.client.from('mvp_votes').select('voter_id').eq('match_id', played.matchId);
      expect(none.data).toHaveLength(0);

      // Ni siquiera el organizador / admin del grupo.
      const organizer = await played.organizer.client.from('mvp_votes').select('voter_id').eq('match_id', played.matchId);
      expect(organizer.data).toEqual([{ voter_id: a1.id }]);

      const asAnon = await anon().from('mvp_votes').select('voter_id').eq('match_id', played.matchId);
      expect(asAnon.data ?? []).toHaveLength(0);
    });
  });

  describe('get_match_mvp_summary', () => {
    it('solo lo ven los miembros del grupo', async () => {
      const played = await scenario(true);
      const outsider = await newUser('Ajeno');

      expect(await failure(outsider.client.rpc('get_match_mvp_summary', { p_match_id: played.matchId }))).toContain('NOT_ALLOWED');
      expect(await failure(anon().rpc('get_match_mvp_summary', { p_match_id: played.matchId }))).not.toBe('OK');

      // Un miembro que no jugó sí lo ve.
      const seen = await summary(played.bystander, played.matchId);
      expect(seen).toMatchObject({ eligible: 4, votes_cast: 0, closed: false, mvp_ids: [], my_vote: null });
    });

    it('en un partido sin finalizar no está cerrado y no hay MVP', async () => {
      const open = await scenario(false);
      const seen = await summary(open.organizer, open.matchId);
      expect(seen).toMatchObject({ eligible: 4, votes_cast: 0, closed: false, mvp_ids: [], my_vote: null });
    });

    it('con votos parciales no cierra ni nombra MVP, y my_vote es solo el propio', async () => {
      const played = await scenario(true);
      const [a1, a2, b1, b2] = played.players;

      await ok(vote(a1, played.matchId, b1));
      await ok(vote(a2, played.matchId, b1));

      const mine = await summary(a1, played.matchId);
      expect(mine).toMatchObject({ eligible: 4, votes_cast: 2, closed: false, mvp_ids: [], my_vote: b1.id });
      const other = await summary(b2, played.matchId);
      expect(other).toMatchObject({ votes_cast: 2, closed: false, mvp_ids: [], my_vote: null });
    });

    it('cierra cuando votaron todos y devuelve al único MVP con más votos', async () => {
      const played = await scenario(true);
      const [a1, a2, b1, b2] = played.players;

      await ok(vote(a1, played.matchId, b1));
      await ok(vote(a2, played.matchId, b1));
      await ok(vote(b1, played.matchId, b2));
      await ok(vote(b2, played.matchId, b1));

      const single = await summary(a1, played.matchId);
      expect(single).toMatchObject({ eligible: 4, votes_cast: 4, closed: true, my_vote: b1.id });
      expect(single.mvp_ids).toEqual([b1.id]);
    });

    it('devuelve los MVP empatados cuando todos votaron', async () => {
      const played = await scenario(true);
      const [a1, a2, b1, b2] = played.players;

      await ok(vote(a1, played.matchId, b1));
      await ok(vote(a2, played.matchId, b2));
      await ok(vote(b1, played.matchId, a1));
      await ok(vote(b2, played.matchId, a2));

      const tied = await summary(played.bystander, played.matchId);
      expect(tied).toMatchObject({ eligible: 4, votes_cast: 4, closed: true, my_vote: null });
      expect([...tied.mvp_ids].sort()).toEqual([a1.id, a2.id, b1.id, b2.id].sort());
    });

    it('pasadas las 72 horas cierra con votos parciales y devuelve los empatados', async () => {
      const played = await scenario(true);
      const [a1, a2, b1, b2] = played.players;

      await ok(vote(a1, played.matchId, b1));
      await ok(vote(a2, played.matchId, b2));

      const before = await summary(a1, played.matchId);
      expect(before).toMatchObject({ votes_cast: 2, closed: false, mvp_ids: [] });

      await backdateFinalization(played.matchId, 73);

      const after = await summary(a1, played.matchId);
      expect(after).toMatchObject({ eligible: 4, votes_cast: 2, closed: true, my_vote: b1.id });
      expect([...after.mvp_ids].sort()).toEqual([b1.id, b2.id].sort());
    });

    it('pasadas las 72 horas sin votos queda cerrado y sin MVP', async () => {
      const played = await scenario(true);
      await backdateFinalization(played.matchId, 80);

      const seen = await summary(played.players[0], played.matchId);
      expect(seen).toMatchObject({ eligible: 4, votes_cast: 0, closed: true, mvp_ids: [], my_vote: null });
    });
  });
});
