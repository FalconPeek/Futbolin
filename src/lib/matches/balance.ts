export type BalancePlayer = { id: string; ovr: number | null; position: string };

export function balanceTeams(
  players: BalancePlayer[]
): { A: string[]; B: string[] } {
  if (players.length === 0) {
    return { A: [], B: [] };
  }

  // Create a copy to avoid mutating the input
  const workingPlayers = players.map((p) => ({
    ...p,
    ovr: p.ovr ?? 60, // Treat null OVR as 60
  }));

  // Separate goalkeepers from other players
  const goalkeepers = workingPlayers.filter((p) => p.position === "POR");
  const others = workingPlayers.filter((p) => p.position !== "POR");

  const teamA: string[] = [];
  const teamB: string[] = [];

  // Rule 1: If there are 2+ goalkeepers, take the top 2 by OVR (tiebreak by id asc)
  // Best goes to A, second best goes to B
  if (goalkeepers.length >= 2) {
    // Sort by OVR desc, then by id asc
    const sortedGK = goalkeepers.sort((a, b) => {
      if (a.ovr !== b.ovr) return b.ovr - a.ovr;
      return a.id.localeCompare(b.id);
    });

    // Take top 2
    teamA.push(sortedGK[0].id);
    teamB.push(sortedGK[1].id);

    // Rest of goalkeepers go back to others
    for (let i = 2; i < sortedGK.length; i++) {
      others.push(sortedGK[i]);
    }
  }

  // Rule 2: Distribute remaining players (including remaining GK if any)
  // Sort by OVR desc, then by id asc
  const remaining = others.sort((a, b) => {
    if (a.ovr !== b.ovr) return b.ovr - a.ovr;
    return a.id.localeCompare(b.id);
  });

  const maxPerTeam = Math.ceil(workingPlayers.length / 2);

  // Distribute one by one to the team with lower sum that still has room
  for (const player of remaining) {
    const sumA = teamA.reduce(
      (acc, id) => acc + (workingPlayers.find((p) => p.id === id)?.ovr || 0),
      0
    );
    const sumB = teamB.reduce(
      (acc, id) => acc + (workingPlayers.find((p) => p.id === id)?.ovr || 0),
      0
    );

    const canAddToA = teamA.length < maxPerTeam;
    const canAddToB = teamB.length < maxPerTeam;

    if (!canAddToA) {
      // Must go to B
      teamB.push(player.id);
    } else if (!canAddToB) {
      // Must go to A
      teamA.push(player.id);
    } else {
      // Both have room: pick the team with lower sum (tiebreak: A)
      if (sumA <= sumB) {
        teamA.push(player.id);
      } else {
        teamB.push(player.id);
      }
    }
  }

  return { A: teamA, B: teamB };
}
