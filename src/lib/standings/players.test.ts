import { describe, it, expect } from "vitest";
import { computePlayerStandings } from "./players";
import type { GroupMatch, Participation, PlayerInfo } from "./players";

describe("computePlayerStandings", () => {
  const players: PlayerInfo[] = [
    { id: "p1", name: "Álvarez" },
    { id: "p2", name: "Benítez" },
    { id: "p3", name: "Cabrera" },
    { id: "p4", name: "Díaz" },
  ];

  describe("puntos", () => {
    it("asigna 3 puntos por victoria, 1 por empate, 0 por derrota", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 2,
          scoreB: 1,
        },
      ];

      const participations: Participation[] = [
        { matchId: "m1", userId: "p1", team: "A", goals: 2, assists: 0 },
        { matchId: "m1", userId: "p2", team: "B", goals: 1, assists: 0 },
      ];

      const standings = computePlayerStandings(matches, participations, players);

      expect(standings[0]).toMatchObject({ id: "p1", pts: 3 });
      expect(standings[1]).toMatchObject({ id: "p2", pts: 0 });
    });

    it("asigna 1 punto por empate", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 2,
          scoreB: 2,
        },
      ];

      const participations: Participation[] = [
        { matchId: "m1", userId: "p1", team: "A", goals: 1, assists: 0 },
        { matchId: "m1", userId: "p2", team: "B", goals: 1, assists: 0 },
      ];

      const standings = computePlayerStandings(matches, participations, players);

      expect(standings[0]).toMatchObject({ id: "p1", pts: 1 });
      expect(standings[1]).toMatchObject({ id: "p2", pts: 1 });
    });
  });

  describe("goles a favor (GF) y en contra (GC)", () => {
    it("contabiliza goles del equipo desde perspectiva del jugador", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 3,
          scoreB: 1,
        },
      ];

      const participations: Participation[] = [
        { matchId: "m1", userId: "p1", team: "A", goals: 1, assists: 0 },
        { matchId: "m1", userId: "p2", team: "A", goals: 1, assists: 0 },
        { matchId: "m1", userId: "p3", team: "B", goals: 1, assists: 0 },
      ];

      const standings = computePlayerStandings(matches, participations, players);

      const p1 = standings.find((s) => s.id === "p1");
      const p3 = standings.find((s) => s.id === "p3");

      expect(p1).toMatchObject({ gf: 3, gc: 1 });
      expect(p3).toMatchObject({ gf: 1, gc: 3 });
    });
  });

  describe("forma", () => {
    it("devuelve últimos 5 resultados en orden cronológico, más reciente al final", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-01T15:00:00Z",
          status: "finalizado",
          scoreA: 1,
          scoreB: 0,
        },
        {
          id: "m2",
          playedAt: "2026-10-02T15:00:00Z",
          status: "finalizado",
          scoreA: 1,
          scoreB: 1,
        },
        {
          id: "m3",
          playedAt: "2026-10-03T15:00:00Z",
          status: "finalizado",
          scoreA: 0,
          scoreB: 2,
        },
      ];

      const participations: Participation[] = [
        { matchId: "m1", userId: "p1", team: "A", goals: 0, assists: 0 },
        { matchId: "m2", userId: "p1", team: "A", goals: 0, assists: 0 },
        { matchId: "m3", userId: "p1", team: "A", goals: 0, assists: 0 },
      ];

      const standings = computePlayerStandings(matches, participations, players);
      const p1 = standings.find((s) => s.id === "p1");

      expect(p1?.form).toEqual(["G", "E", "P"]);
    });

    it("devuelve máximo 5 resultados", () => {
      const matches: GroupMatch[] = Array.from({ length: 7 }, (_, i) => ({
        id: `m${i + 1}`,
        playedAt: new Date(
          new Date("2026-10-01").getTime() + i * 24 * 60 * 60 * 1000
        ).toISOString(),
        status: "finalizado" as const,
        scoreA: i % 2 === 0 ? 1 : 0,
        scoreB: i % 2 === 0 ? 0 : 1,
      }));

      const participations: Participation[] = matches.map((m) => ({
        matchId: m.id,
        userId: "p1",
        team: "A",
        goals: 0,
        assists: 0,
      }));

      const standings = computePlayerStandings(matches, participations, players);
      const p1 = standings.find((s) => s.id === "p1");

      expect(p1?.form?.length).toBeLessThanOrEqual(5);
      expect(p1?.form?.length).toBe(5);
    });

    it("forma está vacía si no hay participaciones", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 1,
          scoreB: 0,
        },
      ];

      const participations: Participation[] = [];

      const standings = computePlayerStandings(matches, participations, players);

      expect(standings.length).toBe(0);
    });
  });

  describe("desempates", () => {
    it("ordena por puntos descendente", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 2,
          scoreB: 0,
        },
        {
          id: "m2",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 1,
          scoreB: 0,
        },
      ];

      const participations: Participation[] = [
        { matchId: "m1", userId: "p1", team: "A", goals: 0, assists: 0 },
        { matchId: "m2", userId: "p2", team: "A", goals: 0, assists: 0 },
      ];

      const standings = computePlayerStandings(matches, participations, players);

      expect(standings[0].id).toBe("p1");
      expect(standings[1].id).toBe("p2");
    });

    it("desempata por diferencia de goles (DG) descendente", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 5,
          scoreB: 2,
        },
        {
          id: "m2",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 3,
          scoreB: 2,
        },
      ];

      const participations: Participation[] = [
        { matchId: "m1", userId: "p1", team: "A", goals: 0, assists: 0 },
        { matchId: "m2", userId: "p2", team: "A", goals: 0, assists: 0 },
      ];

      const standings = computePlayerStandings(matches, participations, players);

      expect(standings[0].id).toBe("p1");
      expect(standings[0].gf - standings[0].gc).toBe(3);
      expect(standings[1].id).toBe("p2");
      expect(standings[1].gf - standings[1].gc).toBe(1);
    });

    it("desempata por goles a favor (GF) descendente", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 4,
          scoreB: 2,
        },
        {
          id: "m2",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 3,
          scoreB: 1,
        },
      ];

      const participations: Participation[] = [
        { matchId: "m1", userId: "p1", team: "A", goals: 0, assists: 0 },
        { matchId: "m2", userId: "p2", team: "A", goals: 0, assists: 0 },
      ];

      const standings = computePlayerStandings(matches, participations, players);

      expect(standings[0].id).toBe("p1");
      expect(standings[0].gf).toBe(4);
      expect(standings[1].id).toBe("p2");
      expect(standings[1].gf).toBe(3);
    });

    it("desempata por goles personales descendente", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 2,
          scoreB: 0,
        },
        {
          id: "m2",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 2,
          scoreB: 0,
        },
      ];

      const participations: Participation[] = [
        { matchId: "m1", userId: "p1", team: "A", goals: 2, assists: 0 },
        { matchId: "m2", userId: "p2", team: "A", goals: 1, assists: 0 },
      ];

      const standings = computePlayerStandings(matches, participations, players);

      expect(standings[0].id).toBe("p1");
      expect(standings[0].goals).toBe(2);
      expect(standings[1].id).toBe("p2");
      expect(standings[1].goals).toBe(1);
    });

    it("desempata por nombre asc (es-AR) cuando todo lo demás es igual", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 1,
          scoreB: 0,
        },
        {
          id: "m2",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 1,
          scoreB: 0,
        },
      ];

      const participations: Participation[] = [
        { matchId: "m1", userId: "p1", team: "A", goals: 0, assists: 0 },
        { matchId: "m2", userId: "p2", team: "A", goals: 0, assists: 0 },
      ];

      const standings = computePlayerStandings(matches, participations, players);

      expect(standings[0].name).toBe("Álvarez");
      expect(standings[1].name).toBe("Benítez");
    });
  });

  describe("MVPs", () => {
    it("cuenta cuántas veces un jugador fue MVP", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 2,
          scoreB: 0,
          mvpIds: ["p1"],
        },
        {
          id: "m2",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 2,
          scoreB: 0,
          mvpIds: ["p1", "p2"],
        },
      ];

      const participations: Participation[] = [
        { matchId: "m1", userId: "p1", team: "A", goals: 0, assists: 0 },
        { matchId: "m2", userId: "p1", team: "A", goals: 0, assists: 0 },
        { matchId: "m2", userId: "p2", team: "A", goals: 0, assists: 0 },
      ];

      const standings = computePlayerStandings(matches, participations, players);

      expect(standings.find((s) => s.id === "p1")?.mvps).toBe(2);
      expect(standings.find((s) => s.id === "p2")?.mvps).toBe(1);
    });

    it("contabiliza 0 MVPs si no fue MVP en ningún partido", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 2,
          scoreB: 0,
          mvpIds: ["p1"],
        },
      ];

      const participations: Participation[] = [
        { matchId: "m1", userId: "p1", team: "A", goals: 0, assists: 0 },
        { matchId: "m1", userId: "p2", team: "B", goals: 0, assists: 0 },
      ];

      const standings = computePlayerStandings(matches, participations, players);

      expect(standings.find((s) => s.id === "p2")?.mvps).toBe(0);
    });
  });

  describe("goles y asistencias personales", () => {
    it("suma correctamente goles y asistencias por jugador", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 3,
          scoreB: 0,
        },
        {
          id: "m2",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 2,
          scoreB: 0,
        },
      ];

      const participations: Participation[] = [
        { matchId: "m1", userId: "p1", team: "A", goals: 2, assists: 1 },
        { matchId: "m2", userId: "p1", team: "A", goals: 1, assists: 1 },
      ];

      const standings = computePlayerStandings(matches, participations, players);

      expect(standings[0]).toMatchObject({
        id: "p1",
        goals: 3,
        assists: 2,
      });
    });
  });

  describe("filtrado de partidos no finalizados", () => {
    it("ignora partidos con status 'programado'", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-04T15:00:00Z",
          status: "programado",
          scoreA: null,
          scoreB: null,
        },
      ];

      const participations: Participation[] = [
        { matchId: "m1", userId: "p1", team: "A", goals: 0, assists: 0 },
      ];

      const standings = computePlayerStandings(matches, participations, players);

      expect(standings).toHaveLength(0);
    });

    it("ignora partidos con status 'cancelado'", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-04T15:00:00Z",
          status: "cancelado",
          scoreA: null,
          scoreB: null,
        },
      ];

      const participations: Participation[] = [
        { matchId: "m1", userId: "p1", team: "A", goals: 0, assists: 0 },
      ];

      const standings = computePlayerStandings(matches, participations, players);

      expect(standings).toHaveLength(0);
    });

    it("ignora partidos finalizados pero sin scores", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: null,
          scoreB: null,
        },
      ];

      const participations: Participation[] = [
        { matchId: "m1", userId: "p1", team: "A", goals: 0, assists: 0 },
      ];

      const standings = computePlayerStandings(matches, participations, players);

      expect(standings).toHaveLength(0);
    });
  });

  describe("filtrado de participaciones sin equipo", () => {
    it("ignora participaciones con team null", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 1,
          scoreB: 0,
        },
      ];

      const participations: Participation[] = [
        { matchId: "m1", userId: "p1", team: null, goals: 0, assists: 0 },
        { matchId: "m1", userId: "p2", team: "A", goals: 0, assists: 0 },
      ];

      const standings = computePlayerStandings(matches, participations, players);

      expect(standings).toHaveLength(1);
      expect(standings[0].id).toBe("p2");
    });
  });

  describe("datos de jugadores", () => {
    it("usa el nombre del map de jugadores", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 1,
          scoreB: 0,
        },
      ];

      const participations: Participation[] = [
        { matchId: "m1", userId: "p1", team: "A", goals: 0, assists: 0 },
      ];

      const standings = computePlayerStandings(matches, participations, players);

      expect(standings[0].name).toBe("Álvarez");
    });

    it("usa 'Jugador' si el nombre no está en el map", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 1,
          scoreB: 0,
        },
      ];

      const participations: Participation[] = [
        { matchId: "m1", userId: "unknown", team: "A", goals: 0, assists: 0 },
      ];

      const standings = computePlayerStandings(matches, participations, []);

      expect(standings[0].name).toBe("Jugador");
    });
  });

  describe("posición", () => {
    it("asigna pos como índice + 1", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 2,
          scoreB: 0,
        },
        {
          id: "m2",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 1,
          scoreB: 0,
        },
      ];

      const participations: Participation[] = [
        { matchId: "m1", userId: "p1", team: "A", goals: 0, assists: 0 },
        { matchId: "m2", userId: "p2", team: "A", goals: 0, assists: 0 },
      ];

      const standings = computePlayerStandings(matches, participations, players);

      expect(standings[0].pos).toBe(1);
      expect(standings[1].pos).toBe(2);
    });
  });

  describe("estadísticas básicas (pj, g, e, p)", () => {
    it("contabiliza correctamente victorias, empates y derrotas", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-01T15:00:00Z",
          status: "finalizado",
          scoreA: 2,
          scoreB: 0,
        },
        {
          id: "m2",
          playedAt: "2026-10-02T15:00:00Z",
          status: "finalizado",
          scoreA: 1,
          scoreB: 1,
        },
        {
          id: "m3",
          playedAt: "2026-10-03T15:00:00Z",
          status: "finalizado",
          scoreA: 0,
          scoreB: 2,
        },
      ];

      const participations: Participation[] = [
        { matchId: "m1", userId: "p1", team: "A", goals: 0, assists: 0 },
        { matchId: "m2", userId: "p1", team: "A", goals: 0, assists: 0 },
        { matchId: "m3", userId: "p1", team: "A", goals: 0, assists: 0 },
      ];

      const standings = computePlayerStandings(matches, participations, players);

      expect(standings[0]).toMatchObject({
        id: "p1",
        pj: 3,
        g: 1,
        e: 1,
        p: 1,
      });
    });
  });

  describe("jugadores sin participaciones", () => {
    it("no incluye jugadores con pj < 1", () => {
      const matches: GroupMatch[] = [
        {
          id: "m1",
          playedAt: "2026-10-04T15:00:00Z",
          status: "finalizado",
          scoreA: 1,
          scoreB: 0,
        },
      ];

      const participations: Participation[] = [
        { matchId: "m1", userId: "p1", team: "A", goals: 0, assists: 0 },
      ];

      const standings = computePlayerStandings(matches, participations, players);

      expect(standings).toHaveLength(1);
      expect(standings[0].id).toBe("p1");
    });
  });
});
