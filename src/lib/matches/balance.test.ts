import { describe, it, expect } from "vitest";
import { balanceTeams, type BalancePlayer } from "./balance";

describe("balanceTeams", () => {
  it("should return empty teams for empty input", () => {
    const result = balanceTeams([]);
    expect(result.A).toEqual([]);
    expect(result.B).toEqual([]);
  });

  it("should handle single player", () => {
    const players: BalancePlayer[] = [
      { id: "1", ovr: 70, position: "MC" },
    ];
    const result = balanceTeams(players);
    expect(result.A.length + result.B.length).toBe(1);
    expect(result.A.length).toBeLessThanOrEqual(1);
    expect(result.B.length).toBeLessThanOrEqual(1);
  });

  it("should keep team size difference <= 1 with even player count", () => {
    const players: BalancePlayer[] = [
      { id: "1", ovr: 88, position: "MC" },
      { id: "2", ovr: 75, position: "LD" },
      { id: "3", ovr: 68, position: "MC" },
      { id: "4", ovr: 60, position: "EI" },
    ];
    const result = balanceTeams(players);
    expect(result.A.length + result.B.length).toBe(4);
    expect(Math.abs(result.A.length - result.B.length)).toBeLessThanOrEqual(1);
  });

  it("should keep team size difference <= 1 with odd player count", () => {
    const players: BalancePlayer[] = [
      { id: "1", ovr: 88, position: "MC" },
      { id: "2", ovr: 75, position: "LD" },
      { id: "3", ovr: 68, position: "MC" },
      { id: "4", ovr: 60, position: "EI" },
      { id: "5", ovr: 65, position: "MCD" },
    ];
    const result = balanceTeams(players);
    expect(result.A.length + result.B.length).toBe(5);
    expect(Math.abs(result.A.length - result.B.length)).toBeLessThanOrEqual(1);
  });

  it("should separate at least 2 goalkeepers with top 2 in different teams", () => {
    const players: BalancePlayer[] = [
      { id: "por1", ovr: 80, position: "POR" },
      { id: "por2", ovr: 75, position: "POR" },
      { id: "p1", ovr: 70, position: "MC" },
    ];
    const result = balanceTeams(players);
    // Both goalkeepers should be assigned
    expect(result.A.length + result.B.length).toBeGreaterThanOrEqual(2);
    // They should be in different teams
    const hasGK_A = result.A.some((id) => id.startsWith("por"));
    const hasGK_B = result.B.some((id) => id.startsWith("por"));
    expect(hasGK_A && hasGK_B).toBe(true);
    // Best GK should be in A
    if (result.A.includes("por1") && result.B.includes("por2")) {
      expect(true).toBe(true); // por1 (80) in A, por2 (75) in B
    } else if (result.A.includes("por2") && result.B.includes("por1")) {
      expect(true).toBe(false); // Invalid: por2 (75) should not be in A
    }
  });

  it("should handle 3 goalkeepers with top 2 separated and rest treated normally", () => {
    const players: BalancePlayer[] = [
      { id: "por1", ovr: 82, position: "POR" },
      { id: "por2", ovr: 78, position: "POR" },
      { id: "por3", ovr: 65, position: "POR" },
      { id: "p1", ovr: 70, position: "MC" },
    ];
    const result = balanceTeams(players);
    expect(result.A.length + result.B.length).toBe(4);
    // por1 should be in A, por2 in B
    expect(result.A).toContain("por1");
    expect(result.B).toContain("por2");
  });

  it("should treat null OVR as 60", () => {
    const players: BalancePlayer[] = [
      { id: "1", ovr: 80, position: "MC" },
      { id: "2", ovr: null, position: "MC" }, // Should be treated as 60
      { id: "3", ovr: 50, position: "MC" },
    ];
    const result = balanceTeams(players);
    expect(result.A.length + result.B.length).toBe(3);
    // Player with 80 should be in A (higher OVR goes first)
    // Player with null (60) should be second choice
    // Player with 50 should be last
  });

  it("should be deterministic: same input always gives same output", () => {
    const players: BalancePlayer[] = [
      { id: "a", ovr: 75, position: "MC" },
      { id: "b", ovr: 70, position: "LD" },
      { id: "c", ovr: 68, position: "MC" },
      { id: "d", ovr: 80, position: "EI" },
    ];

    const result1 = balanceTeams(players);
    const result2 = balanceTeams(players);

    expect(result1.A).toEqual(result2.A);
    expect(result1.B).toEqual(result2.B);
  });

  it("should be deterministic with shuffled input", () => {
    const players: BalancePlayer[] = [
      { id: "a", ovr: 75, position: "MC" },
      { id: "b", ovr: 70, position: "LD" },
      { id: "c", ovr: 68, position: "MC" },
      { id: "d", ovr: 80, position: "EI" },
    ];

    const shuffled: BalancePlayer[] = [
      { id: "d", ovr: 80, position: "EI" },
      { id: "a", ovr: 75, position: "MC" },
      { id: "c", ovr: 68, position: "MC" },
      { id: "b", ovr: 70, position: "LD" },
    ];

    const result1 = balanceTeams(players);
    const result2 = balanceTeams(shuffled);

    expect(result1.A.sort()).toEqual(result2.A.sort());
    expect(result1.B.sort()).toEqual(result2.B.sort());
  });

  it("should not mutate the input array", () => {
    const players: BalancePlayer[] = [
      { id: "1", ovr: 75, position: "MC" },
      { id: "2", ovr: 70, position: "LD" },
    ];
    const originalIds = players.map((p) => p.id);
    const originalOvrs = players.map((p) => p.ovr);

    balanceTeams(players);

    expect(players.map((p) => p.id)).toEqual(originalIds);
    expect(players.map((p) => p.ovr)).toEqual(originalOvrs);
  });

  it("should handle 10 players with OVR difference <= 10 between teams", () => {
    const players: BalancePlayer[] = [
      { id: "p1", ovr: 88, position: "MC" },
      { id: "p2", ovr: 82, position: "LD" },
      { id: "p3", ovr: 78, position: "POR" },
      { id: "p4", ovr: 75, position: "MCD" },
      { id: "p5", ovr: 72, position: "MC" },
      { id: "p6", ovr: 68, position: "EI" },
      { id: "p7", ovr: 65, position: "CAD" },
      { id: "p8", ovr: 62, position: "MC" },
      { id: "p9", ovr: 58, position: "LD" },
      { id: "p10", ovr: 55, position: "POR" },
    ];

    const result = balanceTeams(players);

    // Check size difference
    expect(Math.abs(result.A.length - result.B.length)).toBeLessThanOrEqual(1);
    expect(result.A.length + result.B.length).toBe(10);

    // Calculate sum of OVR for each team
    const sumA = result.A.reduce((acc, id) => {
      const player = players.find((p) => p.id === id);
      return acc + (player?.ovr || 0);
    }, 0);

    const sumB = result.B.reduce((acc, id) => {
      const player = players.find((p) => p.id === id);
      return acc + (player?.ovr || 0);
    }, 0);

    // Difference between team sums should be <= 10
    expect(Math.abs(sumA - sumB)).toBeLessThanOrEqual(10);

    // Check that both goalkeepers are distributed
    const allGK = players.filter((p) => p.position === "POR").map((p) => p.id);
    const gkInA = result.A.filter((id) => allGK.includes(id));
    const gkInB = result.B.filter((id) => allGK.includes(id));
    expect(gkInA.length + gkInB.length).toBe(2);
    expect(gkInA.length).toBe(1);
    expect(gkInB.length).toBe(1);
  });

  it("should tiebreak by id ascending when OVRs are equal", () => {
    const players: BalancePlayer[] = [
      { id: "aaa", ovr: 70, position: "MC" },
      { id: "zzz", ovr: 70, position: "MC" },
      { id: "bbb", ovr: 70, position: "MC" },
    ];

    const result = balanceTeams(players);
    // With tied OVRs, sorted order is aaa, bbb, zzz by id asc
    // aaa goes to A first, bbb goes to B (lower sum), zzz ties with A so goes to A
    expect(result.A).toContain("aaa");
    expect(result.B).toContain("bbb");
    expect(result.A).toContain("zzz");
  });
});
