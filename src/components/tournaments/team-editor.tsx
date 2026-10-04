"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { addTeam, updateTeam, removeTeam, startTournament } from "@/actions/tournaments";
import { teamSchema } from "@/lib/validators";

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

const MAX_TEAMS = 16;
const MIN_TEAMS_TO_START = 2;
const INVALID_DATA = "Revisá los datos e intentá de nuevo.";

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

// La lista de equipos viene siempre del servidor: cada acción revalida la ruta
// y el padre vuelve a pasar `teams` con los ids reales.
export function TeamEditor({ tournamentId, groupId, format, teams }: TeamEditorProps) {
  const router = useRouter();
  const colorLabelId = useId();
  const [isSaving, startSaving] = useTransition();
  const [isStarting, startStarting] = useTransition();
  const [teamName, setTeamName] = useState("");
  const [selectedColor, setSelectedColor] = useState(TEAM_COLORS[0].hex);
  const [nameError, setNameError] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  const isPending = isSaving || isStarting;
  const maxTeamsReached = teams.length >= MAX_TEAMS;
  const canStart = teams.length >= MIN_TEAMS_TO_START;

  const handleAddTeam = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (maxTeamsReached) return;

    const parsed = teamSchema.safeParse({ name: teamName, color: selectedColor });
    if (!parsed.success) {
      setNameError(parsed.error.issues[0]?.message ?? INVALID_DATA);
      return;
    }
    setNameError(null);

    startSaving(async () => {
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

      setTeamName("");
      setSelectedColor(TEAM_COLORS[0].hex);
    });
  };

  const handleRemoveTeam = (teamId: string) => {
    startSaving(async () => {
      const result = await removeTeam({ teamId, tournamentId, groupId });

      if (!result.ok) {
        toast.error(result.error);
      }
    });
  };

  const handleRenameStart = (team: Team) => {
    setEditingTeamId(team.id);
    setEditingName(team.name);
    setRenameError(null);
  };

  const handleRenameCancel = () => {
    setEditingTeamId(null);
    setEditingName("");
    setRenameError(null);
  };

  const handleRenameSave = (e: React.FormEvent<HTMLFormElement>, team: Team) => {
    e.preventDefault();

    const parsed = teamSchema.safeParse({ name: editingName, color: team.color });
    if (!parsed.success) {
      setRenameError(parsed.error.issues[0]?.message ?? INVALID_DATA);
      return;
    }
    setRenameError(null);

    startSaving(async () => {
      const result = await updateTeam({
        teamId: team.id,
        tournamentId,
        groupId,
        name: parsed.data.name,
        color: team.color,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setEditingTeamId(null);
      setEditingName("");
    });
  };

  const handleStartTournament = () => {
    startStarting(async () => {
      const result = await startTournament({ tournamentId, groupId });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      router.push(result.data.redirectTo);
    });
  };

  return (
    <div className="space-y-6">
      <Card title="Agregá un equipo">
        <form onSubmit={handleAddTeam} noValidate className="space-y-4">
          <Input
            label="Nombre del equipo"
            value={teamName}
            onChange={(e) => {
              setTeamName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder="Ej: Los Galácticos"
            error={nameError ?? undefined}
            disabled={maxTeamsReached}
          />

          <div>
            <span id={colorLabelId} className="label-caps mb-3 block text-muted-foreground">
              Color
            </span>
            <div
              role="radiogroup"
              aria-labelledby={colorLabelId}
              className="grid grid-cols-4 justify-items-center gap-3"
            >
              {TEAM_COLORS.map((color) => {
                const selected = selectedColor === color.hex;
                return (
                  <button
                    key={color.hex}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={color.name}
                    onClick={() => setSelectedColor(color.hex)}
                    disabled={maxTeamsReached}
                    className={`h-tap w-tap shrink-0 rounded-full border border-border transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                      selected ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : ""
                    }`}
                    style={{ backgroundColor: color.hex }}
                  />
                );
              })}
            </div>
          </div>

          <Button type="submit" block disabled={maxTeamsReached || isPending}>
            Agregar equipo
          </Button>

          {maxTeamsReached && (
            <p className="text-center text-small text-muted-foreground">
              Llegaste al máximo de {MAX_TEAMS} equipos.
            </p>
          )}
        </form>
      </Card>

      {teams.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-title font-semibold">Equipos ({teams.length})</h3>
          <ul className="space-y-2">
            {teams.map((team) => (
              <li
                key={team.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
              >
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: team.color }}
                />

                {editingTeamId === team.id ? (
                  <form
                    onSubmit={(e) => handleRenameSave(e, team)}
                    noValidate
                    className="flex flex-1 items-start gap-2"
                  >
                    <Input
                      aria-label={`Nuevo nombre de ${team.name}`}
                      value={editingName}
                      onChange={(e) => {
                        setEditingName(e.target.value);
                        if (renameError) setRenameError(null);
                      }}
                      error={renameError ?? undefined}
                      className="flex-1"
                      autoFocus
                    />
                    <Button type="submit" size="md" disabled={isPending}>
                      Guardar
                    </Button>
                    <Button type="button" variant="ghost" size="md" onClick={handleRenameCancel}>
                      Cancelar
                    </Button>
                  </form>
                ) : (
                  <>
                    <span className="flex-1 text-body">{team.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRenameStart(team)}
                      disabled={isPending}
                      aria-label={`Renombrar ${team.name}`}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleRemoveTeam(team.id)}
                      disabled={isPending}
                      aria-label={`Quitar ${team.name}`}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <Button
          type="button"
          size="lg"
          block
          disabled={!canStart || isPending}
          onClick={handleStartTournament}
        >
          {isStarting ? "Armando el fixture…" : "Empezar torneo"}
        </Button>
        {!canStart ? (
          <p className="text-center text-small text-muted-foreground">
            Necesitás al menos {MIN_TEAMS_TO_START} equipos.
          </p>
        ) : (
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
