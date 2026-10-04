import { describe, it, expect } from "vitest";
import {
  computeTeamStandings,
  matchWinner,
  tournamentChampion,
  type TournamentTeam,
  type TournamentMatch,
} from "./teams";

const mockTeams: TournamentTeam[] = [
  { id: "team-a", name: "Alpha", color: "#FF0000" },
  { id: "team-b", name: "Beta", color: "#00FF00" },
  { id: "team-c", name: "Gamma", color: "#0000FF" },
  { id: "team-d", name: "Delta", color: "#FFFF00" },
];

describe("matchWinner", () => {
  it("should return null if match is not played", () => {
    const match: TournamentMatch = {
      id: "m1",
      round: 1,
      slot: 1,
      home_team_id: "team-a",
      away_team_id: "team-b",
      home_score: 2,
      away_score: 1,
      home_pens: null,
      away_pens: null,
      status: "pendiente",
    };
    expect(matchWinner(match)).toBeNull();
  });

  it("should return null if home_team_id is null", () => {
    const match: TournamentMatch = {
      id: "m1",
      round: 1,
      slot: 1,
      home_team_id: null,
      away_team_id: "team-b",
      home_score: 2,
      away_score: 1,
      home_pens: null,
      away_pens: null,
      status: "jugado",
    };
    expect(matchWinner(match)).toBeNull();
  });

  it("should return null if away_team_id is null", () => {
    const match: TournamentMatch = {
      id: "m1",
      round: 1,
      slot: 1,
      home_team_id: "team-a",
      away_team_id: null,
      home_score: 2,
      away_score: 1,
      home_pens: null,
      away_pens: null,
      status: "jugado",
    };
    expect(matchWinner(match)).toBeNull();
  });

  it("should return null if home_score is null", () => {
    const match: TournamentMatch = {
      id: "m1",
      round: 1,
      slot: 1,
      home_team_id: "team-a",
      away_team_id: "team-b",
      home_score: null,
      away_score: 1,
      home_pens: null,
      away_pens: null,
      status: "jugado",
    };
    expect(matchWinner(match)).toBeNull();
  });

  it("should return null if away_score is null", () => {
    const match: TournamentMatch = {
      id: "m1",
      round: 1,
      slot: 1,
      home_team_id: "team-a",
      away_team_id: "team-b",
      home_score: 2,
      away_score: null,
      home_pens: null,
      away_pens: null,
      status: "jugado",
    };
    expect(matchWinner(match)).toBeNull();
  });

  it("should return home_team_id if home_score > away_score", () => {
    const match: TournamentMatch = {
      id: "m1",
      round: 1,
      slot: 1,
      home_team_id: "team-a",
      away_team_id: "team-b",
      home_score: 3,
      away_score: 1,
      home_pens: null,
      away_pens: null,
      status: "jugado",
    };
    expect(matchWinner(match)).toBe("team-a");
  });

  it("should return away_team_id if away_score > home_score", () => {
    const match: TournamentMatch = {
      id: "m1",
      round: 1,
      slot: 1,
      home_team_id: "team-a",
      away_team_id: "team-b",
      home_score: 1,
      away_score: 2,
      home_pens: null,
      away_pens: null,
      status: "jugado",
    };
    expect(matchWinner(match)).toBe("team-b");
  });

  it("should decide by penalties if goal score is tied", () => {
    const match: TournamentMatch = {
      id: "m1",
      round: 1,
      slot: 1,
      home_team_id: "team-a",
      away_team_id: "team-b",
      home_score: 2,
      away_score: 2,
      home_pens: 4,
      away_pens: 3,
      status: "jugado",
    };
    expect(matchWinner(match)).toBe("team-a");
  });

  it("should return null if tied on goals and no penalties", () => {
    const match: TournamentMatch = {
      id: "m1",
      round: 1,
      slot: 1,
      home_team_id: "team-a",
      away_team_id: "team-b",
      home_score: 2,
      away_score: 2,
      home_pens: null,
      away_pens: null,
      status: "jugado",
    };
    expect(matchWinner(match)).toBeNull();
  });

  it("should return null if tied on penalties", () => {
    const match: TournamentMatch = {
      id: "m1",
      round: 1,
      slot: 1,
      home_team_id: "team-a",
      away_team_id: "team-b",
      home_score: 2,
      away_score: 2,
      home_pens: 3,
      away_pens: 3,
      status: "jugado",
    };
    expect(matchWinner(match)).toBeNull();
  });
});

describe("computeTeamStandings", () => {
  it("should include all teams with zero stats if no matches played", () => {
    const matches: TournamentMatch[] = [];
    const standings = computeTeamStandings(mockTeams, matches);

    expect(standings).toHaveLength(4);
    expect(standings.every((row) => row.pj === 0)).toBe(true);
    expect(standings.every((row) => row.pts === 0)).toBe(true);
    expect(standings.every((row) => row.gf === 0)).toBe(true);
    expect(standings.every((row) => row.gc === 0)).toBe(true);
  });

  it("should not count pending matches", () => {
    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 1,
        home_team_id: "team-a",
        away_team_id: "team-b",
        home_score: 2,
        away_score: 1,
        home_pens: null,
        away_pens: null,
        status: "pendiente",
      },
    ];
    const standings = computeTeamStandings(mockTeams, matches);

    expect(standings.every((row) => row.pj === 0)).toBe(true);
    expect(standings.every((row) => row.pts === 0)).toBe(true);
  });

  it("should award 3 points for a win", () => {
    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 1,
        home_team_id: "team-a",
        away_team_id: "team-b",
        home_score: 2,
        away_score: 1,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
    ];
    const standings = computeTeamStandings(mockTeams, matches);

    const teamA = standings.find((r) => r.id === "team-a");
    const teamB = standings.find((r) => r.id === "team-b");

    expect(teamA?.pts).toBe(3);
    expect(teamA?.g).toBe(1);
    expect(teamB?.pts).toBe(0);
    expect(teamB?.p).toBe(1);
  });

  it("should award 1 point for a draw", () => {
    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 1,
        home_team_id: "team-a",
        away_team_id: "team-b",
        home_score: 1,
        away_score: 1,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
    ];
    const standings = computeTeamStandings(mockTeams, matches);

    const teamA = standings.find((r) => r.id === "team-a");
    const teamB = standings.find((r) => r.id === "team-b");

    expect(teamA?.pts).toBe(1);
    expect(teamA?.e).toBe(1);
    expect(teamB?.pts).toBe(1);
    expect(teamB?.e).toBe(1);
  });

  it("should not count penalties in G/E/P (draw with penalties is E)", () => {
    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 1,
        home_team_id: "team-a",
        away_team_id: "team-b",
        home_score: 1,
        away_score: 1,
        home_pens: 4,
        away_pens: 3,
        status: "jugado",
      },
    ];
    const standings = computeTeamStandings(mockTeams, matches);

    const teamA = standings.find((r) => r.id === "team-a");
    const teamB = standings.find((r) => r.id === "team-b");

    // Ambos equipos deben registrar un empate, no una victoria
    expect(teamA?.e).toBe(1);
    expect(teamA?.g).toBe(0);
    expect(teamA?.pts).toBe(1);
    expect(teamB?.e).toBe(1);
    expect(teamB?.g).toBe(0);
    expect(teamB?.pts).toBe(1);
  });

  it("should track goals for and against", () => {
    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 1,
        home_team_id: "team-a",
        away_team_id: "team-b",
        home_score: 3,
        away_score: 1,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
    ];
    const standings = computeTeamStandings(mockTeams, matches);

    const teamA = standings.find((r) => r.id === "team-a");
    const teamB = standings.find((r) => r.id === "team-b");

    expect(teamA?.gf).toBe(3);
    expect(teamA?.gc).toBe(1);
    expect(teamB?.gf).toBe(1);
    expect(teamB?.gc).toBe(3);
  });

  it("should order by points desc, goal difference desc, goals for desc, name asc", () => {
    const teams = [
      { id: "t1", name: "Beta", color: "#FF0000" },
      { id: "t2", name: "Alpha", color: "#00FF00" },
      { id: "t3", name: "Charlie", color: "#0000FF" },
    ];
    const matches: TournamentMatch[] = [
      // t1 beats t2 3-1
      {
        id: "m1",
        round: 1,
        slot: 1,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: 3,
        away_score: 1,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
      // t3 beats t2 2-0
      {
        id: "m2",
        round: 1,
        slot: 2,
        home_team_id: "t3",
        away_team_id: "t2",
        home_score: 2,
        away_score: 0,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
      // t1 beats t3 1-0
      {
        id: "m3",
        round: 1,
        slot: 3,
        home_team_id: "t1",
        away_team_id: "t3",
        home_score: 1,
        away_score: 0,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
    ];
    const standings = computeTeamStandings(teams, matches);

    // t1: 6 pts, +3 GD, 4 GF
    // t3: 3 pts, +2 GD, 2 GF
    // t2: 0 pts, -6 GD, 1 GF
    expect(standings[0].id).toBe("t1");
    expect(standings[1].id).toBe("t3");
    expect(standings[2].id).toBe("t2");
  });

  it("should tiebreak by goal difference", () => {
    const teams = [
      { id: "t1", name: "Team A", color: "#FF0000" },
      { id: "t2", name: "Team B", color: "#00FF00" },
    ];
    const matches: TournamentMatch[] = [
      // t1 2-0 t2
      {
        id: "m1",
        round: 1,
        slot: 1,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: 2,
        away_score: 0,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
      // t1 1-1 t2
      {
        id: "m2",
        round: 1,
        slot: 2,
        home_team_id: "t2",
        away_team_id: "t1",
        home_score: 1,
        away_score: 1,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
    ];
    const standings = computeTeamStandings(teams, matches);

    // Both have 4 pts, but t1 has +2 GD, t2 has -2 GD
    expect(standings[0].id).toBe("t1");
    expect(standings[1].id).toBe("t2");
  });

  it("should tiebreak by goals for", () => {
    const teams = [
      { id: "t1", name: "Team A", color: "#FF0000" },
      { id: "t2", name: "Team B", color: "#00FF00" },
    ];
    const matches: TournamentMatch[] = [
      // t1 3-3 t2, t1 2-2 t2
      {
        id: "m1",
        round: 1,
        slot: 1,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: 3,
        away_score: 3,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
      {
        id: "m2",
        round: 1,
        slot: 2,
        home_team_id: "t2",
        away_team_id: "t1",
        home_score: 2,
        away_score: 2,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
    ];
    const standings = computeTeamStandings(teams, matches);

    // Both have 2 pts, 0 GD, but t1 has 5 GF vs t2 has 5 GF... actually same
    // So we check name order
    expect(standings[0].name).toBe("Team A");
    expect(standings[1].name).toBe("Team B");
  });

  it("should tiebreak by name asc (localeCompare es-AR)", () => {
    const teams = [
      { id: "t1", name: "Zebra", color: "#FF0000" },
      { id: "t2", name: "Alpha", color: "#00FF00" },
    ];
    const matches: TournamentMatch[] = [];
    const standings = computeTeamStandings(teams, matches);

    expect(standings[0].name).toBe("Alpha");
    expect(standings[1].name).toBe("Zebra");
  });

  it("should track form (last 5 results, most recent at end)", () => {
    const teams = [
      { id: "t1", name: "Team A", color: "#FF0000" },
      { id: "t2", name: "Team B", color: "#00FF00" },
      { id: "t3", name: "Team C", color: "#0000FF" },
    ];
    const matches: TournamentMatch[] = [
      // Round 1: t1 vs t2 = 2-1 (t1 wins)
      {
        id: "m1",
        round: 1,
        slot: 1,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: 2,
        away_score: 1,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
      // Round 1: t1 vs t3 = 1-1 (draw)
      {
        id: "m2",
        round: 1,
        slot: 2,
        home_team_id: "t1",
        away_team_id: "t3",
        home_score: 1,
        away_score: 1,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
      // Round 2: t1 vs t2 = 0-3 (t1 loses)
      {
        id: "m3",
        round: 2,
        slot: 1,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: 0,
        away_score: 3,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
    ];
    const standings = computeTeamStandings(teams, matches);

    const t1 = standings.find((r) => r.id === "t1");
    expect(t1?.form).toEqual(["G", "E", "P"]);
  });

  it("should limit form to 5 results", () => {
    const teams = [
      { id: "t1", name: "Team A", color: "#FF0000" },
      { id: "t2", name: "Team B", color: "#00FF00" },
    ];
    const matches: TournamentMatch[] = [
      // 6 matches: G E P G E (should show only last 5: E P G E)
      {
        id: "m1",
        round: 1,
        slot: 1,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: 1,
        away_score: 0,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
      {
        id: "m2",
        round: 1,
        slot: 2,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: 1,
        away_score: 1,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
      {
        id: "m3",
        round: 1,
        slot: 3,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: 0,
        away_score: 1,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
      {
        id: "m4",
        round: 2,
        slot: 1,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: 2,
        away_score: 0,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
      {
        id: "m5",
        round: 2,
        slot: 2,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: 1,
        away_score: 1,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
      {
        id: "m6",
        round: 2,
        slot: 3,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: 0,
        away_score: 1,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
    ];
    const standings = computeTeamStandings(teams, matches);

    const t1 = standings.find((r) => r.id === "t1");
    expect(t1?.form).toHaveLength(5);
    expect(t1?.form).toEqual(["E", "P", "G", "E", "P"]);
  });

  it("should include team color", () => {
    const standings = computeTeamStandings(mockTeams, []);

    mockTeams.forEach((team) => {
      const row = standings.find((r) => r.id === team.id);
      expect(row?.color).toBe(team.color);
    });
  });

  it("should set pos as index + 1", () => {
    const standings = computeTeamStandings(mockTeams, []);

    standings.forEach((row, idx) => {
      expect(row.pos).toBe(idx + 1);
    });
  });
});

describe("tournamentChampion", () => {
  it("should return first team in standings for liga format if all matches played", () => {
    const teams = [
      { id: "t1", name: "Team A", color: "#FF0000" },
      { id: "t2", name: "Team B", color: "#00FF00" },
    ];
    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 1,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: 2,
        away_score: 1,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
    ];
    const champion = tournamentChampion("liga", teams, matches);

    expect(champion).toBe("t1");
  });

  it("should return null for liga if not all matches are played", () => {
    const teams = [
      { id: "t1", name: "Team A", color: "#FF0000" },
      { id: "t2", name: "Team B", color: "#00FF00" },
      { id: "t3", name: "Team C", color: "#0000FF" },
    ];
    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 1,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: 2,
        away_score: 1,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
      {
        id: "m2",
        round: 1,
        slot: 2,
        home_team_id: "t2",
        away_team_id: "t3",
        home_score: null,
        away_score: null,
        home_pens: null,
        away_pens: null,
        status: "pendiente",
      },
    ];
    const champion = tournamentChampion("liga", teams, matches);

    expect(champion).toBeNull();
  });

  it("should return winner of final match for eliminacion format", () => {
    const teams = [
      { id: "t1", name: "Team A", color: "#FF0000" },
      { id: "t2", name: "Team B", color: "#00FF00" },
    ];
    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 1,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: 2,
        away_score: 1,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
    ];
    const champion = tournamentChampion("eliminacion", teams, matches);

    expect(champion).toBe("t1");
  });

  it("should decide eliminacion champion by penalties if tied on goals", () => {
    const teams = [
      { id: "t1", name: "Team A", color: "#FF0000" },
      { id: "t2", name: "Team B", color: "#00FF00" },
    ];
    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 1,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: 1,
        away_score: 1,
        home_pens: 5,
        away_pens: 3,
        status: "jugado",
      },
    ];
    const champion = tournamentChampion("eliminacion", teams, matches);

    expect(champion).toBe("t1");
  });

  it("should return null for eliminacion if final not played", () => {
    const teams = [
      { id: "t1", name: "Team A", color: "#FF0000" },
      { id: "t2", name: "Team B", color: "#00FF00" },
    ];
    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 1,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: null,
        away_score: null,
        home_pens: null,
        away_pens: null,
        status: "pendiente",
      },
    ];
    const champion = tournamentChampion("eliminacion", teams, matches);

    expect(champion).toBeNull();
  });

  it("should return null for eliminacion if no matches", () => {
    const teams = [
      { id: "t1", name: "Team A", color: "#FF0000" },
      { id: "t2", name: "Team B", color: "#00FF00" },
    ];
    const matches: TournamentMatch[] = [];
    const champion = tournamentChampion("eliminacion", teams, matches);

    expect(champion).toBeNull();
  });
});
