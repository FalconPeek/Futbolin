import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createGroup,
  joinGroup,
  leaveGroup,
  removeMember,
  setMemberRole,
} from "./groups";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const GROUP_ID = "550e8400-e29b-41d4-a716-446655440000";
const USER_ID = "550e8400-e29b-41d4-a716-446655440001";
const NOT_SIGNED_IN = "Tenés que ingresar para hacer esto.";
const INVALID_DATA = "Revisá los datos e intentá de nuevo.";

type RpcResult = {
  data: string | null;
  error: { message: string } | null;
};

function setupClient({
  user = { id: USER_ID } as { id: string } | null,
  rpcResult = { data: null, error: null } as RpcResult,
} = {}) {
  const fake = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    rpc: vi.fn().mockResolvedValue(rpcResult),
  };
  vi.mocked(createClient).mockResolvedValue(
    fake as unknown as Awaited<ReturnType<typeof createClient>>,
  );
  return fake;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createGroup", () => {
  it("rechaza un nombre inválido sin tocar la base", async () => {
    const fake = setupClient();

    const result = await createGroup({ name: "a" });

    expect(result).toEqual({
      ok: false,
      error: "El nombre del grupo tiene que tener entre 2 y 40 caracteres.",
    });
    expect(createClient).not.toHaveBeenCalled();
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("rechaza sin usuario sin llamar al RPC", async () => {
    const fake = setupClient({ user: null });

    const result = await createGroup({ name: "Los pibes" });

    expect(result).toEqual({ ok: false, error: NOT_SIGNED_IN });
    expect(fake.rpc).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("mapea los errores de la base", async () => {
    setupClient({
      rpcResult: { data: null, error: { message: "INVALID_INPUT" } },
    });

    const result = await createGroup({ name: "Los pibes" });

    expect(result).toEqual({ ok: false, error: INVALID_DATA });
  });

  it("crea el grupo y devuelve la ruta del grupo", async () => {
    const fake = setupClient({ rpcResult: { data: GROUP_ID, error: null } });

    const result = await createGroup({ name: "  Los pibes  " });

    expect(result).toEqual({
      ok: true,
      data: { groupId: GROUP_ID, redirectTo: `/g/${GROUP_ID}` },
    });
    expect(fake.rpc).toHaveBeenCalledWith("create_group", {
      p_name: "Los pibes",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/grupos");
  });
});

describe("joinGroup", () => {
  it("rechaza un código con formato inválido sin tocar la base", async () => {
    const fake = setupClient();

    const result = await joinGroup({ code: "XYZ" });

    expect(result).toEqual({
      ok: false,
      error: "El código de invitación no es válido.",
    });
    expect(createClient).not.toHaveBeenCalled();
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("rechaza sin usuario sin llamar al RPC", async () => {
    const fake = setupClient({ user: null });

    const result = await joinGroup({ code: "ABCD2345" });

    expect(result).toEqual({ ok: false, error: NOT_SIGNED_IN });
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("mapea INVALID_CODE", async () => {
    setupClient({
      rpcResult: { data: null, error: { message: "INVALID_CODE" } },
    });

    const result = await joinGroup({ code: "ABCD2345" });

    expect(result).toEqual({
      ok: false,
      error:
        "El link de invitación no es válido. Pedile uno nuevo a un admin del grupo.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("se une con el código normalizado y devuelve la ruta del grupo", async () => {
    const fake = setupClient({ rpcResult: { data: GROUP_ID, error: null } });

    const result = await joinGroup({ code: "abcd2345" });

    expect(result).toEqual({
      ok: true,
      data: { groupId: GROUP_ID, redirectTo: `/g/${GROUP_ID}` },
    });
    expect(fake.rpc).toHaveBeenCalledWith("join_group", { p_code: "ABCD2345" });
    expect(revalidatePath).toHaveBeenCalledWith("/grupos");
  });
});

describe("leaveGroup", () => {
  it("rechaza un id de grupo inválido sin tocar la base", async () => {
    const fake = setupClient();

    const result = await leaveGroup({ groupId: "no-es-uuid" });

    expect(result).toEqual({ ok: false, error: INVALID_DATA });
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("rechaza sin usuario sin llamar al RPC", async () => {
    const fake = setupClient({ user: null });

    const result = await leaveGroup({ groupId: GROUP_ID });

    expect(result).toEqual({ ok: false, error: NOT_SIGNED_IN });
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("mapea LAST_ADMIN", async () => {
    setupClient({
      rpcResult: { data: null, error: { message: "LAST_ADMIN" } },
    });

    const result = await leaveGroup({ groupId: GROUP_ID });

    expect(result).toEqual({
      ok: false,
      error: "Sos el único admin. Nombrá otro admin antes de salir.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("sale del grupo y vuelve a la lista de grupos", async () => {
    const fake = setupClient();

    const result = await leaveGroup({ groupId: GROUP_ID });

    expect(result).toEqual({ ok: true, data: { redirectTo: "/grupos" } });
    expect(fake.rpc).toHaveBeenCalledWith("leave_group", {
      p_group_id: GROUP_ID,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/grupos");
  });
});

describe("removeMember", () => {
  it("rechaza ids inválidos sin tocar la base", async () => {
    const fake = setupClient();

    const badGroup = await removeMember({ groupId: "x", userId: USER_ID });
    const badUser = await removeMember({ groupId: GROUP_ID, userId: "x" });

    expect(badGroup).toEqual({ ok: false, error: INVALID_DATA });
    expect(badUser).toEqual({ ok: false, error: INVALID_DATA });
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("rechaza sin usuario sin llamar al RPC", async () => {
    const fake = setupClient({ user: null });

    const result = await removeMember({ groupId: GROUP_ID, userId: USER_ID });

    expect(result).toEqual({ ok: false, error: NOT_SIGNED_IN });
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("mapea NOT_ALLOWED", async () => {
    setupClient({
      rpcResult: { data: null, error: { message: "NOT_ALLOWED" } },
    });

    const result = await removeMember({ groupId: GROUP_ID, userId: USER_ID });

    expect(result).toEqual({
      ok: false,
      error: "No tenés permiso para hacer esto.",
    });
  });

  it("quita al miembro y revalida la lista de miembros", async () => {
    const fake = setupClient();

    const result = await removeMember({ groupId: GROUP_ID, userId: USER_ID });

    expect(result).toEqual({ ok: true, data: null });
    expect(fake.rpc).toHaveBeenCalledWith("remove_member", {
      p_group_id: GROUP_ID,
      p_user_id: USER_ID,
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/g/${GROUP_ID}/miembros`);
  });
});

describe("setMemberRole", () => {
  it("rechaza ids o rol inválidos sin tocar la base", async () => {
    const fake = setupClient();

    const badGroup = await setMemberRole({
      groupId: "x",
      userId: USER_ID,
      role: "admin",
    });
    const badUser = await setMemberRole({
      groupId: GROUP_ID,
      userId: "x",
      role: "admin",
    });
    const badRole = await setMemberRole({
      groupId: GROUP_ID,
      userId: USER_ID,
      role: "owner" as "admin",
    });

    expect(badGroup).toEqual({ ok: false, error: INVALID_DATA });
    expect(badUser).toEqual({ ok: false, error: INVALID_DATA });
    expect(badRole).toEqual({ ok: false, error: INVALID_DATA });
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("rechaza sin usuario sin llamar al RPC", async () => {
    const fake = setupClient({ user: null });

    const result = await setMemberRole({
      groupId: GROUP_ID,
      userId: USER_ID,
      role: "member",
    });

    expect(result).toEqual({ ok: false, error: NOT_SIGNED_IN });
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("mapea LAST_ADMIN al degradar al último admin", async () => {
    setupClient({
      rpcResult: { data: null, error: { message: "LAST_ADMIN" } },
    });

    const result = await setMemberRole({
      groupId: GROUP_ID,
      userId: USER_ID,
      role: "member",
    });

    expect(result).toEqual({
      ok: false,
      error: "Sos el único admin. Nombrá otro admin antes de salir.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("cambia el rol y revalida la lista de miembros", async () => {
    const fake = setupClient();

    const result = await setMemberRole({
      groupId: GROUP_ID,
      userId: USER_ID,
      role: "admin",
    });

    expect(result).toEqual({ ok: true, data: null });
    expect(fake.rpc).toHaveBeenCalledWith("set_member_role", {
      p_group_id: GROUP_ID,
      p_user_id: USER_ID,
      p_role: "admin",
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/g/${GROUP_ID}/miembros`);
  });
});
