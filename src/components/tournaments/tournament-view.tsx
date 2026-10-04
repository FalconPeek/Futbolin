"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { StandingsTable } from "@/components/picado/standings-table";
import { Bracket } from "./bracket";
import { FixtureList } from "./fixture-list";
import {
  computeTeamStandings,
  tournamentChampion,
  type TournamentMatch,
  type TournamentTeam,
} from "@/lib/standings/teams";
import { Trophy } from "lucide-react";

export function TournamentView({
  format,
  status,
  teams,
  matches,
  isOrganizer,
  groupId,
  tournamentId,
}: {
  format: "liga" | "eliminacion";
  status: "borrador" | "en_curso" | "finalizado";
  teams: TournamentTeam[];
  matches: TournamentMatch[];
  isOrganizer: boolean;
  groupId: string;
  tournamentId: string;
}) {
  // Determinar si mostrar el link de carga de resultados
  const resultHref =
    isOrganizer && status === "en_curso"
      ? (match: TournamentMatch) =>
          `/g/${groupId}/torneos/${tournamentId}/partidos/${match.id}`
      : null;

  // Obtener el campeón si está finalizado
  const champion =
    status === "finalizado" ? tournamentChampion(format, teams, matches) : null;

  // Encontrar el equipo campeón
  const championTeam = champion ? teams.find((t) => t.id === champion) : null;

  // Calcular tabla de posiciones (para liga)
  const standings = computeTeamStandings(teams, matches);

  if (format === "liga") {
    return (
      <div className="space-y-4">
        {/* Campeón si está finalizado */}
        {status === "finalizado" && championTeam && (
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-gold" />
            <span className="text-body">
              Campeón:{" "}
              <span className="font-semibold">{championTeam.name}</span>
            </span>
            <Badge variant="gold">Campeón</Badge>
          </div>
        )}

        {/* Pestañas */}
        <Tabs defaultValue="standings" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="standings" className="flex-1">
              Tabla
            </TabsTrigger>
            <TabsTrigger value="fixture" className="flex-1">
              Fixture
            </TabsTrigger>
          </TabsList>

          {/* Tabla de posiciones */}
          <TabsContent value="standings" className="mt-4">
            <StandingsTable
              rows={standings}
              teamLabel="Equipo"
            />
          </TabsContent>

          {/* Fixture */}
          <TabsContent value="fixture" className="mt-4">
            <FixtureList
              teams={teams}
              matches={matches}
              format={format}
              resultHref={resultHref}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Eliminación
  return (
    <div className="space-y-4">
      {/* Campeón si está finalizado */}
      {status === "finalizado" && championTeam && (
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-gold" />
          <span className="text-body">
            Campeón:{" "}
            <span className="font-semibold">{championTeam.name}</span>
          </span>
          <Badge variant="gold">Campeón</Badge>
        </div>
      )}

      {/* Llave */}
      <Bracket
        teams={teams}
        matches={matches}
        renderAction={
          resultHref
            ? (match) => {
                const hasTeams = match.home_team_id && match.away_team_id;
                if (match.status === "pendiente" && hasTeams) {
                  return (
                    <a
                      href={resultHref(match)}
                      className="text-primary hover:underline text-small"
                    >
                      Cargar resultado
                    </a>
                  );
                }
                if (match.status === "jugado" && hasTeams) {
                  return (
                    <a
                      href={resultHref(match)}
                      className="text-primary hover:underline text-small"
                    >
                      Corregir
                    </a>
                  );
                }
                return null;
              }
            : undefined
        }
      />
    </div>
  );
}
