import { describe, it, expect } from "vitest";
import {
  signInSchema,
  signUpSchema,
  profileSchema,
  groupSchema,
  inviteCodeSchema,
  matchSchema,
  resultSchema,
  ratingSchema,
  tournamentSchema,
  teamSchema,
  tournamentResultSchema,
} from "@/lib/validators";

describe("Auth validators", () => {
  describe("signInSchema", () => {
    it("accepts valid email and password", () => {
      const result = signInSchema.safeParse({
        email: "user@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = signInSchema.safeParse({
        email: "not-an-email",
        password: "password123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Ingresá un email válido."
        );
      }
    });

    it("rejects password shorter than 8 characters", () => {
      const result = signInSchema.safeParse({
        email: "user@example.com",
        password: "short",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "La contraseña tiene que tener al menos 8 caracteres."
        );
      }
    });
  });

  describe("signUpSchema", () => {
    it("accepts valid data", () => {
      const result = signUpSchema.safeParse({
        email: "user@example.com",
        password: "password123",
        display_name: "Juan",
      });
      expect(result.success).toBe(true);
    });

    it("trims display_name and validates length", () => {
      const result = signUpSchema.safeParse({
        email: "user@example.com",
        password: "password123",
        display_name: "  Juan  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.display_name).toBe("Juan");
      }
    });

    it("rejects display_name shorter than 2 characters", () => {
      const result = signUpSchema.safeParse({
        email: "user@example.com",
        password: "password123",
        display_name: "J",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("entre 2 y 40");
      }
    });
  });
});

describe("Profile validator", () => {
  it("accepts valid profile data", () => {
    const result = profileSchema.safeParse({
      display_name: "Juan",
      nickname: "juanito",
      position: "MC",
    });
    expect(result.success).toBe(true);
  });

  it("trims nickname and converts empty string to undefined", () => {
    const result = profileSchema.safeParse({
      display_name: "Juan",
      nickname: "  ",
      position: "MC",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nickname).toBeUndefined();
    }
  });

  it("rejects invalid position", () => {
    const result = profileSchema.safeParse({
      display_name: "Juan",
      nickname: "juanito",
      position: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("allows optional nickname", () => {
    const result = profileSchema.safeParse({
      display_name: "Juan",
      position: "MC",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nickname).toBeUndefined();
    }
  });
});

describe("Groups validators", () => {
  describe("groupSchema", () => {
    it("accepts valid group name", () => {
      const result = groupSchema.safeParse({
        name: "Mi grupo",
      });
      expect(result.success).toBe(true);
    });

    it("trims group name", () => {
      const result = groupSchema.safeParse({
        name: "  Mi grupo  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Mi grupo");
      }
    });

    it("rejects name shorter than 2 characters", () => {
      const result = groupSchema.safeParse({
        name: "A",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("entre 2 y 40");
      }
    });
  });

  describe("inviteCodeSchema", () => {
    it("accepts valid 8-character code", () => {
      const result = inviteCodeSchema.safeParse("ABC2DEF3");
      expect(result.success).toBe(true);
    });

    it("converts lowercase to uppercase", () => {
      const result = inviteCodeSchema.safeParse("abc2def3");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("ABC2DEF3");
      }
    });

    it("rejects code with invalid characters", () => {
      const result = inviteCodeSchema.safeParse("ABC2DEF!");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "El código de invitación no es válido."
        );
      }
    });

    it("rejects code shorter than 8 characters", () => {
      const result = inviteCodeSchema.safeParse("ABC2DE");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "El código de invitación no es válido."
        );
      }
    });
  });
});

describe("Matches validators", () => {
  describe("matchSchema", () => {
    it("accepts valid match data", () => {
      const futureDate = new Date(Date.now() + 86400000); // tomorrow
      const result = matchSchema.safeParse({
        scheduled_at: futureDate,
        location: "Cancha de La Boca",
        players_per_team: 5,
      });
      expect(result.success).toBe(true);
    });

    it("accepts ISO string date", () => {
      const futureDate = new Date(Date.now() + 86400000);
      const result = matchSchema.safeParse({
        scheduled_at: futureDate.toISOString(),
        location: "Cancha de La Boca",
        players_per_team: 5,
      });
      expect(result.success).toBe(true);
    });

    it("rejects past date", () => {
      const pastDate = new Date(Date.now() - 86400000); // yesterday
      const result = matchSchema.safeParse({
        scheduled_at: pastDate,
        location: "Cancha de La Boca",
        players_per_team: 5,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Elegí una fecha y hora que todavía no pasó."
        );
      }
    });

    it("accepts string players_per_team", () => {
      const futureDate = new Date(Date.now() + 86400000);
      const result = matchSchema.safeParse({
        scheduled_at: futureDate,
        location: "Cancha de La Boca",
        players_per_team: "7",
      });
      expect(result.success).toBe(true);
    });

    it("rejects players_per_team outside range", () => {
      const futureDate = new Date(Date.now() + 86400000);
      const result = matchSchema.safeParse({
        scheduled_at: futureDate,
        location: "Cancha de La Boca",
        players_per_team: 2,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("resultSchema", () => {
    it("accepts valid result with correct stats", () => {
      const result = resultSchema.safeParse({
        score_a: 3,
        score_b: 2,
        stats: [
          {
            user_id: "550e8400-e29b-41d4-a716-446655440000",
            team: "A",
            goals: 2,
            assists: 1,
          },
          {
            user_id: "550e8400-e29b-41d4-a716-446655440001",
            team: "A",
            goals: 1,
            assists: 0,
          },
          {
            user_id: "550e8400-e29b-41d4-a716-446655440002",
            team: "B",
            goals: 2,
            assists: 0,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects when player goals exceed team score", () => {
      const result = resultSchema.safeParse({
        score_a: 2,
        score_b: 0,
        stats: [
          {
            user_id: "550e8400-e29b-41d4-a716-446655440000",
            team: "A",
            goals: 3,
            assists: 0,
          },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Los goles de los jugadores superan el resultado."
        );
      }
    });

    it("rejects when player assists exceed team score", () => {
      const result = resultSchema.safeParse({
        score_a: 2,
        score_b: 0,
        stats: [
          {
            user_id: "550e8400-e29b-41d4-a716-446655440000",
            team: "A",
            goals: 1,
            assists: 3,
          },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Las asistencias no pueden superar los goles."
        );
      }
    });

    it("accepts string scores and converts to numbers", () => {
      const result = resultSchema.safeParse({
        score_a: "3",
        score_b: "2",
        stats: [
          {
            user_id: "550e8400-e29b-41d4-a716-446655440000",
            team: "A",
            goals: "2",
            assists: "1",
          },
        ],
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("Ratings validator", () => {
  it("accepts valid rating with 6 stats", () => {
    const result = ratingSchema.safeParse({
      kind: "campo",
      stats: [80, 75, 70, 65, 60, 55],
    });
    expect(result.success).toBe(true);
  });

  it("accepts string stats and converts to numbers", () => {
    const result = ratingSchema.safeParse({
      kind: "arquero",
      stats: ["80", "75", "70", "65", "60", "55"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects stat outside 1-99 range", () => {
    const result = ratingSchema.safeParse({
      kind: "campo",
      stats: [80, 75, 70, 65, 60, 100],
    });
    expect(result.success).toBe(false);
  });

  it("rejects rating with fewer than 6 stats", () => {
    const result = ratingSchema.safeParse({
      kind: "campo",
      stats: [80, 75, 70, 65, 60],
    });
    expect(result.success).toBe(false);
  });
});

describe("Tournaments validators", () => {
  describe("tournamentSchema", () => {
    it("accepts valid liga tournament with 1 leg", () => {
      const result = tournamentSchema.safeParse({
        name: "Mi Torneo",
        format: "liga",
        legs: 1,
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid liga tournament with 2 legs", () => {
      const result = tournamentSchema.safeParse({
        name: "Mi Torneo",
        format: "liga",
        legs: 2,
      });
      expect(result.success).toBe(true);
    });

    it("rejects eliminacion with 2 legs", () => {
      const result = tournamentSchema.safeParse({
        name: "Mi Torneo",
        format: "eliminacion",
        legs: 2,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "La ida y vuelta es solo para ligas."
        );
      }
    });

    it("accepts string legs and converts to number", () => {
      const result = tournamentSchema.safeParse({
        name: "Mi Torneo",
        format: "liga",
        legs: "2",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("teamSchema", () => {
    it("accepts valid team data", () => {
      const result = teamSchema.safeParse({
        name: "Equipo A",
        color: "#FF0000",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid hex color", () => {
      const result = teamSchema.safeParse({
        name: "Equipo A",
        color: "FF0000",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Elegí un color de la lista."
        );
      }
    });

    it("rejects name longer than 30 characters", () => {
      const result = teamSchema.safeParse({
        name: "A".repeat(31),
        color: "#FF0000",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("tournamentResultSchema", () => {
    it("accepts valid liga result", () => {
      const result = tournamentResultSchema.safeParse({
        format: "liga",
        home_score: 2,
        away_score: 1,
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid eliminacion result with no penalties", () => {
      const result = tournamentResultSchema.safeParse({
        format: "eliminacion",
        home_score: 2,
        away_score: 1,
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid eliminacion result with penalties", () => {
      const result = tournamentResultSchema.safeParse({
        format: "eliminacion",
        home_score: 2,
        away_score: 2,
        home_pens: 4,
        away_pens: 3,
      });
      expect(result.success).toBe(true);
    });

    it("rejects eliminacion tie without penalties", () => {
      const result = tournamentResultSchema.safeParse({
        format: "eliminacion",
        home_score: 2,
        away_score: 2,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "En eliminación directa no hay empate: cargá los penales."
        );
      }
    });

    it("rejects eliminacion tie with same penalty score", () => {
      const result = tournamentResultSchema.safeParse({
        format: "eliminacion",
        home_score: 2,
        away_score: 2,
        home_pens: 4,
        away_pens: 4,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "En eliminación directa no hay empate: cargá los penales."
        );
      }
    });

    it("accepts string scores and converts to numbers", () => {
      const result = tournamentResultSchema.safeParse({
        format: "liga",
        home_score: "2",
        away_score: "1",
      });
      expect(result.success).toBe(true);
    });

    it("transforms non-tie eliminacion penalties to null", () => {
      const result = tournamentResultSchema.safeParse({
        format: "eliminacion",
        home_score: 2,
        away_score: 1,
        home_pens: 4,
        away_pens: 3,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.home_pens).toBeNull();
        expect(result.data.away_pens).toBeNull();
      }
    });

    it("transforms liga penalties to null regardless", () => {
      const result = tournamentResultSchema.safeParse({
        format: "liga",
        home_score: 2,
        away_score: 2,
        home_pens: 4,
        away_pens: 3,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.home_pens).toBeNull();
        expect(result.data.away_pens).toBeNull();
      }
    });
  });
});
