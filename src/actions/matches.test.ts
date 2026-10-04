import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import {
  createMatch,
  updateMatch,
  cancelMatch,
  setAttendance,
  assignTeams,
  finalizeMatch,
  voteMvp,
} from "./matches";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockGroupId = "550e8400-e29b-41d4-a716-446655440000";
const mockMatchId = "660e8400-e29b-41d4-a716-446655440000";
const mockUserId = "770e8400-e29b-41d4-a716-446655440000";
const mockVotedId = "880e8400-e29b-41d4-a716-446655440000";

function createMockSupabaseClient() {
  return {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  };
}

describe("matches actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createMatch", () => {
    it("rejects invalid date in the past", async () => {
      const pastDate = new Date(Date.now() - 86400000); // 1 day ago
      const result = await createMatch({
        groupId: mockGroupId,
        scheduled_at: pastDate,
        location: "Cancha Local",
        players_per_team: 5,
      });

      expect(result).toEqual({
        ok: false,
        error: expect.stringContaining("todavía no pasó"),
      });
    });

    it("rejects invalid uuid for groupId", async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const result = await createMatch({
        groupId: "not-a-uuid",
        scheduled_at: futureDate,
        location: "Cancha Local",
        players_per_team: 5,
      });

      expect(result).toEqual({
        ok: false,
        error: "El grupo no es válido.",
      });
    });

    it("fails when user is not logged in", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const mockClient = createMockSupabaseClient();
      mockClient.auth.getUser.mockResolvedValue({ data: { user: null } });
      (createClient as unknown as Mock).mockResolvedValue(mockClient);

      const futureDate = new Date(Date.now() + 86400000);
      const result = await createMatch({
        groupId: mockGroupId,
        scheduled_at: futureDate,
        location: "Cancha Local",
        players_per_team: 5,
      });

      expect(result).toEqual({
        ok: false,
        error: "Tenés que ingresar para hacer esto.",
      });
    });

    it("handles database error with mapDbError", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const mockClient = createMockSupabaseClient();
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "NOT_ALLOWED" },
          }),
        }),
      });

      mockClient.from.mockReturnValue({ insert: mockInsert } as unknown);
      (createClient as unknown as Mock).mockResolvedValue(mockClient);

      const futureDate = new Date(Date.now() + 86400000);
      const result = await createMatch({
        groupId: mockGroupId,
        scheduled_at: futureDate,
        location: "Cancha Local",
        players_per_team: 5,
      });

      expect(result).toEqual({
        ok: false,
        error: "No tenés permiso para hacer esto.",
      });
    });

    it("successfully creates a match and returns redirectTo", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { revalidatePath: rp } = await import("next/cache");
      const mockClient = createMockSupabaseClient();
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: mockMatchId },
            error: null,
          }),
        }),
      });

      mockClient.from.mockReturnValue({ insert: mockInsert } as unknown);
      (createClient as unknown as Mock).mockResolvedValue(mockClient);

      const futureDate = new Date(Date.now() + 86400000);
      const result = await createMatch({
        groupId: mockGroupId,
        scheduled_at: futureDate,
        location: "Cancha Local",
        players_per_team: 5,
      });

      expect(result).toEqual({
        ok: true,
        data: {
          matchId: mockMatchId,
          redirectTo: `/g/${mockGroupId}/partidos/${mockMatchId}`,
        },
      });

      expect(mockInsert).toHaveBeenCalledWith({
        group_id: mockGroupId,
        scheduled_at: expect.any(String),
        location: "Cancha Local",
        players_per_team: 5,
      });

      expect(rp).toHaveBeenCalledWith(
        `/g/${mockGroupId}/partidos/${mockMatchId}`
      );
      expect(rp).toHaveBeenCalledWith(`/g/${mockGroupId}/partidos`);
      expect(rp).toHaveBeenCalledWith(`/g/${mockGroupId}`);
    });
  });

  describe("updateMatch", () => {
    it("fails when user is not logged in", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const mockClient = createMockSupabaseClient();
      mockClient.auth.getUser.mockResolvedValue({ data: { user: null } });
      (createClient as unknown as Mock).mockResolvedValue(mockClient);

      const futureDate = new Date(Date.now() + 86400000);
      const result = await updateMatch({
        matchId: mockMatchId,
        groupId: mockGroupId,
        scheduled_at: futureDate,
      });

      expect(result).toEqual({
        ok: false,
        error: "Tenés que ingresar para hacer esto.",
      });
    });

    it("successfully updates a match", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { revalidatePath: rp } = await import("next/cache");
      const mockClient = createMockSupabaseClient();
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockClient.from.mockReturnValue({ update: mockUpdate } as unknown);
      (createClient as unknown as Mock).mockResolvedValue(mockClient);

      const futureDate = new Date(Date.now() + 86400000);
      const result = await updateMatch({
        matchId: mockMatchId,
        groupId: mockGroupId,
        scheduled_at: futureDate,
        location: "Cancha Nueva",
      });

      expect(result).toEqual({ ok: true, data: undefined });
      expect(rp).toHaveBeenCalledWith(
        `/g/${mockGroupId}/partidos/${mockMatchId}`
      );
    });
  });

  describe("cancelMatch", () => {
    it("successfully cancels a match", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const mockClient = createMockSupabaseClient();
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockClient.from.mockReturnValue({ update: mockUpdate } as unknown);
      (createClient as unknown as Mock).mockResolvedValue(mockClient);

      const result = await cancelMatch({
        matchId: mockMatchId,
        groupId: mockGroupId,
      });

      expect(result).toEqual({ ok: true, data: undefined });
      expect(mockUpdate).toHaveBeenCalledWith({ status: "cancelado" });
    });
  });

  describe("setAttendance", () => {
    it("sets attendance to confirmado", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { revalidatePath: rp } = await import("next/cache");
      const mockClient = createMockSupabaseClient();
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
      });

      mockClient.rpc.mockResolvedValue({ error: null });
      (createClient as unknown as Mock).mockResolvedValue(mockClient);

      const result = await setAttendance({
        matchId: mockMatchId,
        groupId: mockGroupId,
        status: "confirmado",
      });

      expect(result).toEqual({ ok: true, data: undefined });
      expect(mockClient.rpc).toHaveBeenCalledWith("set_attendance", {
        p_match_id: mockMatchId,
        p_status: "confirmado",
      });
      expect(rp).toHaveBeenCalledWith(
        `/g/${mockGroupId}/partidos/${mockMatchId}`
      );
    });

    it("maps MATCH_FULL error correctly", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const mockClient = createMockSupabaseClient();
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
      });

      mockClient.rpc.mockResolvedValue({
        error: { message: "MATCH_FULL" },
      });
      (createClient as unknown as Mock).mockResolvedValue(mockClient);

      const result = await setAttendance({
        matchId: mockMatchId,
        groupId: mockGroupId,
        status: "confirmado",
      });

      expect(result).toEqual({
        ok: false,
        error: "El partido ya está completo.",
      });
    });
  });

  describe("assignTeams", () => {
    it("assigns teams to players", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const mockClient = createMockSupabaseClient();
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
      });

      mockClient.rpc.mockResolvedValue({ error: null });
      (createClient as unknown as Mock).mockResolvedValue(mockClient);

      const assignments = [
        { user_id: mockUserId, team: "A" as const },
        { user_id: mockVotedId, team: "B" as const },
      ];

      const result = await assignTeams({
        matchId: mockMatchId,
        groupId: mockGroupId,
        assignments,
      });

      expect(result).toEqual({ ok: true, data: undefined });
      expect(mockClient.rpc).toHaveBeenCalledWith("assign_teams", {
        p_match_id: mockMatchId,
        p_assignments: assignments,
      });
    });
  });

  describe("finalizeMatch", () => {
    it("rejects when assists exceed goals", async () => {
      const result = await finalizeMatch({
        matchId: mockMatchId,
        groupId: mockGroupId,
        score_a: 2,
        score_b: 1,
        stats: [
          { user_id: mockUserId, team: "A", goals: 1, assists: 3 },
          { user_id: mockVotedId, team: "B", goals: 1, assists: 0 },
        ],
      });

      expect(result).toEqual({
        ok: false,
        error: "Las asistencias no pueden superar los goles.",
      });
    });

    it("does not include team field in p_stats for RPC", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const mockClient = createMockSupabaseClient();
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
      });

      mockClient.rpc.mockResolvedValue({ error: null });
      (createClient as unknown as Mock).mockResolvedValue(mockClient);

      const result = await finalizeMatch({
        matchId: mockMatchId,
        groupId: mockGroupId,
        score_a: 2,
        score_b: 1,
        stats: [
          { user_id: mockUserId, team: "A", goals: 2, assists: 0 },
          { user_id: mockVotedId, team: "B", goals: 1, assists: 0 },
        ],
      });

      expect(result).toEqual({ ok: true, data: undefined });

      const rpcCall = mockClient.rpc.mock.calls[0];
      expect(rpcCall[1].p_stats).toEqual([
        { user_id: mockUserId, goals: 2, assists: 0 },
        { user_id: mockVotedId, goals: 1, assists: 0 },
      ]);

      // Ensure team field is not in p_stats
      rpcCall[1].p_stats.forEach((stat: Record<string, unknown>) => {
        expect(stat).not.toHaveProperty("team");
      });
    });

    it("successfully finalizes a match", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { revalidatePath: rp } = await import("next/cache");
      const mockClient = createMockSupabaseClient();
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
      });

      mockClient.rpc.mockResolvedValue({ error: null });
      (createClient as unknown as Mock).mockResolvedValue(mockClient);

      const result = await finalizeMatch({
        matchId: mockMatchId,
        groupId: mockGroupId,
        score_a: 3,
        score_b: 2,
        stats: [
          { user_id: mockUserId, team: "A", goals: 2, assists: 1 },
          { user_id: mockVotedId, team: "B", goals: 2, assists: 0 },
        ],
      });

      expect(result).toEqual({ ok: true, data: undefined });
      expect(mockClient.rpc).toHaveBeenCalledWith("finalize_match", {
        p_match_id: mockMatchId,
        p_score_a: 3,
        p_score_b: 2,
        p_stats: [
          { user_id: mockUserId, goals: 2, assists: 1 },
          { user_id: mockVotedId, goals: 2, assists: 0 },
        ],
      });
      expect(rp).toHaveBeenCalledWith(
        `/g/${mockGroupId}/partidos/${mockMatchId}`
      );
    });

    it("maps INVALID_RESULT error correctly", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const mockClient = createMockSupabaseClient();
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
      });

      mockClient.rpc.mockResolvedValue({
        error: { message: "INVALID_RESULT" },
      });
      (createClient as unknown as Mock).mockResolvedValue(mockClient);

      const result = await finalizeMatch({
        matchId: mockMatchId,
        groupId: mockGroupId,
        score_a: 3,
        score_b: 2,
        stats: [
          { user_id: mockUserId, team: "A", goals: 2, assists: 0 },
          { user_id: mockVotedId, team: "B", goals: 2, assists: 0 },
        ],
      });

      expect(result).toEqual({
        ok: false,
        error: "El resultado no cierra: revisá goles y asistencias.",
      });
    });
  });

  describe("voteMvp", () => {
    it("maps VOTING_CLOSED error correctly", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const mockClient = createMockSupabaseClient();
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
      });

      mockClient.rpc.mockResolvedValue({
        error: { message: "VOTING_CLOSED" },
      });
      (createClient as unknown as Mock).mockResolvedValue(mockClient);

      const result = await voteMvp({
        matchId: mockMatchId,
        groupId: mockGroupId,
        votedId: mockVotedId,
      });

      expect(result).toEqual({
        ok: false,
        error: "La votación del MVP ya cerró.",
      });
    });

    it("successfully votes for MVP", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { revalidatePath: rp } = await import("next/cache");
      const mockClient = createMockSupabaseClient();
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
      });

      mockClient.rpc.mockResolvedValue({ error: null });
      (createClient as unknown as Mock).mockResolvedValue(mockClient);

      const result = await voteMvp({
        matchId: mockMatchId,
        groupId: mockGroupId,
        votedId: mockVotedId,
      });

      expect(result).toEqual({ ok: true, data: undefined });
      expect(mockClient.rpc).toHaveBeenCalledWith("vote_mvp", {
        p_match_id: mockMatchId,
        p_voted_id: mockVotedId,
      });
      expect(rp).toHaveBeenCalledWith(
        `/g/${mockGroupId}/partidos/${mockMatchId}`
      );
    });

    it("does not expose raw error messages for unknown errors", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const mockClient = createMockSupabaseClient();
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
      });

      mockClient.rpc.mockResolvedValue({
        error: { message: "duplicate key violates constraint" },
      });
      (createClient as unknown as Mock).mockResolvedValue(mockClient);

      const result = await voteMvp({
        matchId: mockMatchId,
        groupId: mockGroupId,
        votedId: mockVotedId,
      });

      expect(result).toEqual({
        ok: false,
        error: "Algo salió mal. Probá de nuevo.",
      });
      if (result.ok === false) {
        expect(result.error).not.toContain("duplicate");
        expect(result.error).not.toContain("constraint");
      }
    });
  });
});
