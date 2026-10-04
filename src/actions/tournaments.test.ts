import { describe, it, expect, vi, beforeEach } from "vitest";
import { ERROR_MESSAGES } from "@/lib/result";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import {
  createTournament,
  renameTournament,
  addTeam,
  updateTeam,
  removeTeam,
  startTournament,
  reportTournamentResult,
} from "./tournaments";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const mockRevalidatePath = vi.mocked(revalidatePath);
const mockCreateClient = vi.mocked(createClient);

function createMockClient(overrides?: Record<string, unknown>) {
  const mockFrom = vi.fn();
  const mockRpc = vi.fn();
  const mockGetUser = vi.fn();

  const chainable = () => {
    const chain = {
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      select: vi.fn(),
    };

    chain.insert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi
          .fn()
          .mockResolvedValue(
            (overrides?.insertResult as unknown) ?? { data: null, error: null }
          ),
      }),
    });

    chain.select.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi
          .fn()
          .mockResolvedValue(
            (overrides?.selectResult as unknown) ?? { data: null, error: null }
          ),
      }),
    });

    chain.update.mockReturnValue({
      eq: vi
        .fn()
        .mockResolvedValue((overrides?.updateResult as unknown) ?? { data: null, error: null }),
    });

    chain.delete.mockReturnValue({
      eq: vi
        .fn()
        .mockResolvedValue((overrides?.deleteResult as unknown) ?? { data: null, error: null }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return chain as any;
  };

  mockFrom.mockImplementation(chainable);
  mockRpc.mockResolvedValue((overrides?.rpcResult as unknown) ?? { data: null, error: null });
  mockGetUser.mockResolvedValue(
    (overrides?.getUser as unknown) ?? {
      data: { user: { id: "user-123", email: "test@example.com" } },
    }
  );

  return {
    from: mockFrom,
    rpc: mockRpc,
    auth: { getUser: mockGetUser },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("tournaments actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTournament", () => {
    it("should create a tournament successfully", async () => {
      const mockClient = createMockClient({
        insertResult: { data: { id: "tournament-1" }, error: null },
      });
      mockCreateClient.mockResolvedValue(mockClient);

      const result = await createTournament({
        groupId: "group-1",
        name: "Copa del Grupo",
        format: "liga",
        legs: 1,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.tournamentId).toBe("tournament-1");
        expect(result.data.redirectTo).toBe(
          "/g/group-1/torneos/tournament-1/equipos"
        );
      }
      expect(mockRevalidatePath).toHaveBeenCalled();
    });

    it("should fail with invalid name", async () => {
      const mockClient = createMockClient();
      mockCreateClient.mockResolvedValue(mockClient);

      const result = await createTournament({
        groupId: "group-1",
        name: "X",
        format: "liga",
        legs: 1,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("entre 2 y 60");
      }
    });

    it("should fail without user", async () => {
      const mockClient = createMockClient({
        getUser: { data: { user: null } },
      });
      mockCreateClient.mockResolvedValue(mockClient);

      const result = await createTournament({
        groupId: "group-1",
        name: "Copa",
        format: "liga",
        legs: 1,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("ingresar");
      }
    });
  });

  describe("renameTournament", () => {
    it("should rename tournament successfully", async () => {
      const mockClient = createMockClient({
        updateResult: { data: null, error: null },
      });
      mockCreateClient.mockResolvedValue(mockClient);

      const result = await renameTournament({
        tournamentId: "tournament-1",
        groupId: "group-1",
        name: "Nueva Copa",
      });

      expect(result.ok).toBe(true);
      expect(mockRevalidatePath).toHaveBeenCalled();
    });
  });

  describe("addTeam", () => {
    it("should add a team successfully", async () => {
      const mockClient = createMockClient({
        insertResult: { data: { id: "team-1" }, error: null },
      });
      mockCreateClient.mockResolvedValue(mockClient);

      const result = await addTeam({
        tournamentId: "tournament-1",
        groupId: "group-1",
        name: "Los Messi",
        color: "#FF0000",
      });

      expect(result.ok).toBe(true);
      expect(mockRevalidatePath).toHaveBeenCalled();
    });

    it("should fail with invalid color", async () => {
      const mockClient = createMockClient();
      mockCreateClient.mockResolvedValue(mockClient);

      const result = await addTeam({
        tournamentId: "tournament-1",
        groupId: "group-1",
        name: "Los Messi",
        color: "invalid",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("color");
      }
    });
  });

  describe("updateTeam", () => {
    it("should update team successfully", async () => {
      const mockClient = createMockClient({
        updateResult: { data: null, error: null },
      });
      mockCreateClient.mockResolvedValue(mockClient);

      const result = await updateTeam({
        teamId: "team-1",
        tournamentId: "tournament-1",
        groupId: "group-1",
        name: "Los Ronaldos",
        color: "#0000FF",
      });

      expect(result.ok).toBe(true);
      expect(mockRevalidatePath).toHaveBeenCalled();
    });
  });

  describe("removeTeam", () => {
    it("should remove team successfully", async () => {
      const mockClient = createMockClient({
        deleteResult: { data: null, error: null },
      });
      mockCreateClient.mockResolvedValue(mockClient);

      const result = await removeTeam({
        teamId: "team-1",
        tournamentId: "tournament-1",
        groupId: "group-1",
      });

      expect(result.ok).toBe(true);
      expect(mockRevalidatePath).toHaveBeenCalled();
    });
  });

  describe("startTournament", () => {
    it("should fail with less than 2 teams", async () => {
      const mockChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "tournament-1", format: "liga", legs: 1 },
              error: null,
            }),
          }),
        }),
      };

      const mockChainTeams = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };

      const mockClient = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
        from: vi.fn((table: string) => {
          if (table === "tournaments") return mockChain;
          if (table === "tournament_teams") return mockChainTeams;
          return {};
        }),
        rpc: vi.fn(),
      };

      mockCreateClient.mockResolvedValue(
        mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
      );

      const result = await startTournament({
        tournamentId: "tournament-1",
        groupId: "group-1",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(ERROR_MESSAGES.NOT_ENOUGH_TEAMS);
      }
      expect(mockClient.rpc).not.toHaveBeenCalled();
    });

    it("should generate round-robin fixture for liga", async () => {
      const teamIds = ["team-1", "team-2", "team-3", "team-4"];
      const mockRandom = vi.spyOn(Math, "random");
      mockRandom.mockReturnValue(0.5);

      const mockChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "tournament-1", format: "liga", legs: 2 },
              error: null,
            }),
          }),
        }),
      };

      const mockChainTeams = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: teamIds.map((id) => ({ id })),
            error: null,
          }),
        }),
      };

      const mockClient = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
        from: vi.fn((table: string) => {
          if (table === "tournaments") return mockChain;
          if (table === "tournament_teams") return mockChainTeams;
          return {};
        }),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockCreateClient.mockResolvedValue(
        mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
      );

      const result = await startTournament({
        tournamentId: "tournament-1",
        groupId: "group-1",
      });

      expect(result.ok).toBe(true);
      expect(mockClient.rpc).toHaveBeenCalledWith(
        "start_tournament",
        expect.objectContaining({
          p_tournament_id: "tournament-1",
          p_fixtures: expect.any(Array),
        })
      );

      const rpcCall = mockClient.rpc.mock.calls[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fixtures = rpcCall[1].p_fixtures as any[];
      expect(fixtures.length).toBeGreaterThan(0);
      expect(fixtures[0]).toHaveProperty("round");
      expect(fixtures[0]).toHaveProperty("slot");

      mockRandom.mockRestore();
    });

    it("should generate bracket fixture for eliminacion", async () => {
      const teamIds = ["team-1", "team-2", "team-3"];
      const mockRandom = vi.spyOn(Math, "random");
      mockRandom.mockReturnValue(0.3);

      const mockChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "tournament-1", format: "eliminacion", legs: 1 },
              error: null,
            }),
          }),
        }),
      };

      const mockChainTeams = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: teamIds.map((id) => ({ id })),
            error: null,
          }),
        }),
      };

      const mockClient = {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
        from: vi.fn((table: string) => {
          if (table === "tournaments") return mockChain;
          if (table === "tournament_teams") return mockChainTeams;
          return {};
        }),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockCreateClient.mockResolvedValue(
        mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
      );

      const result = await startTournament({
        tournamentId: "tournament-1",
        groupId: "group-1",
      });

      expect(result.ok).toBe(true);
      const rpcCall = mockClient.rpc.mock.calls[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fixtures = rpcCall[1].p_fixtures as any[];
      expect(fixtures.length).toBeGreaterThan(0);
      expect(fixtures[0]).toHaveProperty("round");
      expect(fixtures[0]).toHaveProperty("slot");

      mockRandom.mockRestore();
    });
  });

  describe("reportTournamentResult", () => {
    it("should report result successfully", async () => {
      const mockClient = createMockClient({
        rpcResult: { data: null, error: null },
      });
      mockCreateClient.mockResolvedValue(mockClient);

      const result = await reportTournamentResult({
        matchId: "match-1",
        tournamentId: "tournament-1",
        groupId: "group-1",
        format: "liga",
        home_score: 2,
        away_score: 1,
        home_pens: null,
        away_pens: null,
      });

      expect(result.ok).toBe(true);
      expect(mockRevalidatePath).toHaveBeenCalled();
    });

    it("should handle penales correctly for eliminacion tie", async () => {
      const mockClient = createMockClient({
        rpcResult: { data: null, error: null },
      });
      mockCreateClient.mockResolvedValue(mockClient);

      const result = await reportTournamentResult({
        matchId: "match-1",
        tournamentId: "tournament-1",
        groupId: "group-1",
        format: "eliminacion",
        home_score: 2,
        away_score: 2,
        home_pens: 4,
        away_pens: 3,
      });

      expect(result.ok).toBe(true);
      const rpcCall = mockClient.rpc.mock.calls[0];
      expect(rpcCall[1]).toHaveProperty("p_home_pens");
      expect(rpcCall[1]).toHaveProperty("p_away_pens");
    });

    it("should fail if penales missing in eliminacion tie", async () => {
      const mockClient = createMockClient();
      mockCreateClient.mockResolvedValue(mockClient);

      const result = await reportTournamentResult({
        matchId: "match-1",
        tournamentId: "tournament-1",
        groupId: "group-1",
        format: "eliminacion",
        home_score: 2,
        away_score: 2,
        home_pens: null,
        away_pens: null,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("penales");
      }
    });

    it("should not include penales in rpc if not eliminacion", async () => {
      const mockClient = createMockClient({
        rpcResult: { data: null, error: null },
      });
      mockCreateClient.mockResolvedValue(mockClient);

      await reportTournamentResult({
        matchId: "match-1",
        tournamentId: "tournament-1",
        groupId: "group-1",
        format: "liga",
        home_score: 2,
        away_score: 1,
        home_pens: null,
        away_pens: null,
      });

      const rpcCall = mockClient.rpc.mock.calls[0];
      expect(rpcCall[1]).not.toHaveProperty("p_home_pens");
      expect(rpcCall[1]).not.toHaveProperty("p_away_pens");
    });

    it("should map PENALTIES_REQUIRED error", async () => {
      const mockClient = createMockClient({
        rpcResult: {
          data: null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          error: { message: "PENALTIES_REQUIRED" } as any,
        },
      });
      mockCreateClient.mockResolvedValue(mockClient);

      const result = await reportTournamentResult({
        matchId: "match-1",
        tournamentId: "tournament-1",
        groupId: "group-1",
        format: "eliminacion",
        home_score: 2,
        away_score: 2,
        home_pens: 4,
        away_pens: 3,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(ERROR_MESSAGES.PENALTIES_REQUIRED);
      }
    });

    it("should map NOT_ENOUGH_TEAMS error", async () => {
      const mockClient = createMockClient({
        rpcResult: {
          data: null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          error: { message: "NOT_ENOUGH_TEAMS" } as any,
        },
      });
      mockCreateClient.mockResolvedValue(mockClient);

      const result = await reportTournamentResult({
        matchId: "match-1",
        tournamentId: "tournament-1",
        groupId: "group-1",
        format: "liga",
        home_score: 2,
        away_score: 1,
        home_pens: null,
        away_pens: null,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(ERROR_MESSAGES.NOT_ENOUGH_TEAMS);
      }
    });

    it("should not expose raw error message", async () => {
      const mockClient = createMockClient({
        rpcResult: {
          data: null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          error: { message: "Some database connection error" } as any,
        },
      });
      mockCreateClient.mockResolvedValue(mockClient);

      const result = await reportTournamentResult({
        matchId: "match-1",
        tournamentId: "tournament-1",
        groupId: "group-1",
        format: "liga",
        home_score: 2,
        away_score: 1,
        home_pens: null,
        away_pens: null,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).not.toContain("database connection");
        expect(result.error).toBe("Algo salió mal. Probá de nuevo.");
      }
    });

    it("should fail without user", async () => {
      const mockClient = createMockClient({
        getUser: { data: { user: null } },
      });
      mockCreateClient.mockResolvedValue(mockClient);

      const result = await reportTournamentResult({
        matchId: "match-1",
        tournamentId: "tournament-1",
        groupId: "group-1",
        format: "liga",
        home_score: 2,
        away_score: 1,
        home_pens: null,
        away_pens: null,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("ingresar");
      }
    });
  });
});
