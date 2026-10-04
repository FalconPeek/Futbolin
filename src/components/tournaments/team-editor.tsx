"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { addTeam, updateTeam, removeTeam, startTournament } from "@/actions/tournaments";
import { teamSchema } from "@/lib/validators/tournaments";

export const TEAM_COLORS = [
  { name: "Rojo", hex: "#e53935" },
  { name: "Azul", hex: "#1e88e5" },
  { name: "Amarillo", hex: "#fdd835" },
  { name: "Verde", hex: "#43a047" },
  { name: "Violeta", hex: "#8e24aa" },
  { name: "Naranja", hex: "#fb8c00" },
  { name: "Blanco", hex: "#f5f5f5" },
  { name: "Negro", hex: "#212121" },
];

interface Team {
  id: string;
  name: string;
  color: string;
}

interface TeamEditorProps {
  tournamentId: string;
  groupId: string;
  format: "liga" | "eliminacion";
  teams: Team[];
}

export function TeamEditor({
  tournamentId,
  groupId,
  format,
  teams: initialTeams,
}: TeamEditorProps) {
  const router = useRouter();
  const [startPending, startTransition] = useTransition();
  const [teamName, setTeamName] = useState("");
  const [selectedColor, setSelectedColor] = useState(TEAM_COLORS[0].hex);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [teams, setTeams] = useState<Team[]>(initialTeams);

  const handleAddTeam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedName = teamName.trim();
    const parsed = teamSchema.safeParse({
      name: trimmedName,
      color: selectedColor,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Error en los datos.");
      return;
    }

    const result = await addTeam({
      tournamentId,
      groupId,
      name: parsed.data.name,
      color: parsed.data.color,
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setTeams([
      ...teams,
      {
        id: Math.random().toString(),
        name: parsed.data.name,
        color: parsed.data.color,
      },
    ]);
    setTeamName("");
    setSelectedColor(TEAM_COLORS[0].hex);
  };

  const handleRemoveTeam = async (teamId: string) => {
    const result = await removeTeam({
      teamId,
      tournamentId,
      groupId,
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setTeams(teams.filter((t) => t.id !== teamId));
  };

  const handleRenameStart = (team: Team) => {
    setEditingTeamId(team.id);
    setEditingName(team.name);
  };

  const handleRenameSave = async (teamId: string, team: Team) => {
    const trimmedName = editingName.trim();
    const parsed = teamSchema.safeParse({
      name: trimmedName,
      color: team.color,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Error en los datos.");
      return;
    }

    const result = await updateTeam({
      teamId,
      tournamentId,
      groupId,
      name: parsed.data.name,
      color: team.color,
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setTeams(
      teams.map((t) =>
        t.id === teamId ? { ...t, name: parsed.data.name } : t
      )
    );
    setEditingTeamId(null);
    setEditingName("");
  };

  const handleStartTournament = () => {
    startTransition(async () => {
      const result = await startTournament({
        tournamentId,
        groupId,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      router.push(result.data.redirectTo);
      router.refresh();
    });
  };

  const maxTeamsReached = teams.length >= 16;
  const canStart = teams.length >= 2;

  return (
    <div className="space-y-6">
      {/* Add Team Form */}
      <Card title="Agregá un equipo">
        <form onSubmit={handleAddTeam} className="space-y-4">
          <Input
            label="Nombre del equipo"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Ej: Los Galácticos"
            disabled={maxTeamsReached}
            required
          />

          {/* Color Palette */}
          <div>
            <label className="label-caps mb-3 block text-muted-foreground">
              Color
            </label>
            <div
              role="radiogroup"
              aria-label="Seleccionar color del equipo"
              className="grid grid-cols-4 gap-3"
            >
              {TEAM_COLORS.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setSelectedColor(color.hex)}
                  aria-label={color.name}
                  aria-checked={selectedColor === color.hex}
                  role="radio"
                  className={`flex-shrink-0 h-tap w-tap rounded-full transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    selectedColor === color.hex
                      ? "ring-2 ring-ring"
                      : ""
                  }`}
                  style={{
                    backgroundColor: color.hex,
                    border: color.hex === "#f5f5f5" ? "1px solid #666" : "none",
                  }}
                  disabled={maxTeamsReached}
                />
              ))}
            </div>
          </div>

          <Button
            type="submit"
            size="md"
            block
            disabled={maxTeamsReached}
          >
            Agregar equipo
          </Button>

          {maxTeamsReached && (
            <p className="text-small text-muted-foreground text-center">
              Llegaste al máximo de 16 equipos.
            </p>
          )}
        </form>
      </Card>

      {/* Teams List */}
      {teams.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-title font-semibold">Equipos ({teams.length})</h3>
          <div className="space-y-2">
            {teams.map((team) => (
              <div
                key={team.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
              >
                <div
                  className="flex-shrink-0 w-3 h-3 rounded-full"
                  style={{ backgroundColor: team.color }}
                />

                {editingTeamId === team.id ? (
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1"
                      required
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleRenameSave(team.id, team)}
                    >
                      Guardar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingTeamId(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-body">{team.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRenameStart(team)}
                      aria-label={`Renombrar ${team.name}`}
                    >
                      <Pencil className="size-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTeam(team.id)}
                      aria-label={`Quitar ${team.name}`}
                    >
                      <Trash2 className="size-5" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start Tournament Button */}
      <div className="space-y-2">
        <Button
          type="button"
          size="lg"
          block
          disabled={!canStart || startPending}
          onClick={handleStartTournament}
        >
          {startPending ? "Armando el fixture…" : "Empezar torneo"}
        </Button>
        {!canStart && (
          <p className="text-small text-muted-foreground text-center">
            Necesitás al menos 2 equipos.
          </p>
        )}
        {canStart && (
          <p className="text-small text-muted-foreground">
            {format === "liga"
              ? "Se arma un todos contra todos con los equipos en orden al azar."
              : "Se arma la llave con los equipos en orden al azar; si no son potencia de 2, algunos pasan directo a la segunda ronda."}
          </p>
        )}
      </div>
    </div>
  );
}
