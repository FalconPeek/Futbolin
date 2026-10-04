export type FixtureRow = {
  round: number;
  slot: number;
  home_team_id: string | null;
  away_team_id: string | null;
};

/**
 * Generates a round-robin fixture using the Berger rotation method.
 * For odd team counts, a bye is added and no matches are generated with the bye.
 * With legs = 2, the entire fixture is repeated with home/away swapped.
 */
export function roundRobin(teamIds: string[], legs: 1 | 2): FixtureRow[] {
  if (teamIds.length < 2) {
    throw new Error("Round-robin requires at least 2 teams");
  }

  const n = teamIds.length;
  const isOdd = n % 2 === 1;
  const teams = isOdd ? [...teamIds, ""] : [...teamIds]; // "" represents bye
  const size = teams.length;

  const fixtures: FixtureRow[] = [];
  let round = 1;

  // Berger rotation: rotate teams, keeping first team fixed
  const rotated = [...teams];

  for (let day = 0; day < size - 1; day++) {
    // Pair teams at positions i and size-1-i
    const matches: Array<[string, string]> = [];
    for (let i = 0; i < size / 2; i++) {
      matches.push([rotated[i], rotated[size - 1 - i]]);
    }

    // Add matches from this round (skip if bye is involved)
    let slot = 0;
    for (const [home, away] of matches) {
      // Skip if either side is a bye
      if (home === "" || away === "") {
        continue;
      }

      fixtures.push({
        round,
        slot,
        home_team_id: home,
        away_team_id: away,
      });
      slot++;
    }

    round++;

    // Rotate for next round: keep first team fixed, rotate the rest
    if (day < size - 2) {
      const temp = rotated[1];
      for (let i = 1; i < size - 1; i++) {
        rotated[i] = rotated[i + 1];
      }
      rotated[size - 1] = temp;
    }
  }

  // If legs = 2, add the return leg with swapped home/away
  if (legs === 2) {
    const lastRound = Math.max(...fixtures.map((f) => f.round));
    const returnFixtures = fixtures.map((f) => ({
      round: f.round + lastRound,
      slot: f.slot,
      home_team_id: f.away_team_id,
      away_team_id: f.home_team_id,
    }));
    fixtures.push(...returnFixtures);
  }

  return fixtures;
}

/**
 * Returns the number of rounds needed for a bracket of size >= teamCount.
 */
export function bracketRounds(teamCount: number): number {
  if (teamCount < 2) {
    throw new Error("Bracket requires at least 2 teams");
  }
  let size = 1;
  let rounds = 0;
  while (size < teamCount) {
    size *= 2;
    rounds++;
  }
  return rounds;
}

/**
 * Generates a single-elimination bracket fixture.
 * Teams are seeded 0..n-1; seed >= n is a bye.
 */
export function bracket(teamIds: string[]): FixtureRow[] {
  const n = teamIds.length;
  if (n < 2 || n > 16) {
    throw new Error("Bracket requires 2 to 16 teams");
  }

  // Calculate bracket size (power of 2 >= n)
  let size = 1;
  let rounds = 0;
  while (size < n) {
    size *= 2;
    rounds++;
  }

  const fixtures: FixtureRow[] = [];

  // Track which teams advance to each round as bye winners
  // Map: round -> slot -> side -> teamId
  const advancers = new Map<number, Map<number, Map<"home" | "away", string>>>();

  // Generate round 1 matches and track bye winners
  for (let slot = 0; slot < size / 2; slot++) {
    const homeSeed = slot;
    const awaySeed = size - 1 - slot;

    const homeId = homeSeed < n ? teamIds[homeSeed] : null;
    const awayId = awaySeed < n ? teamIds[awaySeed] : null;

    // If away is bye, home team advances directly to round 2
    if (awayId === null && homeId !== null) {
      // Track bye winner for round 2
      const r2Slot = Math.floor(slot / 2);
      const r2Side = slot % 2 === 0 ? "home" : "away";

      if (!advancers.has(2)) advancers.set(2, new Map());
      const round2 = advancers.get(2)!;
      if (!round2.has(r2Slot)) round2.set(r2Slot, new Map());
      round2.get(r2Slot)!.set(r2Side, homeId);

      continue; // Don't generate round 1 match with bye
    }

    // Generate round 1 match
    fixtures.push({
      round: 1,
      slot,
      home_team_id: homeId,
      away_team_id: awayId,
    });
  }

  // Generate matches for rounds 2..rounds
  for (let r = 2; r <= rounds; r++) {
    const matchesInRound = size / Math.pow(2, r);

    for (let slot = 0; slot < matchesInRound; slot++) {
      let homeId: string | null = null;
      let awayId: string | null = null;

      // Check if bye winners fill these positions
      if (advancers.has(r) && advancers.get(r)!.has(slot)) {
        const slotAdvancers = advancers.get(r)!.get(slot)!;
        if (slotAdvancers.has("home")) homeId = slotAdvancers.get("home")!;
        if (slotAdvancers.has("away")) awayId = slotAdvancers.get("away")!;
      }

      fixtures.push({
        round: r,
        slot,
        home_team_id: homeId,
        away_team_id: awayId,
      });
    }
  }

  return fixtures;
}

/**
 * Calculates the next slot where the winner of a match should be placed.
 */
export function nextSlot(
  round: number,
  slot: number
): { round: number; slot: number; side: "home" | "away" } {
  return {
    round: round + 1,
    slot: Math.floor(slot / 2),
    side: slot % 2 === 0 ? "home" : "away",
  };
}
