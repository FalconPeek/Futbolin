import { describe, it, expect } from 'vitest';
import { anon, newUser } from './helpers';

describe('T1: Core RLS and Profiles, Groups, Memberships', () => {
  describe('profiles', () => {
    it('newUser creates a profile with display_name from metadata', async () => {
      const { id, client } = await newUser('TestUser');

      const { data, error } = await client.from('profiles').select('*').eq('id', id).single();

      expect(error).toBeNull();
      expect(data).toMatchObject({
        id,
        display_name: 'TestUser',
        position: 'MC',
      });
    });

    it('newUser defaults to "Jugador" if display_name is missing', async () => {
      const { id, client } = await newUser();

      const { data } = await client.from('profiles').select('*').eq('id', id).single();

      expect(data?.display_name).toBe('Jugador');
    });

    it('newUser defaults to "Jugador" if display_name has < 2 chars', async () => {
      const { id, client } = await newUser('A');

      const { data } = await client.from('profiles').select('*').eq('id', id).single();

      expect(data?.display_name).toBe('Jugador');
    });

    it('user can see own profile', async () => {
      const { id, client } = await newUser('Alice');

      const { data, error } = await client.from('profiles').select('*').eq('id', id);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0].id).toBe(id);
    });

    it('user cannot see other profile before sharing a group', async () => {
      const userA = await newUser('Alice');
      const userB = await newUser('Bob');

      const { data, error } = await userB.client
        .from('profiles')
        .select('*')
        .eq('id', userA.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('user can update own profile', async () => {
      const { id, client } = await newUser('Alice');

      const { error } = await client
        .from('profiles')
        .update({ display_name: 'Alice Updated', position: 'POR' })
        .eq('id', id);

      expect(error).toBeNull();

      const { data } = await client.from('profiles').select('*').eq('id', id).single();
      expect(data?.display_name).toBe('Alice Updated');
      expect(data?.position).toBe('POR');
    });

    it('user cannot update other profile', async () => {
      const userA = await newUser('Alice');
      const userB = await newUser('Bob');

      const { error: updateError } = await userB.client
        .from('profiles')
        .update({ display_name: 'Hacked' })
        .eq('id', userA.id);

      expect(updateError).toBeNull();

      const { data } = await userA.client
        .from('profiles')
        .select('display_name')
        .eq('id', userA.id)
        .single();

      expect(data?.display_name).toBe('Alice');
    });

    it('anon cannot read profiles', async () => {
      const anonClient = anon();
      const { data } = await anonClient.from('profiles').select('*');

      expect(data).toHaveLength(0);
    });
  });

  describe('groups', () => {
    it('create_group returns uuid, creator is admin', async () => {
      const userA = await newUser('Alice');

      const { data, error } = await userA.client.rpc('create_group', {
        p_name: 'Test Group',
      });

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(typeof data).toBe('string');

      const groupId = data as string;
      const { data: group } = await userA.client
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      expect(group?.name).toBe('Test Group');
      expect(group?.invite_code).toMatch(/^[A-Z0-9]{8}$/);

      const { data: member } = await userA.client
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', userA.id)
        .single();

      expect(member?.role).toBe('admin');
    });

    it('create_group validates name length', async () => {
      const userA = await newUser('Alice');

      const { error: error1 } = await userA.client.rpc('create_group', {
        p_name: 'A',
      });
      expect(error1?.message).toContain('INVALID_INPUT');

      const { error: error2 } = await userA.client.rpc('create_group', {
        p_name: 'x'.repeat(41),
      });
      expect(error2?.message).toContain('INVALID_INPUT');
    });

    it('non-member cannot see group', async () => {
      const userA = await newUser('Alice');
      const userB = await newUser('Bob');

      const { data: groupId } = await userA.client.rpc('create_group', {
        p_name: 'Alice Group',
      });

      const { data, error } = await userB.client
        .from('groups')
        .select('*')
        .eq('id', groupId);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('anon cannot read groups', async () => {
      const anonClient = anon();
      const { data } = await anonClient.from('groups').select('*');

      expect(data).toHaveLength(0);
    });
  });

  describe('group_members', () => {
    it('anon cannot read group_members', async () => {
      const anonClient = anon();
      const { data } = await anonClient.from('group_members').select('*');

      expect(data).toHaveLength(0);
    });

    it('direct insert into group_members fails', async () => {
      const userA = await newUser('Alice');

      const { data: groupId } = await userA.client.rpc('create_group', {
        p_name: 'Alice Group',
      });

      const { error } = await userA.client
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userA.id,
          role: 'admin',
        });

      expect(error).not.toBeNull();
    });

    it('member cannot see other members before joining', async () => {
      const userA = await newUser('Alice');
      const userB = await newUser('Bob');

      const { data: groupId } = await userA.client.rpc('create_group', {
        p_name: 'Alice Group',
      });

      const { data, error } = await userB.client
        .from('group_members')
        .select('*')
        .eq('group_id', groupId);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });
  });

  describe('join_group', () => {
    it('join_group with valid code unites as member', async () => {
      const userA = await newUser('Alice');
      const userB = await newUser('Bob');

      const { data: groupId } = await userA.client.rpc('create_group', {
        p_name: 'Alice Group',
      });

      const { data: group } = await userA.client
        .from('groups')
        .select('invite_code')
        .eq('id', groupId)
        .single();

      const { error } = await userB.client.rpc('join_group', {
        p_code: group?.invite_code,
      });

      expect(error).toBeNull();

      const { data: members } = await userB.client
        .from('group_members')
        .select('*')
        .eq('group_id', groupId);

      expect(members).toHaveLength(2);
      const bobMember = members?.find((m) => m.user_id === userB.id);
      expect(bobMember?.role).toBe('member');
    });

    it('join_group case-insensitive', async () => {
      const userA = await newUser('Alice');
      const userB = await newUser('Bob');

      const { data: groupId } = await userA.client.rpc('create_group', {
        p_name: 'Alice Group',
      });

      const { data: group } = await userA.client
        .from('groups')
        .select('invite_code')
        .eq('id', groupId)
        .single();

      const lowerCode = group?.invite_code?.toLowerCase();

      const { error } = await userB.client.rpc('join_group', {
        p_code: lowerCode,
      });

      expect(error).toBeNull();
    });

    it('join_group idempotent', async () => {
      const userA = await newUser('Alice');
      const userB = await newUser('Bob');

      const { data: groupId } = await userA.client.rpc('create_group', {
        p_name: 'Alice Group',
      });

      const { data: group } = await userA.client
        .from('groups')
        .select('invite_code')
        .eq('id', groupId)
        .single();

      await userB.client.rpc('join_group', {
        p_code: group?.invite_code,
      });

      const { error: error2, data: data2 } = await userB.client.rpc('join_group', {
        p_code: group?.invite_code,
      });

      expect(error2).toBeNull();
      expect(data2).toBe(groupId);
    });

    it('join_group with invalid code gives INVALID_CODE', async () => {
      const userB = await newUser('Bob');

      const { error: joinError } = await userB.client.rpc('join_group', {
        p_code: 'BADCODE1',
      });

      expect(joinError?.message).toContain('INVALID_CODE');
    });

    it('after join_group, user can see group and other profile', async () => {
      const userA = await newUser('Alice');
      const userB = await newUser('Bob');

      const { data: groupId } = await userA.client.rpc('create_group', {
        p_name: 'Alice Group',
      });

      const { data: group } = await userA.client
        .from('groups')
        .select('invite_code')
        .eq('id', groupId)
        .single();

      await userB.client.rpc('join_group', {
        p_code: group?.invite_code,
      });

      const { data: seenGroup } = await userB.client
        .from('groups')
        .select('*')
        .eq('id', groupId);

      expect(seenGroup).toHaveLength(1);

      const { data: seenProfile } = await userB.client
        .from('profiles')
        .select('*')
        .eq('id', userA.id);

      expect(seenProfile).toHaveLength(1);
      expect(seenProfile?.[0].display_name).toBe('Alice');
    });
  });

  describe('group updates', () => {
    it('non-admin cannot update group name', async () => {
      const userA = await newUser('Alice');
      const userB = await newUser('Bob');

      const { data: groupId } = await userA.client.rpc('create_group', {
        p_name: 'Alice Group',
      });

      const { data: group } = await userA.client
        .from('groups')
        .select('invite_code')
        .eq('id', groupId)
        .single();

      await userB.client.rpc('join_group', {
        p_code: group?.invite_code,
      });

      const { error: updateError } = await userB.client
        .from('groups')
        .update({ name: 'Hacked Group' })
        .eq('id', groupId);

      expect(updateError).toBeNull();

      const { data: checkName } = await userA.client
        .from('groups')
        .select('name')
        .eq('id', groupId)
        .single();

      expect(checkName?.name).toBe('Alice Group');
    });

    it('admin can update group name', async () => {
      const userA = await newUser('Alice');

      const { data: groupId } = await userA.client.rpc('create_group', {
        p_name: 'Alice Group',
      });

      const { error } = await userA.client
        .from('groups')
        .update({ name: 'New Group Name' })
        .eq('id', groupId);

      expect(error).toBeNull();

      const { data: checkName } = await userA.client
        .from('groups')
        .select('name')
        .eq('id', groupId)
        .single();

      expect(checkName?.name).toBe('New Group Name');
    });
  });

  describe('remove_member', () => {
    it('non-admin cannot remove member', async () => {
      const userA = await newUser('Alice');
      const userB = await newUser('Bob');
      const userC = await newUser('Charlie');

      const { data: groupId } = await userA.client.rpc('create_group', {
        p_name: 'Alice Group',
      });

      const { data: group } = await userA.client
        .from('groups')
        .select('invite_code')
        .eq('id', groupId)
        .single();

      await userB.client.rpc('join_group', {
        p_code: group?.invite_code,
      });

      await userC.client.rpc('join_group', {
        p_code: group?.invite_code,
      });

      const { error } = await userB.client.rpc('remove_member', {
        p_group_id: groupId,
        p_user_id: userC.id,
      });

      expect(error?.message).toContain('NOT_ALLOWED');
    });

    it('admin can remove member', async () => {
      const userA = await newUser('Alice');
      const userB = await newUser('Bob');

      const { data: groupId } = await userA.client.rpc('create_group', {
        p_name: 'Alice Group',
      });

      const { data: group } = await userA.client
        .from('groups')
        .select('invite_code')
        .eq('id', groupId)
        .single();

      await userB.client.rpc('join_group', {
        p_code: group?.invite_code,
      });

      const { error } = await userA.client.rpc('remove_member', {
        p_group_id: groupId,
        p_user_id: userB.id,
      });

      expect(error).toBeNull();

      const { data: members } = await userA.client
        .from('group_members')
        .select('*')
        .eq('group_id', groupId);

      expect(members).toHaveLength(1);
    });
  });

  describe('set_member_role', () => {
    it('non-admin cannot set role', async () => {
      const userA = await newUser('Alice');
      const userB = await newUser('Bob');
      const userC = await newUser('Charlie');

      const { data: groupId } = await userA.client.rpc('create_group', {
        p_name: 'Alice Group',
      });

      const { data: group } = await userA.client
        .from('groups')
        .select('invite_code')
        .eq('id', groupId)
        .single();

      await userB.client.rpc('join_group', {
        p_code: group?.invite_code,
      });

      await userC.client.rpc('join_group', {
        p_code: group?.invite_code,
      });

      const { error } = await userB.client.rpc('set_member_role', {
        p_group_id: groupId,
        p_user_id: userC.id,
        p_role: 'admin',
      });

      expect(error?.message).toContain('NOT_ALLOWED');
    });

    it('admin can promote member to admin', async () => {
      const userA = await newUser('Alice');
      const userB = await newUser('Bob');

      const { data: groupId } = await userA.client.rpc('create_group', {
        p_name: 'Alice Group',
      });

      const { data: group } = await userA.client
        .from('groups')
        .select('invite_code')
        .eq('id', groupId)
        .single();

      await userB.client.rpc('join_group', {
        p_code: group?.invite_code,
      });

      const { error } = await userA.client.rpc('set_member_role', {
        p_group_id: groupId,
        p_user_id: userB.id,
        p_role: 'admin',
      });

      expect(error).toBeNull();

      const { data: member } = await userA.client
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', userB.id)
        .single();

      expect(member?.role).toBe('admin');
    });

    it('cannot demote to member if only admin', async () => {
      const userA = await newUser('Alice');
      const userB = await newUser('Bob');

      const { data: groupId } = await userA.client.rpc('create_group', {
        p_name: 'Alice Group',
      });

      const { data: group } = await userA.client
        .from('groups')
        .select('invite_code')
        .eq('id', groupId)
        .single();

      await userB.client.rpc('join_group', {
        p_code: group?.invite_code,
      });

      const { error } = await userA.client.rpc('set_member_role', {
        p_group_id: groupId,
        p_user_id: userA.id,
        p_role: 'member',
      });

      expect(error?.message).toContain('LAST_ADMIN');
    });
  });

  describe('leave_group', () => {
    it('regular member can leave group', async () => {
      const userA = await newUser('Alice');
      const userB = await newUser('Bob');

      const { data: groupId } = await userA.client.rpc('create_group', {
        p_name: 'Alice Group',
      });

      const { data: group } = await userA.client
        .from('groups')
        .select('invite_code')
        .eq('id', groupId)
        .single();

      await userB.client.rpc('join_group', {
        p_code: group?.invite_code,
      });

      const { error } = await userB.client.rpc('leave_group', {
        p_group_id: groupId,
      });

      expect(error).toBeNull();

      const { data: members } = await userA.client
        .from('group_members')
        .select('*')
        .eq('group_id', groupId);

      expect(members).toHaveLength(1);
      expect(members?.[0].user_id).toBe(userA.id);

      const { data: leftGroup } = await userB.client
        .from('groups')
        .select('*')
        .eq('id', groupId);

      expect(leftGroup).toHaveLength(0);
    });

    it('last admin cannot leave if other members exist', async () => {
      const userA = await newUser('Alice');
      const userB = await newUser('Bob');

      const { data: groupId } = await userA.client.rpc('create_group', {
        p_name: 'Alice Group',
      });

      const { data: group } = await userA.client
        .from('groups')
        .select('invite_code')
        .eq('id', groupId)
        .single();

      await userB.client.rpc('join_group', {
        p_code: group?.invite_code,
      });

      const { error } = await userA.client.rpc('leave_group', {
        p_group_id: groupId,
      });

      expect(error?.message).toContain('LAST_ADMIN');

      const { data: members } = await userA.client
        .from('group_members')
        .select('*')
        .eq('group_id', groupId);

      expect(members).toHaveLength(2);
    });

    it('last admin can leave if they are the only member', async () => {
      const userA = await newUser('Alice');

      const { data: groupId } = await userA.client.rpc('create_group', {
        p_name: 'Alice Group',
      });

      const { error } = await userA.client.rpc('leave_group', {
        p_group_id: groupId,
      });

      expect(error).toBeNull();

      const { data: groups } = await userA.client
        .from('groups')
        .select('*')
        .eq('id', groupId);

      expect(groups).toHaveLength(0);
    });

    it('after leave_group, user cannot see group', async () => {
      const userA = await newUser('Alice');
      const userB = await newUser('Bob');

      const { data: groupId } = await userA.client.rpc('create_group', {
        p_name: 'Alice Group',
      });

      const { data: group } = await userA.client
        .from('groups')
        .select('invite_code')
        .eq('id', groupId)
        .single();

      await userB.client.rpc('join_group', {
        p_code: group?.invite_code,
      });

      await userB.client.rpc('leave_group', {
        p_group_id: groupId,
      });

      const { data: leftGroup } = await userB.client
        .from('groups')
        .select('*')
        .eq('id', groupId);

      expect(leftGroup).toHaveLength(0);
    });
  });
});
