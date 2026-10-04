"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { assignTeams } from "@/actions/matches";
import { balanceTeams } from "@/lib/matches/balance";

export interface TeamPickerPlayer {
  userId: string;
  name: string;
  position: string;
  ovr: number | null;
  team: "A" | "B" | null;
}

interface TeamPickerProps {
  matchId: string;
  groupId: string;
  players: TeamPickerPlayer[];
}

export function TeamPicker({ matchId, groupId, players }: TeamPickerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [assignments, setAssignments] = useState<Record<string, "A" | "B" | null>>(
    players.reduce((acc, p) => ({ ...acc, [p.userId]: p.team }), {})
  );

  const playerList = players.map((p) => ({
    ...p,
    team: assignments[p.userId] as "A" | "B" | null,
  }));

  // Calculate team stats
  const teamA = playerList.filter((p) => p.team === "A");
  const teamB = playerList.filter((p) => p.team === "B");

  const calculateTeamOvr = (team: typeof teamA) => {
    return team.reduce((sum, p) => sum + (p.ovr ?? 60), 0);
  };

  const teamAOvr = calculateTeamOvr(teamA);
  const teamBOvr = calculateTeamOvr(teamB);

  const handleTeamChange = (userId: string, newTeam: "A" | "B" | null) => {
    setAssignments((prev) => ({
      ...prev,
      [userId]: newTeam,
    }));
  };

  const handleBalance = () => {
    const result = balanceTeams(
      players.map((p) => ({
        id: p.userId,
        ovr: p.ovr,
        position: p.position,
      }))
    );

    const newAssignments: Record<string, "A" | "B" | null> = {};
    result.A.forEach((id) => {
      newAssignments[id] = "A";
    });
    result.B.forEach((id) => {
      newAssignments[id] = "B";
    });

    setAssignments(newAssignments);
  };

  const handleSave = () => {
    startTransition(async () => {
      const assignmentsList = players.map((p) => ({
        user_id: p.userId,
        team: assignments[p.userId] as "A" | "B" | null,
      }));

      const result = await assignTeams({
        matchId,
        groupId,
        assignments: assignmentsList,
      });

      if (result.ok) {
        toast.success("Guardamos los equipos.");
        router.push(`/g/${groupId}/partidos/${matchId}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Team Summaries */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-lg p-4 border border-border">
          <h3 className="text-title text-foreground mb-2">Equipo A</h3>
          <div className="text-caption text-muted-foreground mb-2">
            {teamA.length} jugador{teamA.length !== 1 ? "es" : ""}
          </div>
          <div className="text-display font-display tabular text-foreground">
            {teamAOvr}
          </div>
        </div>

        <div className="bg-card rounded-lg p-4 border border-border">
          <h3 className="text-title text-foreground mb-2">Equipo B</h3>
          <div className="text-caption text-muted-foreground mb-2">
            {teamB.length} jugador{teamB.length !== 1 ? "es" : ""}
          </div>
          <div className="text-display font-display tabular text-foreground">
            {teamBOvr}
          </div>
        </div>
      </div>

      {/* Players List */}
      <div className="space-y-3">
        {playerList.map((player) => (
          <div
            key={player.userId}
            className="bg-card rounded-lg p-4 border border-border space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-body-strong text-foreground truncate">
                  {player.name}
                </h4>
                <p className="text-caption text-muted-foreground label-caps">
                  {player.position}
                </p>
              </div>
              <div className="text-display font-display tabular text-foreground text-right">
                {player.ovr !== null ? player.ovr : "–"}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                aria-pressed={player.team === "A"}
                aria-label={`Mandar a ${player.name} al equipo A`}
                onClick={() => handleTeamChange(player.userId, player.team === "A" ? null : "A")}
                className={`h-tap flex-1 rounded-md text-small font-medium transition-colors ${
                  player.team === "A"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                A
              </button>
              <button
                aria-pressed={player.team === "B"}
                aria-label={`Mandar a ${player.name} al equipo B`}
                onClick={() => handleTeamChange(player.userId, player.team === "B" ? null : "B")}
                className={`h-tap flex-1 rounded-md text-small font-medium transition-colors ${
                  player.team === "B"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                B
              </button>
              <button
                aria-pressed={player.team === null}
                aria-label={`Sacar a ${player.name} de un equipo`}
                onClick={() => handleTeamChange(player.userId, null)}
                className={`h-tap flex-1 rounded-md text-small font-medium transition-colors ${
                  player.team === null
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                Sin equipo
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          variant="secondary"
          size="lg"
          block
          onClick={handleBalance}
          disabled={isPending}
        >
          <Shuffle className="size-5" />
          Armar parejo
        </Button>

        <Button
          size="lg"
          block
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? "Guardando…" : "Guardar equipos"}
        </Button>
      </div>
    </div>
  );
}
