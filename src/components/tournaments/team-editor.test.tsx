import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TeamEditor } from "./team-editor";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("@/actions/tournaments", () => ({
  addTeam: vi.fn(),
  updateTeam: vi.fn(),
  removeTeam: vi.fn(),
  startTournament: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

describe("TeamEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockRefresh.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders add team form with name input and color palette", () => {
    render(
      <TeamEditor
        tournamentId="t1"
        groupId="g1"
        format="liga"
        teams={[]}
      />
    );

    expect(screen.getByLabelText("Nombre del equipo")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Agregar equipo/ })).toBeInTheDocument();
  });

  it("renders 8 color options in the palette", () => {
    render(
      <TeamEditor
        tournamentId="t1"
        groupId="g1"
        format="liga"
        teams={[]}
      />
    );

    const radioGroup = screen.getByRole("radiogroup");
    const colorButtons = radioGroup.querySelectorAll("button[role='radio']");
    expect(colorButtons).toHaveLength(8);
  });

  it("shows empty state message when no teams", () => {
    render(
      <TeamEditor
        tournamentId="t1"
        groupId="g1"
        format="liga"
        teams={[]}
      />
    );

    expect(screen.getByRole("button", { name: /Empezar torneo/ })).toBeDisabled();
    expect(screen.getByText("Necesitás al menos 2 equipos.")).toBeInTheDocument();
  });

  it("enables start button with 2 or more teams", async () => {
    const teams = [
      { id: "team1", name: "Team A", color: "#e53935" },
      { id: "team2", name: "Team B", color: "#1e88e5" },
    ];

    render(
      <TeamEditor
        tournamentId="t1"
        groupId="g1"
        format="liga"
        teams={teams}
      />
    );

    const startButton = screen.getByRole("button", { name: /Empezar torneo/ });
    expect(startButton).not.toBeDisabled();
  });

  it("disables add team button and shows message at 16 teams", () => {
    const teams = Array.from({ length: 16 }, (_, i) => ({
      id: `team${i}`,
      name: `Team ${i}`,
      color: "#e53935",
    }));

    render(
      <TeamEditor
        tournamentId="t1"
        groupId="g1"
        format="liga"
        teams={teams}
      />
    );

    const addButton = screen.getByRole("button", { name: /Agregar equipo/ });
    expect(addButton).toBeDisabled();
    expect(screen.getByText("Llegaste al máximo de 16 equipos.")).toBeInTheDocument();
  });

  it("displays list of teams with color dots and names", () => {
    const teams = [
      { id: "team1", name: "Los Galácticos", color: "#e53935" },
      { id: "team2", name: "Los Campeones", color: "#1e88e5" },
    ];

    render(
      <TeamEditor
        tournamentId="t1"
        groupId="g1"
        format="liga"
        teams={teams}
      />
    );

    expect(screen.getByText("Los Galácticos")).toBeInTheDocument();
    expect(screen.getByText("Los Campeones")).toBeInTheDocument();
    expect(screen.getByText("Equipos (2)")).toBeInTheDocument();
  });

  it("shows edit and remove buttons for each team", () => {
    const teams = [
      { id: "team1", name: "Los Galácticos", color: "#e53935" },
    ];

    render(
      <TeamEditor
        tournamentId="t1"
        groupId="g1"
        format="liga"
        teams={teams}
      />
    );

    expect(screen.getByLabelText("Renombrar Los Galácticos")).toBeInTheDocument();
    expect(screen.getByLabelText("Quitar Los Galácticos")).toBeInTheDocument();
  });

  it("shows liga description when format is liga", () => {
    render(
      <TeamEditor
        tournamentId="t1"
        groupId="g1"
        format="liga"
        teams={[
          { id: "team1", name: "Team A", color: "#e53935" },
          { id: "team2", name: "Team B", color: "#1e88e5" },
        ]}
      />
    );

    expect(
      screen.getByText("Se arma un todos contra todos con los equipos en orden al azar.")
    ).toBeInTheDocument();
  });

  it("shows eliminacion description when format is eliminacion", () => {
    render(
      <TeamEditor
        tournamentId="t1"
        groupId="g1"
        format="eliminacion"
        teams={[
          { id: "team1", name: "Team A", color: "#e53935" },
          { id: "team2", name: "Team B", color: "#1e88e5" },
        ]}
      />
    );

    expect(
      screen.getByText(/Se arma la llave con los equipos en orden al azar/)
    ).toBeInTheDocument();
  });
});
