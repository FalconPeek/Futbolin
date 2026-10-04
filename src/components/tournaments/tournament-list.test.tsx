import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TournamentCard } from "./tournament-card";
import { TournamentForm } from "./tournament-form";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("@/actions/tournaments", () => ({
  createTournament: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

describe("TournamentCard", () => {
  it("renders tournament name and format with team count", () => {
    const tournament = {
      id: "t1",
      groupId: "g1",
      name: "Copa de Verano",
      format: "liga" as const,
      teamCount: 6,
      status: "borrador" as const,
      championName: null,
    };

    render(<TournamentCard tournament={tournament} />);

    expect(screen.getByText("Copa de Verano")).toBeInTheDocument();
    expect(screen.getByText(/Liga · 6 equipos/)).toBeInTheDocument();
  });

  it("shows Borrador badge as neutral for draft status", () => {
    const tournament = {
      id: "t1",
      groupId: "g1",
      name: "Copa de Verano",
      format: "liga" as const,
      teamCount: 6,
      status: "borrador" as const,
      championName: null,
    };

    render(<TournamentCard tournament={tournament} />);

    const badge = screen.getByText("Borrador");
    expect(badge).toHaveAttribute("data-variant", "neutral");
  });

  it("shows En curso badge as primary for ongoing status", () => {
    const tournament = {
      id: "t1",
      groupId: "g1",
      name: "Copa de Verano",
      format: "liga" as const,
      teamCount: 6,
      status: "en_curso" as const,
      championName: null,
    };

    render(<TournamentCard tournament={tournament} />);

    const badge = screen.getByText("En curso");
    expect(badge).toHaveAttribute("data-variant", "primary");
  });

  it("shows Finalizado badge as neutral for finished status", () => {
    const tournament = {
      id: "t1",
      groupId: "g1",
      name: "Copa de Verano",
      format: "liga" as const,
      teamCount: 6,
      status: "finalizado" as const,
      championName: null,
    };

    render(<TournamentCard tournament={tournament} />);

    const badge = screen.getByText("Finalizado");
    expect(badge).toHaveAttribute("data-variant", "neutral");
  });

  it("shows champion badge with Trophy icon when champion exists", () => {
    const tournament = {
      id: "t1",
      groupId: "g1",
      name: "Copa de Verano",
      format: "liga" as const,
      teamCount: 6,
      status: "finalizado" as const,
      championName: "Los Campeones",
    };

    render(<TournamentCard tournament={tournament} />);

    const championBadge = screen.getByText(/Campeón: Los Campeones/);
    expect(championBadge).toBeInTheDocument();
    expect(championBadge).toHaveAttribute("data-variant", "gold");
  });

  it("links to equipos page for borrador status", () => {
    const tournament = {
      id: "t1",
      groupId: "g1",
      name: "Copa de Verano",
      format: "liga" as const,
      teamCount: 6,
      status: "borrador" as const,
      championName: null,
    };

    render(<TournamentCard tournament={tournament} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/g/g1/torneos/t1/equipos");
  });

  it("links to tournament page for other statuses", () => {
    const tournament = {
      id: "t1",
      groupId: "g1",
      name: "Copa de Verano",
      format: "liga" as const,
      teamCount: 6,
      status: "en_curso" as const,
      championName: null,
    };

    render(<TournamentCard tournament={tournament} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/g/g1/torneos/t1");
  });

  it("shows Eliminación directa format with single team", () => {
    const tournament = {
      id: "t1",
      groupId: "g1",
      name: "Copa",
      format: "eliminacion" as const,
      teamCount: 1,
      status: "borrador" as const,
      championName: null,
    };

    render(<TournamentCard tournament={tournament} />);

    expect(screen.getByText(/Eliminación directa · 1 equipo/)).toBeInTheDocument();
  });
});

describe("TournamentForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockRefresh.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders name input, format options, and submit button", () => {
    render(<TournamentForm groupId="g1" />);

    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    const input = screen.getByPlaceholderText("Copa de verano") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe("");
    expect(screen.getByText("Liga")).toBeInTheDocument();
    expect(screen.getByText("Eliminación directa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Crear torneo/ })).toBeInTheDocument();
  });

  it("shows Ida y vuelta checkbox only when Liga format is selected", async () => {
    const user = userEvent.setup();
    render(<TournamentForm groupId="g1" />);

    expect(screen.getByLabelText("Ida y vuelta")).toBeInTheDocument();

    const eliminationRadio = screen.getByRole("radio", { name: /Llave con cruces/ });
    await user.click(eliminationRadio);

    expect(screen.queryByLabelText("Ida y vuelta")).not.toBeInTheDocument();

    const ligaRadio = screen.getByRole("radio", { name: /Todos contra todos/ });
    await user.click(ligaRadio);

    expect(screen.getByLabelText("Ida y vuelta")).toBeInTheDocument();
  });

  it("hides Ida y vuelta checkbox when Eliminación directa is selected", async () => {
    const user = userEvent.setup();
    render(<TournamentForm groupId="g1" />);

    const eliminationRadio = screen.getByRole("radio", { name: /Llave con cruces/ });
    await user.click(eliminationRadio);

    expect(screen.queryByLabelText("Ida y vuelta")).not.toBeInTheDocument();
  });

  it("shows validation error for name shorter than 2 characters", async () => {
    const user = userEvent.setup();
    render(<TournamentForm groupId="g1" />);

    const input = screen.getByLabelText("Nombre") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "A");

    const submitButton = screen.getByRole("button", { name: /Crear torneo/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/El nombre del torneo tiene que tener entre 2 y 60 caracteres/)
      ).toBeInTheDocument();
    });
  });

  it("does not call createTournament if validation fails", async () => {
    const user = userEvent.setup();
    const { createTournament } = await import("@/actions/tournaments");

    render(<TournamentForm groupId="g1" />);

    const input = screen.getByLabelText("Nombre") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "A");

    const submitButton = screen.getByRole("button", { name: /Crear torneo/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(createTournament).not.toHaveBeenCalled();
    });
  });

  it("calls createTournament with correct parameters for Liga format", async () => {
    const { createTournament } = await import("@/actions/tournaments");
    vi.mocked(createTournament).mockResolvedValue({
      ok: true,
      data: { tournamentId: "t1", redirectTo: "/g/g1/torneos/t1/equipos" },
    });

    const user = userEvent.setup();
    render(<TournamentForm groupId="g1" />);

    const input = screen.getByLabelText("Nombre") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "Copa de Verano");

    const submitButton = screen.getByRole("button", { name: /Crear torneo/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(createTournament).toHaveBeenCalledWith({
        groupId: "g1",
        name: "Copa de Verano",
        format: "liga",
        legs: 1,
      });
    });
  });

  it("calls createTournament with legs=2 when Ida y vuelta is checked", async () => {
    const { createTournament } = await import("@/actions/tournaments");
    vi.mocked(createTournament).mockResolvedValue({
      ok: true,
      data: { tournamentId: "t1", redirectTo: "/g/g1/torneos/t1/equipos" },
    });

    const user = userEvent.setup();
    render(<TournamentForm groupId="g1" />);

    const input = screen.getByLabelText("Nombre") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "Copa de Verano");

    const checkbox = screen.getByLabelText("Ida y vuelta") as HTMLInputElement;
    await user.click(checkbox);

    const submitButton = screen.getByRole("button", { name: /Crear torneo/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(createTournament).toHaveBeenCalledWith({
        groupId: "g1",
        name: "Copa de Verano",
        format: "liga",
        legs: 2,
      });
    });
  });

  it("calls createTournament with legs=1 for Eliminación directa", async () => {
    const { createTournament } = await import("@/actions/tournaments");
    vi.mocked(createTournament).mockResolvedValue({
      ok: true,
      data: { tournamentId: "t1", redirectTo: "/g/g1/torneos/t1/equipos" },
    });

    const user = userEvent.setup();
    render(<TournamentForm groupId="g1" />);

    const input = screen.getByLabelText("Nombre") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "Copa Directa");

    const eliminationRadio = screen.getByRole("radio", { name: /Llave con cruces/ });
    await user.click(eliminationRadio);

    const submitButton = screen.getByRole("button", { name: /Crear torneo/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(createTournament).toHaveBeenCalledWith({
        groupId: "g1",
        name: "Copa Directa",
        format: "eliminacion",
        legs: 1,
      });
    });
  });

  it("navigates to redirectTo on successful creation", async () => {
    const { createTournament } = await import("@/actions/tournaments");
    vi.mocked(createTournament).mockResolvedValue({
      ok: true,
      data: { tournamentId: "t1", redirectTo: "/g/g1/torneos/t1/equipos" },
    });

    const user = userEvent.setup();
    render(<TournamentForm groupId="g1" />);

    const input = screen.getByLabelText("Nombre") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "Copa");

    const submitButton = screen.getByRole("button", { name: /Crear torneo/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/g/g1/torneos/t1/equipos");
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("shows server error when createTournament fails", async () => {
    const { createTournament } = await import("@/actions/tournaments");
    vi.mocked(createTournament).mockResolvedValue({
      ok: false,
      error: "No se puede crear el torneo.",
    });

    const user = userEvent.setup();
    render(<TournamentForm groupId="g1" />);

    const input = screen.getByLabelText("Nombre") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "Copa");

    const submitButton = screen.getByRole("button", { name: /Crear torneo/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("No se puede crear el torneo.")).toBeInTheDocument();
    });
  });
});
