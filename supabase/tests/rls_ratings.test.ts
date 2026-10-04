import { describe, it, expect } from 'vitest';
import { newUser } from './helpers';

type User = Awaited<ReturnType<typeof newUser>>;

interface GroupCard {
  user_id: string;
  display_name: string;
  nickname: string | null;
  position: string;
  kind: 'campo' | 'arquero';
  raters: number;
  s1: number | null;
  s2: number | null;
  s3: number | null;
  s4: number | null;
  s5: number | null;
  s6: number | null;
}

type Outcome = PromiseLike<{ error: { message: string } | null }>;

async function ok(outcome: Outcome): Promise<void> {
  const { error } = await outcome;
  expect(error?.message ?? null).toBeNull();
}

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

describe('T3: calificaciones y cartas', () => {
  describe('player_ratings: CRUD y RLS', () => {
    it('un miembro califica a otro con upsert y puede releer su calificación', async () => {
      const { users, groupId } = await makeGroup(2);
      const rater = users[0];
      const rated = users[1];

      // Insert
      const insert = await rater.client.from('player_ratings').insert({
        group_id: groupId,
        rater_id: rater.id,
        rated_id: rated.id,
        kind: 'campo',
        s1: 75,
        s2: 80,
        s3: 70,
        s4: 85,
        s5: 90,
        s6: 65,
      });
      expect(insert.error?.message ?? null).toBeNull();

      // Select: el rater ve su calificación
      const { data, error } = await rater.client
        .from('player_ratings')
        .select('*')
        .eq('group_id', groupId)
        .eq('rated_id', rated.id)
        .single();
      expect(error?.message ?? null).toBeNull();
      expect(data).toMatchObject({
        rater_id: rater.id,
        rated_id: rated.id,
        kind: 'campo',
        s1: 75,
        s2: 80,
      });
    });

    it('puede actualizar su calificación con upsert', async () => {
      const { users, groupId } = await makeGroup(2);
      const rater = users[0];
      const rated = users[1];

      // Primera calificación
      await ok(
        rater.client.from('player_ratings').insert({
          group_id: groupId,
          rater_id: rater.id,
          rated_id: rated.id,
          kind: 'campo',
          s1: 75,
          s2: 80,
          s3: 70,
          s4: 85,
          s5: 90,
          s6: 65,
        }),
      );

      // Upsert (actualizar)
      const upsert = await rater.client
        .from('player_ratings')
        .upsert(
          {
            group_id: groupId,
            rater_id: rater.id,
            rated_id: rated.id,
            kind: 'campo',
            s1: 88,
            s2: 92,
            s3: 70,
            s4: 85,
            s5: 90,
            s6: 65,
          },
          { onConflict: 'group_id,rater_id,rated_id' },
        );
      expect(upsert.error?.message ?? null).toBeNull();

      // Verificar que se actualizó
      const updated = await rater.client
        .from('player_ratings')
        .select('s1, s2')
        .eq('group_id', groupId)
        .eq('rated_id', rated.id)
        .single();
      expect(updated.data).toMatchObject({ s1: 88, s2: 92 });
    });

    it('rechaza calificarse a sí mismo', async () => {
      const { users, groupId } = await makeGroup(1);
      const user = users[0];

      const result = await user.client.from('player_ratings').insert({
        group_id: groupId,
        rater_id: user.id,
        rated_id: user.id,
        kind: 'campo',
        s1: 50,
        s2: 50,
        s3: 50,
        s4: 50,
        s5: 50,
        s6: 50,
      });
      expect(result.error).not.toBeNull();
    });

    it('rechaza calificar a alguien de otro grupo', async () => {
      const { users: group1Users } = await makeGroup(1);
      const { users: group2Users, groupId: group2Id } = await makeGroup(1);
      const rater = group1Users[0];
      const rated = group2Users[0];

      const result = await rater.client.from('player_ratings').insert({
        group_id: group2Id,
        rater_id: rater.id,
        rated_id: rated.id,
        kind: 'campo',
        s1: 50,
        s2: 50,
        s3: 50,
        s4: 50,
        s5: 50,
        s6: 50,
      });
      expect(result.error).not.toBeNull();
    });

    it('un no miembro no puede calificar en el grupo', async () => {
      const { users, groupId } = await makeGroup(2);
      const outsider = await newUser('Ajeno');

      const result = await outsider.client.from('player_ratings').insert({
        group_id: groupId,
        rater_id: outsider.id,
        rated_id: users[0].id,
        kind: 'campo',
        s1: 50,
        s2: 50,
        s3: 50,
        s4: 50,
        s5: 50,
        s6: 50,
      });
      expect(result.error).not.toBeNull();
    });

    it('rechaza kind "campo" para un arquero (POR)', async () => {
      const { users, groupId } = await makeGroup(2);
      const rater = users[0];
      const goalkeeper = users[1];

      // Cambiar la posición a arquero
      const posUpdate = await goalkeeper.client
        .from('profiles')
        .update({ position: 'POR' })
        .eq('id', goalkeeper.id);
      expect(posUpdate.error?.message ?? null).toBeNull();

      // Intentar calificar con kind "campo" debe fallar
      const result = await rater.client.from('player_ratings').insert({
        group_id: groupId,
        rater_id: rater.id,
        rated_id: goalkeeper.id,
        kind: 'campo',
        s1: 50,
        s2: 50,
        s3: 50,
        s4: 50,
        s5: 50,
        s6: 50,
      });
      expect(result.error).not.toBeNull();
    });

    it('acepta kind "arquero" para un arquero (POR)', async () => {
      const { users, groupId } = await makeGroup(2);
      const rater = users[0];
      const goalkeeper = users[1];

      // Cambiar la posición a arquero
      await ok(
        goalkeeper.client.from('profiles').update({ position: 'POR' }).eq('id', goalkeeper.id),
      );

      // Calificar con kind "arquero" debe funcionar
      await ok(
        rater.client.from('player_ratings').insert({
          group_id: groupId,
          rater_id: rater.id,
          rated_id: goalkeeper.id,
          kind: 'arquero',
          s1: 50,
          s2: 50,
          s3: 50,
          s4: 50,
          s5: 50,
          s6: 50,
        }),
      );

      // Verificar que se guardó
      const stored = await rater.client
        .from('player_ratings')
        .select('kind')
        .eq('group_id', groupId)
        .eq('rated_id', goalkeeper.id)
        .single();
      expect(stored.data).toMatchObject({ kind: 'arquero' });
    });

    it('un usuario solo lee sus propias calificaciones (otro miembro no ve la del primero)', async () => {
      const { users, groupId } = await makeGroup(3);
      const rater = users[0];
      const rated = users[1];
      const other = users[2];

      // rater califica a rated
      await ok(
        rater.client.from('player_ratings').insert({
          group_id: groupId,
          rater_id: rater.id,
          rated_id: rated.id,
          kind: 'campo',
          s1: 75,
          s2: 80,
          s3: 70,
          s4: 85,
          s5: 90,
          s6: 65,
        }),
      );

      // rater ve su calificación
      const raterRows = await rater.client
        .from('player_ratings')
        .select('*')
        .eq('group_id', groupId)
        .eq('rated_id', rated.id);
      expect(raterRows.data).toHaveLength(1);

      // other (otro miembro) no ve la calificación de rater
      const otherRows = await other.client
        .from('player_ratings')
        .select('*')
        .eq('group_id', groupId)
        .eq('rated_id', rated.id);
      expect(otherRows.data).toHaveLength(0);
    });
  });

  describe('get_group_cards', () => {
    it('un no miembro recibe NOT_ALLOWED', async () => {
      const { groupId } = await makeGroup(2);
      const outsider = await newUser('Ajeno');

      const result = await outsider.client.rpc('get_group_cards', { p_group_id: groupId });
      expect(result.error?.message).toContain('NOT_ALLOWED');
    });

    it('devuelve una fila por miembro del grupo', async () => {
      const { users, groupId } = await makeGroup(3);

      const { data, error } = await users[0].client.rpc('get_group_cards', {
        p_group_id: groupId,
      });
      expect(error?.message ?? null).toBeNull();
      const cards = data as unknown as GroupCard[];
      expect(cards).toHaveLength(3);
      expect(cards.map((c) => c.user_id).sort()).toEqual(
        [users[0].id, users[1].id, users[2].id].sort(),
      );
    });

    it('con 2 calificadores, raters es 2 y s1..s6 son null', async () => {
      const { users, groupId } = await makeGroup(3);
      const rated = users[0];
      const rater1 = users[1];
      const rater2 = users[2];

      // Dos calificaciones
      await ok(
        rater1.client.from('player_ratings').insert({
          group_id: groupId,
          rater_id: rater1.id,
          rated_id: rated.id,
          kind: 'campo',
          s1: 70,
          s2: 75,
          s3: 80,
          s4: 85,
          s5: 90,
          s6: 95,
        }),
      );

      await ok(
        rater2.client.from('player_ratings').insert({
          group_id: groupId,
          rater_id: rater2.id,
          rated_id: rated.id,
          kind: 'campo',
          s1: 80,
          s2: 85,
          s3: 90,
          s4: 95,
          s5: 75,
          s6: 70,
        }),
      );

      const { data } = await rater1.client.rpc('get_group_cards', { p_group_id: groupId });
      const cards = data as unknown as GroupCard[];
      const card = cards.find((c) => c.user_id === rated.id);

      expect(card).toMatchObject({
        raters: 2,
        s1: null,
        s2: null,
        s3: null,
        s4: null,
        s5: null,
        s6: null,
      });
    });

    it('con 3 calificadores devuelve el promedio redondeado', async () => {
      const { users, groupId } = await makeGroup(4);
      const rated = users[0];
      const raters = [users[1], users[2], users[3]];

      // Tres calificaciones con valores que producen promedios no enteros
      // Promedio de 70, 80, 75 = 75 (entero, pero probemos con otro)
      // Promedio de 70, 80, 81 = 77 (promedio es 231/3 = 77)
      // Promedio de 70, 80, 82 = 77.33... → redondea a 77
      // Promedio de 70, 80, 83 = 77.66... → redondea a 78
      await ok(
        raters[0].client.from('player_ratings').insert({
          group_id: groupId,
          rater_id: raters[0].id,
          rated_id: rated.id,
          kind: 'campo',
          s1: 70,
          s2: 71,
          s3: 72,
          s4: 73,
          s5: 74,
          s6: 75,
        }),
      );

      await ok(
        raters[1].client.from('player_ratings').insert({
          group_id: groupId,
          rater_id: raters[1].id,
          rated_id: rated.id,
          kind: 'campo',
          s1: 80,
          s2: 81,
          s3: 82,
          s4: 83,
          s5: 84,
          s6: 85,
        }),
      );

      await ok(
        raters[2].client.from('player_ratings').insert({
          group_id: groupId,
          rater_id: raters[2].id,
          rated_id: rated.id,
          kind: 'campo',
          s1: 83,
          s2: 84,
          s3: 85,
          s4: 86,
          s5: 87,
          s6: 88,
        }),
      );

      const { data } = await raters[0].client.rpc('get_group_cards', { p_group_id: groupId });
      const cards = data as unknown as GroupCard[];
      const card = cards.find((c) => c.user_id === rated.id);

      expect(card).toMatchObject({
        raters: 3,
        // Promedios: s1=(70+80+83)/3=77.666...→78, s2=(71+81+84)/3=78.666...→79, etc.
        s1: 78,
        s2: 79,
        s3: 80,
        s4: 81,
        s5: 82,
        s6: 83,
      });
    });

    it('devuelve miembros sin calificaciones con raters 0', async () => {
      const { users, groupId } = await makeGroup(3);
      const rated = users[0];
      const rater = users[1];
      const nobody = users[2];

      // Solo una calificación
      await ok(
        rater.client.from('player_ratings').insert({
          group_id: groupId,
          rater_id: rater.id,
          rated_id: rated.id,
          kind: 'campo',
          s1: 50,
          s2: 50,
          s3: 50,
          s4: 50,
          s5: 50,
          s6: 50,
        }),
      );

      const { data } = await rater.client.rpc('get_group_cards', { p_group_id: groupId });
      const cards = data as unknown as GroupCard[];

      // nobody debe estar en la lista pero con raters 0
      const nobodyCard = cards.find((c) => c.user_id === nobody.id);
      expect(nobodyCard).toMatchObject({
        raters: 0,
        s1: null,
        s2: null,
        s3: null,
        s4: null,
        s5: null,
        s6: null,
      });
    });

    it('solo cuenta calificaciones del kind que coincide con la posición', async () => {
      const { users, groupId } = await makeGroup(3);
      const goalkeeper = users[0];
      const rater1 = users[1];
      const rater2 = users[2];

      // Cambiar a arquero
      await ok(
        goalkeeper.client.from('profiles').update({ position: 'POR' }).eq('id', goalkeeper.id),
      );

      // rater1 intenta calificar con kind "campo" (debe fallar)
      const badKind = await rater1.client.from('player_ratings').insert({
        group_id: groupId,
        rater_id: rater1.id,
        rated_id: goalkeeper.id,
        kind: 'campo',
        s1: 50,
        s2: 50,
        s3: 50,
        s4: 50,
        s5: 50,
        s6: 50,
      });
      expect(badKind.error).not.toBeNull();

      // rater1 califica con kind "arquero" (correcto)
      await ok(
        rater1.client.from('player_ratings').insert({
          group_id: groupId,
          rater_id: rater1.id,
          rated_id: goalkeeper.id,
          kind: 'arquero',
          s1: 60,
          s2: 60,
          s3: 60,
          s4: 60,
          s5: 60,
          s6: 60,
        }),
      );

      // rater2 también califica con kind "arquero"
      await ok(
        rater2.client.from('player_ratings').insert({
          group_id: groupId,
          rater_id: rater2.id,
          rated_id: goalkeeper.id,
          kind: 'arquero',
          s1: 70,
          s2: 70,
          s3: 70,
          s4: 70,
          s5: 70,
          s6: 70,
        }),
      );

      const { data } = await rater1.client.rpc('get_group_cards', { p_group_id: groupId });
      const cards = data as unknown as GroupCard[];
      const card = cards.find((c) => c.user_id === goalkeeper.id);

      // Debe tener raters = 2 (solo las calificaciones con kind "arquero")
      expect(card).toMatchObject({
        raters: 2,
        kind: 'arquero',
        s1: null,
        s2: null, // Aún insuficientes (< 3)
      });
    });
  });
});
