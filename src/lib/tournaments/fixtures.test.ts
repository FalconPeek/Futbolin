import { describe, it, expect } from "vitest";
import {
  roundRobin,
  bracket,
  nextSlot,
  bracketRounds,
} from "./fixtures";
import { roundLabel } from "./rounds";

describe("roundRobin", () => {
  it("generates fixture for 4 teams, single leg", () => {
    const teams = ["a", "b", "c", "d"];
    const fixtures = roundRobin(teams, 1);

    // 4 teams: 3 rounds, 2 matches per round = 6 total
    expect(fixtures).toHaveLength(6);

    // Check structure
    for (let round = 1; round <= 3; round++) {
      const roundMatches = fixtures.filter((f) => f.round === round);
      expect(roundMatches.length).toBeGreaterThan(0);
    }

    // Each pair plays exactly once
    const pairs = new Set<string>();
    for (const f of fixtures) {
      const pair = [f.home_team_id, f.away_team_id].sort().join("-");
      expect(pairs.has(pair)).toBe(false);
      pairs.add(pair);
    }

    // No team plays twice in the same round
    for (let round = 1; round <= 3; round++) {
      const roundMatches = fixtures.filter((f) => f.round === round);
      const teams = new Set<string>();
      for (const f of roundMatches) {
        expect(teams.has(f.home_team_id!)).toBe(false);
        expect(teams.has(f.away_team_id!)).toBe(false);
        teams.add(f.home_team_id!);
        teams.add(f.away_team_id!);
      }
    }
  });

  it("generates fixture for 5 teams, single leg (with bye)", () => {
    const teams = ["a", "b", "c", "d", "e"];
    const fixtures = roundRobin(teams, 1);

    // 5 teams (odd): 5 rounds with bye, some matches have bye
    expect(fixtures.length).toBeGreaterThan(0);

    // All teams should be represented
    const allTeams = new Set<string>();
    for (const f of fixtures) {
      allTeams.add(f.home_team_id!);
      allTeams.add(f.away_team_id!);
    }
    expect(allTeams).toEqual(new Set(teams));

    // No team plays twice in the same round
    for (const round of new Set(fixtures.map((f) => f.round))) {
      const roundMatches = fixtures.filter((f) => f.round === round);
      const teamSet = new Set<string>();
      for (const f of roundMatches) {
        expect(teamSet.has(f.home_team_id!)).toBe(false);
        expect(teamSet.has(f.away_team_id!)).toBe(false);
        teamSet.add(f.home_team_id!);
        teamSet.add(f.away_team_id!);
      }
    }
  });

  it("generates fixture for 4 teams, two legs", () => {
    const teams = ["a", "b", "c", "d"];
    const fixtures = roundRobin(teams, 2);

    // 4 teams, 2 legs: 3 rounds × 2 = 6 rounds total, 12 matches
    expect(fixtures).toHaveLength(12);

    // Split by leg
    const leg1 = fixtures.filter((f) => f.round <= 3);
    const leg2 = fixtures.filter((f) => f.round > 3);

    expect(leg1).toHaveLength(6);
    expect(leg2).toHaveLength(6);

    // Return leg has inverted home/away
    for (let i = 0; i < 6; i++) {
      expect(leg2[i].home_team_id).toBe(leg1[i].away_team_id);
      expect(leg2[i].away_team_id).toBe(leg1[i].home_team_id);
    }
  });

  it("generates fixture for 5 teams, two legs", () => {
    const teams = ["a", "b", "c", "d", "e"];
    const fixtures = roundRobin(teams, 2);

    // Should have 2x the single-leg matches
    const singleLeg = roundRobin(teams, 1);
    expect(fixtures.length).toBe(singleLeg.length * 2);
  });

  it("throws error for fewer than 2 teams", () => {
    expect(() => roundRobin([], 1)).toThrow("Round-robin requires at least 2 teams");
    expect(() => roundRobin(["a"], 1)).toThrow("Round-robin requires at least 2 teams");
  });
});

describe("bracket", () => {
  it("generates bracket for 2 teams", () => {
    const teams = ["a", "b"];
    const fixtures = bracket(teams);

    expect(fixtures).toHaveLength(1);
    expect(fixtures[0]).toEqual({
      round: 1,
      slot: 0,
      home_team_id: "a",
      away_team_id: "b",
    });
  });

  it("generates bracket for 3 teams (with bye)", () => {
    const teams = ["a", "b", "c"];
    const fixtures = bracket(teams);

    // Round 1: size = 4, slots 0-1
    // Slot 0: seed 0 (a) vs seed 3 (bye) - no row generated
    // Slot 1: seed 1 (b) vs seed 2 (c) - row generated
    const round1 = fixtures.filter((f) => f.round === 1);
    expect(round1).toHaveLength(1);
    expect(round1[0]).toEqual({
      round: 1,
      slot: 1,
      home_team_id: "b",
      away_team_id: "c",
    });

    // Round 2: seed 0 (a) should be in slot 0 as home
    const round2 = fixtures.filter((f) => f.round === 2);
    expect(round2).toHaveLength(1);
    expect(round2[0]).toEqual({
      round: 2,
      slot: 0,
      home_team_id: "a",
      away_team_id: null,
    });
  });

  it("generates bracket for 5 teams (with byes)", () => {
    const teams = ["a", "b", "c", "d", "e"];
    const fixtures = bracket(teams);

    // Size = 8, so 3 rounds
    // Round 1 slots: 0,1,2,3 -> seeds 0,1,2,3 vs 7,6,5,4
    // Seeds >= 5 are byes
    // Slot 0: seed 0 vs seed 7 (bye) - no row
    // Slot 1: seed 1 vs seed 6 (bye) - no row
    // Slot 2: seed 2 vs seed 5 (bye) - no row
    // Slot 3: seed 3 vs seed 4 (valid) - row generated
    const round1 = fixtures.filter((f) => f.round === 1);
    expect(round1).toHaveLength(1);
    expect(round1[0]).toEqual({
      round: 1,
      slot: 3,
      home_team_id: "d",
      away_team_id: "e",
    });

    // Round 2: 2 matches (8/4 = 2)
    // Slot 0: bye winner from slot 0 (a, home) vs bye winner from slot 1 (b, away)
    // Slot 1: bye winner from slot 2 (c, home) vs winner of round 1 slot 3 (null at first)
    const round2 = fixtures.filter((f) => f.round === 2);
    expect(round2).toHaveLength(2);

    // Match 0: a vs b
    expect(round2[0].slot).toBe(0);
    expect(round2[0].home_team_id).toBe("a");
    expect(round2[0].away_team_id).toBe("b");

    // Match 1: c vs null (will be filled by winner of d vs e)
    expect(round2[1].slot).toBe(1);
    expect(round2[1].home_team_id).toBe("c");
    expect(round2[1].away_team_id).toBeNull();
  });

  it("generates bracket for 8 teams (no byes)", () => {
    const teams = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const fixtures = bracket(teams);

    // Size = 8, 3 rounds, 4 matches in round 1, 2 in round 2, 1 in round 3
    const round1 = fixtures.filter((f) => f.round === 1);
    const round2 = fixtures.filter((f) => f.round === 2);
    const round3 = fixtures.filter((f) => f.round === 3);

    expect(round1).toHaveLength(4);
    expect(round2).toHaveLength(2);
    expect(round3).toHaveLength(1);

    // All round 1 matches should have both teams (no byes)
    for (const match of round1) {
      expect(match.home_team_id).not.toBeNull();
      expect(match.away_team_id).not.toBeNull();
    }
  });

  it("throws error for fewer than 2 or more than 16 teams", () => {
    expect(() => bracket([])).toThrow("Bracket requires 2 to 16 teams");
    expect(() => bracket(["a"])).toThrow("Bracket requires 2 to 16 teams");

    const teams = Array.from({ length: 17 }, (_, i) => `team${i}`);
    expect(() => bracket(teams)).toThrow("Bracket requires 2 to 16 teams");
  });
});

describe("nextSlot", () => {
  it("handles even slot", () => {
    const result = nextSlot(1, 0);
    expect(result).toEqual({
      round: 2,
      slot: 0,
      side: "home",
    });

    const result2 = nextSlot(1, 2);
    expect(result2).toEqual({
      round: 2,
      slot: 1,
      side: "home",
    });
  });

  it("handles odd slot", () => {
    const result = nextSlot(1, 1);
    expect(result).toEqual({
      round: 2,
      slot: 0,
      side: "away",
    });

    const result2 = nextSlot(1, 3);
    expect(result2).toEqual({
      round: 2,
      slot: 1,
      side: "away",
    });
  });
});

describe("bracketRounds", () => {
  it("calculates rounds correctly", () => {
    expect(bracketRounds(2)).toBe(1);
    expect(bracketRounds(3)).toBe(2);
    expect(bracketRounds(4)).toBe(2);
    expect(bracketRounds(5)).toBe(3);
    expect(bracketRounds(8)).toBe(3);
    expect(bracketRounds(16)).toBe(4);
  });
});

describe("roundLabel", () => {
  it("generates league round labels", () => {
    expect(roundLabel("liga", 1, 3)).toBe("Fecha 1");
    expect(roundLabel("liga", 2, 3)).toBe("Fecha 2");
    expect(roundLabel("liga", 3, 3)).toBe("Fecha 3");
  });

  it("generates elimination round labels", () => {
    // 8 team bracket: 3 rounds
    expect(roundLabel("eliminacion", 3, 3)).toBe("Final");
    expect(roundLabel("eliminacion", 2, 3)).toBe("Semifinal");
    expect(roundLabel("eliminacion", 1, 3)).toBe("Cuartos de final");

    // 16 team bracket: 4 rounds
    expect(roundLabel("eliminacion", 4, 4)).toBe("Final");
    expect(roundLabel("eliminacion", 3, 4)).toBe("Semifinal");
    expect(roundLabel("eliminacion", 2, 4)).toBe("Cuartos de final");
    expect(roundLabel("eliminacion", 1, 4)).toBe("Octavos de final");

    // 32 team bracket: 5 rounds
    expect(roundLabel("eliminacion", 5, 5)).toBe("Final");
    expect(roundLabel("eliminacion", 4, 5)).toBe("Semifinal");
    expect(roundLabel("eliminacion", 3, 5)).toBe("Cuartos de final");
    expect(roundLabel("eliminacion", 2, 5)).toBe("Octavos de final");
    expect(roundLabel("eliminacion", 1, 5)).toBe("Ronda 1");
  });
});
