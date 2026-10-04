import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateTeammate } from "./ratings";
import * as supabaseServer from "@/lib/supabase/server";
import * as nextCache from "next/cache";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("rateTeammate", () => {
  const groupId = "550e8400-e29b-41d4-a716-446655440000";
  const ratedId = "550e8400-e29b-41d4-a716-446655440001";
  const raterId = "550e8400-e29b-41d4-a716-446655440002";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza stats fuera de rango sin tocar la base", async () => {
    const result = await rateTeammate({
      groupId,
      ratedId,
      kind: "campo",
      stats: [1, 2, 3, 4, 5, 100],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Cada stat tiene que estar entre 1 y 99.");
    }
  });

  it("rechaza 5 stats en lugar de 6 sin tocar la base", async () => {
    const result = await rateTeammate({
      groupId,
      ratedId,
      kind: "campo",
      stats: [1, 2, 3, 4, 5],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Tiene que haber exactamente 6 stats.");
    }
  });

  it("rechaza uuid de grupo inválido", async () => {
    const result = await rateTeammate({
      groupId: "invalid-uuid",
      ratedId,
      kind: "campo",
      stats: [1, 2, 3, 4, 5, 6],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("El ID del grupo no es válido.");
    }
  });

  it("rechaza uuid de jugador inválido", async () => {
    const result = await rateTeammate({
      groupId,
      ratedId: "invalid-uuid",
      kind: "campo",
      stats: [1, 2, 3, 4, 5, 6],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("El ID del jugador no es válido.");
    }
  });

  it("rechaza sin usuario sin tocar la base", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    };
    vi.mocked(supabaseServer.createClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof supabaseServer.createClient>
      >
    );

    const result = await rateTeammate({
      groupId,
      ratedId,
      kind: "campo",
      stats: [1, 2, 3, 4, 5, 6],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Tenés que ingresar para hacer esto.");
    }
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
  });

  it("rechaza autocalificación sin tocar la base", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: ratedId } },
        }),
      },
    };
    vi.mocked(supabaseServer.createClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof supabaseServer.createClient>
      >
    );

    const result = await rateTeammate({
      groupId,
      ratedId,
      kind: "campo",
      stats: [1, 2, 3, 4, 5, 6],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("No podés calificarte a vos mismo.");
    }
  });

  it("mapea error NOT_ALLOWED correctamente", async () => {
    const mockUpsert = vi
      .fn()
      .mockResolvedValue({ error: { message: "NOT_ALLOWED" } });
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: raterId } },
        }),
      },
      from: vi.fn().mockReturnValue({
        upsert: mockUpsert,
      }),
    };
    vi.mocked(supabaseServer.createClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof supabaseServer.createClient>
      >
    );

    const result = await rateTeammate({
      groupId,
      ratedId,
      kind: "campo",
      stats: [1, 2, 3, 4, 5, 6],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("No tenés permiso para hacer esto.");
    }
  });

  it("devuelve GENERIC_ERROR para errores desconocidos", async () => {
    const mockUpsert = vi
      .fn()
      .mockResolvedValue({ error: { message: "Unknown database error" } });
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: raterId } },
        }),
      },
      from: vi.fn().mockReturnValue({
        upsert: mockUpsert,
      }),
    };
    vi.mocked(supabaseServer.createClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof supabaseServer.createClient>
      >
    );

    const result = await rateTeammate({
      groupId,
      ratedId,
      kind: "campo",
      stats: [1, 2, 3, 4, 5, 6],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Algo salió mal. Probá de nuevo.");
    }
  });

  it("hace upsert con parámetros correctos en camino feliz", async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: raterId } },
        }),
      },
      from: vi.fn().mockReturnValue({
        upsert: mockUpsert,
      }),
    };
    vi.mocked(supabaseServer.createClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof supabaseServer.createClient>
      >
    );

    const stats = [10, 20, 30, 40, 50, 60];
    const result = await rateTeammate({
      groupId,
      ratedId,
      kind: "arquero",
      stats,
    });

    expect(result.ok).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith("player_ratings");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        group_id: groupId,
        rater_id: raterId,
        rated_id: ratedId,
        kind: "arquero",
        s1: 10,
        s2: 20,
        s3: 30,
        s4: 40,
        s5: 50,
        s6: 60,
      }),
      {
        onConflict: "group_id,rater_id,rated_id",
      }
    );
    expect(vi.mocked(nextCache.revalidatePath)).toHaveBeenCalledWith(
      `/g/${groupId}/cartas/${ratedId}`
    );
    expect(vi.mocked(nextCache.revalidatePath)).toHaveBeenCalledWith(
      `/g/${groupId}/cartas`
    );
    expect(vi.mocked(nextCache.revalidatePath)).toHaveBeenCalledWith(
      `/g/${groupId}`
    );
  });
});
