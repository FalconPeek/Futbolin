import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Bracket } from "./bracket";
import type { TournamentTeam, TournamentMatch } from "@/lib/standings/teams";

describe("Bracket", () => {
  const mockTeams: TournamentTeam[] = [
    { id: "1", name: "Equipo A", color: "#FF0000" },
    { id: "2", name: "Equipo B", color: "#00FF00" },
    { id: "3", name: "Equipo C", color: "#0000FF" },
    { id: "4", name: "Equipo D", color: "#FFFF00" },
    { id: "5", name: "Equipo E", color: "#FF00FF" },
    { id: "6", name: "Equipo F", color: "#00FFFF" },
    { id: "7", name: "Equipo G", color: "#CCCCCC" },
    { id: "8", name: "Equipo H", color: "#999999" },
  ];

  it("muestra nombres de ronda correctos para 4 equipos (Semifinal y Final)", () => {
    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 1,
        home_team_id: "1",
        away_team_id: "2",
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
        home_team_id: "3",
        away_team_id: "4",
        home_score: 1,
        away_score: 1,
        home_pens: 3,
        away_pens: 2,
        status: "jugado",
      },
      {
        id: "m3",
        round: 2,
        slot: 1,
        home_team_id: "1",
        away_team_id: "3",
        home_score: 1,
        away_score: 0,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
    ];

    render(<Bracket teams={mockTeams} matches={matches} />);

    expect(screen.getByText("Semifinal")).toBeInTheDocument();
    expect(screen.getByText("Final")).toBeInTheDocument();
  });

  it("muestra nombres de ronda correctos para 8 equipos (Cuartos, Semifinal, Final)", () => {
    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 1,
        home_team_id: "1",
        away_team_id: "2",
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
        home_team_id: "3",
        away_team_id: "4",
        home_score: 2,
        away_score: 1,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
      {
        id: "m3",
        round: 1,
        slot: 3,
        home_team_id: "5",
        away_team_id: "6",
        home_score: 0,
        away_score: 1,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
      {
        id: "m4",
        round: 1,
        slot: 4,
        home_team_id: "7",
        away_team_id: "8",
        home_score: 3,
        away_score: 0,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
      {
        id: "m5",
        round: 2,
        slot: 1,
        home_team_id: "1",
        away_team_id: "3",
        home_score: 1,
        away_score: 1,
        home_pens: 4,
        away_pens: 3,
        status: "jugado",
      },
      {
        id: "m6",
        round: 2,
        slot: 2,
        home_team_id: "6",
        away_team_id: "7",
        home_score: 2,
        away_score: 0,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
      {
        id: "m7",
        round: 3,
        slot: 1,
        home_team_id: "1",
        away_team_id: "6",
        home_score: 0,
        away_score: 1,
        home_pens: null,
        away_pens: null,
        status: "jugado",
      },
    ];

    render(<Bracket teams={mockTeams} matches={matches} />);

    expect(screen.getByText("Cuartos de final")).toBeInTheDocument();
    expect(screen.getByText("Semifinal")).toBeInTheDocument();
    expect(screen.getByText("Final")).toBeInTheDocument();
  });

  it('muestra "A definir" cuando falta un equipo', () => {
    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 1,
        home_team_id: "1",
        away_team_id: null,
        home_score: null,
        away_score: null,
        home_pens: null,
        away_pens: null,
        status: "pendiente",
      },
      {
        id: "m2",
        round: 2,
        slot: 1,
        home_team_id: null,
        away_team_id: "2",
        home_score: null,
        away_score: null,
        home_pens: null,
        away_pens: null,
        status: "pendiente",
      },
    ];

    render(<Bracket teams={mockTeams} matches={matches} />);

    const definiendos = screen.getAllByText("A definir");
    expect(definiendos.length).toBeGreaterThanOrEqual(2);
  });

  it("marca como ganador (font-semibold) al equipo con más penales en un empate", () => {
    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 1,
        home_team_id: "1",
        away_team_id: "2",
        home_score: 1,
        away_score: 1,
        home_pens: 4,
        away_pens: 2,
        status: "jugado",
      },
    ];

    const { container } = render(<Bracket teams={mockTeams} matches={matches} />);

    // Buscar la fila del equipo ganador (Equipo A con 4 penales)
    const homeRow = container.querySelector("article > div:first-child");
    const awayRow = container.querySelector("article > div:nth-child(2)");

    // El ganador debe tener font-semibold
    expect(homeRow).toHaveClass("font-semibold");
    // El perdedor debe tener text-muted-foreground
    expect(awayRow).toHaveClass("text-muted-foreground");
  });

  it("muestra penales entre paréntesis cuando existen", () => {
    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 1,
        home_team_id: "1",
        away_team_id: "2",
        home_score: 2,
        away_score: 2,
        home_pens: 5,
        away_pens: 4,
        status: "jugado",
      },
    ];

    render(<Bracket teams={mockTeams} matches={matches} />);

    // Buscar penales entre paréntesis
    const penaltyStrings = screen.getAllByText(/\(\d+\)/);
    expect(penaltyStrings.length).toBeGreaterThanOrEqual(2); // Local y visitante
  });

  it("llama a renderAction por cada cruce", () => {
    const mockRenderAction = vi.fn(() => <button>Cargar resultado</button>);

    const matches: TournamentMatch[] = [
      {
        id: "m1",
        round: 1,
        slot: 1,
        home_team_id: "1",
        away_team_id: "2",
        home_score: null,
        away_score: null,
        home_pens: null,
        away_pens: null,
        status: "pendiente",
      },
      {
        id: "m2",
        round: 1,
        slot: 2,
        home_team_id: "3",
        away_team_id: "4",
        home_score: null,
        away_score: null,
        home_pens: null,
        away_pens: null,
        status: "pendiente",
      },
    ];

    render(<Bracket teams={mockTeams} matches={matches} renderAction={mockRenderAction} />);

    // renderAction debe llamarse 2 veces (una por cruce)
    expect(mockRenderAction).toHaveBeenCalledTimes(2);
    expect(mockRenderAction).toHaveBeenCalledWith(matches[0]);
    expect(mockRenderAction).toHaveBeenCalledWith(matches[1]);
  });
});
