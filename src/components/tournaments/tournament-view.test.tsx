import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FixtureList } from "./fixture-list";
import { TournamentView } from "./tournament-view";
import type { TournamentMatch, TournamentTeam } from "@/lib/standings/teams";

// Mock tournaments/rounds
vi.mock("@/lib/tournaments/rounds", () => ({
  roundLabel: (format: string, round: number, totalRounds: number) => {
    if (format === "liga") {
      return `Fecha ${round}`;
    }
    const roundsFromEnd = totalRounds - round + 1;
    switch (roundsFromEnd) {
      case 1:
        return "Final";
      case 2:
        return "Semifinal";
      case 3:
        return "Cuartos de final";
      default:
        return `Ronda ${round}`;
    }
  },
}));

describe("FixtureList", () => {
  it("agrupa partidos por fecha en liga", () => {
    const teams: TournamentTeam[] = [
      { id: "t1", name: "Equipo A", color: "#FF0000" },
      { id: "t2", name: "Equipo B", color: "#00FF00" },
      { id: "t3", name: "Equipo C", color: "#0000FF" },
      { id: "t4", name: "Equipo D", color: "#FFFF00" },
    ];

    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 0,
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
        round: 2,
        slot: 0,
        home_team_id: "t3",
        away_team_id: "t4",
        home_score: null,
        away_score: null,
        home_pens: null,
        away_pens: null,
        status: "pendiente",
      },
    ];

    render(
      <FixtureList
        teams={teams}
        matches={matches}
        format="liga"
        resultHref={null}
      />
    );

    // Verificar que aparecen las fechas
    expect(screen.getByText("Fecha 1")).toBeInTheDocument();
    expect(screen.getByText("Fecha 2")).toBeInTheDocument();
  });

  it("muestra 'vs' en partidos pendientes", () => {
    const teams: TournamentTeam[] = [
      { id: "t1", name: "Equipo A", color: "#FF0000" },
      { id: "t2", name: "Equipo B", color: "#00FF00" },
    ];

    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 0,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: null,
        away_score: null,
        home_pens: null,
        away_pens: null,
        status: "pendiente",
      },
    ];

    render(
      <FixtureList
        teams={teams}
        matches={matches}
        format="liga"
        resultHref={null}
      />
    );

    // Buscar "vs" en partidos pendientes
    const vsTexts = screen.getAllByText("vs");
    expect(vsTexts.length).toBeGreaterThan(0);
  });

  it("muestra el resultado en partidos jugados", () => {
    const teams: TournamentTeam[] = [
      { id: "t1", name: "Equipo A", color: "#FF0000" },
      { id: "t2", name: "Equipo B", color: "#00FF00" },
    ];

    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 0,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: 3,
        away_score: 2,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
    ];

    render(
      <FixtureList
        teams={teams}
        matches={matches}
        format="liga"
        resultHref={null}
      />
    );

    expect(screen.getByText("3 – 2")).toBeInTheDocument();
  });

  it("muestra links de carga solo si resultHref no es null", () => {
    const teams: TournamentTeam[] = [
      { id: "t1", name: "Equipo A", color: "#FF0000" },
      { id: "t2", name: "Equipo B", color: "#00FF00" },
    ];

    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 0,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: null,
        away_score: null,
        home_pens: null,
        away_pens: null,
        status: "pendiente",
      },
    ];

    const { rerender } = render(
      <FixtureList
        teams={teams}
        matches={matches}
        format="liga"
        resultHref={null}
      />
    );

    // Sin resultHref, no debe haber links
    expect(screen.queryByText("Cargar resultado")).not.toBeInTheDocument();

    // Con resultHref, debe haber links
    rerender(
      <FixtureList
        teams={teams}
        matches={matches}
        format="liga"
        resultHref={(match) => `/partidos/${match.id}`}
      />
    );

    expect(screen.getByText("Cargar resultado")).toBeInTheDocument();
  });

  it("muestra 'Corregir' en partidos jugados con resultHref", () => {
    const teams: TournamentTeam[] = [
      { id: "t1", name: "Equipo A", color: "#FF0000" },
      { id: "t2", name: "Equipo B", color: "#00FF00" },
    ];

    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 0,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: 2,
        away_score: 1,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
    ];

    render(
      <FixtureList
        teams={teams}
        matches={matches}
        format="liga"
        resultHref={(match) => `/partidos/${match.id}`}
      />
    );

    expect(screen.getByText("Corregir")).toBeInTheDocument();
  });
});

describe("TournamentView", () => {
  it("muestra pestañas 'Tabla' y 'Fixture' en liga", () => {
    const teams: TournamentTeam[] = [
      { id: "t1", name: "Equipo A", color: "#FF0000" },
      { id: "t2", name: "Equipo B", color: "#00FF00" },
    ];

    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 0,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: 1,
        away_score: 0,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
    ];

    render(
      <TournamentView
        format="liga"
        status="en_curso"
        teams={teams}
        matches={matches}
        isOrganizer={false}
        groupId="g1"
        tournamentId="t1"
      />
    );

    expect(screen.getByText("Tabla")).toBeInTheDocument();
    expect(screen.getByText("Fixture")).toBeInTheDocument();
  });

  it("muestra Bracket en eliminación directa", () => {
    const teams: TournamentTeam[] = [
      { id: "t1", name: "Equipo A", color: "#FF0000" },
      { id: "t2", name: "Equipo B", color: "#00FF00" },
    ];

    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 0,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: 1,
        away_score: 0,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
    ];

    render(
      <TournamentView
        format="eliminacion"
        status="en_curso"
        teams={teams}
        matches={matches}
        isOrganizer={false}
        groupId="g1"
        tournamentId="t1"
      />
    );

    // Verificar que aparece contenido de Bracket (locales y visitantes)
    expect(screen.getByText("Equipo A")).toBeInTheDocument();
    expect(screen.getByText("Equipo B")).toBeInTheDocument();
  });

  it("muestra campeón con Badge gold cuando está finalizado", () => {
    const teams: TournamentTeam[] = [
      { id: "t1", name: "Equipo A", color: "#FF0000" },
      { id: "t2", name: "Equipo B", color: "#00FF00" },
    ];

    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 0,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: 2,
        away_score: 1,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
    ];

    render(
      <TournamentView
        format="liga"
        status="finalizado"
        teams={teams}
        matches={matches}
        isOrganizer={false}
        groupId="g1"
        tournamentId="t1"
      />
    );

    // Verificar que aparece "Campeón:" (con dos puntos) en el texto
    expect(screen.getByText("Campeón:")).toBeInTheDocument();
    // Verificar que aparece el Badge de "Campeón"
    const badges = screen.getAllByText("Campeón");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("muestra links de carga para el organizador", async () => {
    const user = userEvent.setup();
    const teams: TournamentTeam[] = [
      { id: "t1", name: "Equipo A", color: "#FF0000" },
      { id: "t2", name: "Equipo B", color: "#00FF00" },
    ];

    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 0,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: null,
        away_score: null,
        home_pens: null,
        away_pens: null,
        status: "pendiente",
      },
    ];

    const { rerender } = render(
      <TournamentView
        format="liga"
        status="en_curso"
        teams={teams}
        matches={matches}
        isOrganizer={false}
        groupId="g1"
        tournamentId="t1"
      />
    );

    // No organizador: sin links
    const fixtureTab = screen.getByText("Fixture");
    await user.click(fixtureTab);
    expect(screen.queryByText("Cargar resultado")).not.toBeInTheDocument();

    // Organizador: con links
    rerender(
      <TournamentView
        format="liga"
        status="en_curso"
        teams={teams}
        matches={matches}
        isOrganizer={true}
        groupId="g1"
        tournamentId="t1"
      />
    );

    expect(screen.getByText("Cargar resultado")).toBeInTheDocument();
  });

  it("no muestra links de carga para no organizador", () => {
    const teams: TournamentTeam[] = [
      { id: "t1", name: "Equipo A", color: "#FF0000" },
      { id: "t2", name: "Equipo B", color: "#00FF00" },
    ];

    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 0,
        home_team_id: "t1",
        away_team_id: "t2",
        home_score: null,
        away_score: null,
        home_pens: null,
        away_pens: null,
        status: "pendiente",
      },
    ];

    render(
      <TournamentView
        format="eliminacion"
        status="en_curso"
        teams={teams}
        matches={matches}
        isOrganizer={false}
        groupId="g1"
        tournamentId="t1"
      />
    );

    expect(screen.queryByText("Cargar resultado")).not.toBeInTheDocument();
  });
});
