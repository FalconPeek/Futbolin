import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TournamentResultForm } from "./tournament-result-form";

// Mock modules
vi.mock("next/navigation", () => {
  const mockRouter = {
    push: vi.fn(),
    refresh: vi.fn(),
  };
  return {
    useRouter: vi.fn(() => mockRouter),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/actions/tournaments", () => ({
  reportTournamentResult: vi.fn(),
}));

// Import after mocks
import { reportTournamentResult } from "@/actions/tournaments";

const mockReportTournamentResult = reportTournamentResult as ReturnType<typeof vi.fn>;

const baseProps = {
  matchId: "match-1",
  tournamentId: "tournament-1",
  groupId: "group-1",
  home: {
    name: "Local",
    color: "#FF0000",
  },
  away: {
    name: "Visitante",
    color: "#0000FF",
  },
  initial: null,
};

describe("TournamentResultForm", () => {
  beforeEach(() => {
    mockReportTournamentResult.mockClear();
    vi.clearAllMocks();
  });

  it("does not show penalties in liga format even with a tie", async () => {
    const user = userEvent.setup();

    render(
      <TournamentResultForm
        {...baseProps}
        format="liga"
      />
    );

    // Enter a tie
    const homeInput = screen.getByRole("spinbutton", { name: /Goles de Local/i });
    const awayInput = screen.getByRole("spinbutton", { name: /Goles de Visitante/i });

    await user.clear(homeInput);
    await user.type(homeInput, "2");

    await user.clear(awayInput);
    await user.type(awayInput, "2");

    // Penalties should not appear
    expect(screen.queryByText(/En eliminación directa se define por penales/i)).not.toBeInTheDocument();
  });

  it("shows penalties in eliminacion with a tie including 0-0", async () => {
    const user = userEvent.setup();

    render(
      <TournamentResultForm
        {...baseProps}
        format="eliminacion"
      />
    );

    // Initially penalties shown because of 0-0 tie (initial state)
    expect(screen.getByText(/En eliminación directa se define por penales/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Penales de/)).toHaveLength(2);

    // Change to a different tie (2-2)
    const homeInput = screen.getByRole("spinbutton", { name: /Goles de Local/i });
    const awayInput = screen.getByRole("spinbutton", { name: /Goles de Visitante/i });

    await user.clear(homeInput);
    await user.type(homeInput, "2");

    await user.clear(awayInput);
    await user.type(awayInput, "2");

    // Penalties should still appear
    expect(screen.getByText(/En eliminación directa se define por penales/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Penales de/)).toHaveLength(2);
  });

  it("submits eliminacion 0-0 with penalties 5-4", async () => {
    const user = userEvent.setup();
    mockReportTournamentResult.mockResolvedValue({ ok: true });

    render(
      <TournamentResultForm
        {...baseProps}
        format="eliminacion"
      />
    );

    // Penalties should be visible immediately due to 0-0 initial state
    const penaltyInputs = screen.getAllByLabelText(/Penales de/);
    expect(penaltyInputs).toHaveLength(2);

    // Enter penalties for 0-0 tie
    await user.clear(penaltyInputs[0]);
    await user.type(penaltyInputs[0], "5");

    await user.clear(penaltyInputs[1]);
    await user.type(penaltyInputs[1], "4");

    // Click submit
    const submitButton = screen.getByRole("button", { name: /Guardar resultado/i });
    await user.click(submitButton);

    // Wait for async operation
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should have called the action with 0-0 and penalties 5-4
    expect(mockReportTournamentResult).toHaveBeenCalledWith({
      matchId: "match-1",
      tournamentId: "tournament-1",
      groupId: "group-1",
      format: "eliminacion",
      home_score: 0,
      away_score: 0,
      home_pens: 5,
      away_pens: 4,
    });
  });

  it("does not show penalties in eliminacion without a tie", async () => {
    const user = userEvent.setup();

    render(
      <TournamentResultForm
        {...baseProps}
        format="eliminacion"
      />
    );

    // Enter a non-tie
    const homeInput = screen.getByRole("spinbutton", { name: /Goles de Local/i });
    const awayInput = screen.getByRole("spinbutton", { name: /Goles de Visitante/i });

    await user.clear(homeInput);
    await user.type(homeInput, "3");

    await user.clear(awayInput);
    await user.type(awayInput, "2");

    // Penalties should not appear
    expect(screen.queryByText(/En eliminación directa se define por penales/i)).not.toBeInTheDocument();
  });

  it("shows error when penalties are equal in eliminacion with tie", async () => {
    const user = userEvent.setup();

    render(
      <TournamentResultForm
        {...baseProps}
        format="eliminacion"
      />
    );

    // Enter a tie with equal penalties
    const homeInput = screen.getByRole("spinbutton", { name: /Goles de Local/i });
    const awayInput = screen.getByRole("spinbutton", { name: /Goles de Visitante/i });

    await user.clear(homeInput);
    await user.type(homeInput, "2");

    await user.clear(awayInput);
    await user.type(awayInput, "2");

    // Now enter equal penalties
    const penaltyInputs = screen.getAllByLabelText(/Penales de/);
    await user.clear(penaltyInputs[0]);
    await user.type(penaltyInputs[0], "3");

    await user.clear(penaltyInputs[1]);
    await user.type(penaltyInputs[1], "3");

    // Click submit
    const submitButton = screen.getByRole("button", { name: /Guardar resultado/i });
    await user.click(submitButton);

    // Should show error
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/En eliminación directa no hay empate/i)).toBeInTheDocument();

    // Should not have called the action
    expect(mockReportTournamentResult).not.toHaveBeenCalled();
  });

  it("submits valid eliminacion result with penalties", async () => {
    const user = userEvent.setup();
    mockReportTournamentResult.mockResolvedValue({ ok: true });

    render(
      <TournamentResultForm
        {...baseProps}
        format="eliminacion"
      />
    );

    // Enter a tie with different penalties
    const homeInput = screen.getByRole("spinbutton", { name: /Goles de Local/i });
    const awayInput = screen.getByRole("spinbutton", { name: /Goles de Visitante/i });

    await user.clear(homeInput);
    await user.type(homeInput, "2");

    await user.clear(awayInput);
    await user.type(awayInput, "2");

    // Enter different penalties
    const penaltyInputs = screen.getAllByLabelText(/Penales de/);
    await user.clear(penaltyInputs[0]);
    await user.type(penaltyInputs[0], "4");

    await user.clear(penaltyInputs[1]);
    await user.type(penaltyInputs[1], "3");

    // Click submit
    const submitButton = screen.getByRole("button", { name: /Guardar resultado/i });
    await user.click(submitButton);

    // Wait for async operation
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should have called the action with correct payload
    expect(mockReportTournamentResult).toHaveBeenCalledWith({
      matchId: "match-1",
      tournamentId: "tournament-1",
      groupId: "group-1",
      format: "eliminacion",
      home_score: 2,
      away_score: 2,
      home_pens: 4,
      away_pens: 3,
    });
  });

  it("preloads initial values", async () => {
    render(
      <TournamentResultForm
        {...baseProps}
        format="liga"
        initial={{
          home_score: 3,
          away_score: 1,
          home_pens: null,
          away_pens: null,
        }}
      />
    );

    const homeInput = screen.getByRole("spinbutton", { name: /Goles de Local/i }) as HTMLInputElement;
    const awayInput = screen.getByRole("spinbutton", { name: /Goles de Visitante/i }) as HTMLInputElement;

    expect(homeInput.value).toBe("3");
    expect(awayInput.value).toBe("1");
  });

  it("preloads initial values including penalties", async () => {
    render(
      <TournamentResultForm
        {...baseProps}
        format="eliminacion"
        initial={{
          home_score: 2,
          away_score: 2,
          home_pens: 5,
          away_pens: 4,
        }}
      />
    );

    const homeInput = screen.getByRole("spinbutton", { name: /Goles de Local/i }) as HTMLInputElement;
    const awayInput = screen.getByRole("spinbutton", { name: /Goles de Visitante/i }) as HTMLInputElement;

    expect(homeInput.value).toBe("2");
    expect(awayInput.value).toBe("2");

    // Penalties should be visible since initial shows a tie
    const penaltyInputs = screen.getAllByLabelText(/Penales de/);
    expect(penaltyInputs).toHaveLength(2);

    const penaltyHome = penaltyInputs[0] as HTMLInputElement;
    const penaltyAway = penaltyInputs[1] as HTMLInputElement;

    expect(penaltyHome.value).toBe("5");
    expect(penaltyAway.value).toBe("4");
  });

  it("sends null penalties in liga even with tie", async () => {
    const user = userEvent.setup();
    mockReportTournamentResult.mockResolvedValue({ ok: true });

    render(
      <TournamentResultForm
        {...baseProps}
        format="liga"
      />
    );

    // Enter a tie
    const homeInput = screen.getByRole("spinbutton", { name: /Goles de Local/i });
    const awayInput = screen.getByRole("spinbutton", { name: /Goles de Visitante/i });

    await user.clear(homeInput);
    await user.type(homeInput, "2");

    await user.clear(awayInput);
    await user.type(awayInput, "2");

    // Click submit
    const submitButton = screen.getByRole("button", { name: /Guardar resultado/i });
    await user.click(submitButton);

    // Wait for async operation
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should have called with null penalties
    expect(mockReportTournamentResult).toHaveBeenCalledWith({
      matchId: "match-1",
      tournamentId: "tournament-1",
      groupId: "group-1",
      format: "liga",
      home_score: 2,
      away_score: 2,
      home_pens: null,
      away_pens: null,
    });
  });
});
