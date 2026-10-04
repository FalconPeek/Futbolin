import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TeamPicker, type TeamPickerPlayer } from "./team-picker";
import { balanceTeams } from "@/lib/matches/balance";

// Mock dependencies
vi.mock("@/actions/matches", () => ({
  assignTeams: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const mockAssignTeams = vi.mocked(
  (await import("@/actions/matches")).assignTeams
);
const mockToast = vi.mocked((await import("sonner")).toast);

describe("TeamPicker", () => {
  const mockPlayers: TeamPickerPlayer[] = [
    {
      userId: "player-1",
      name: "Juan",
      position: "MC",
      ovr: 75,
      team: null,
    },
    {
      userId: "player-2",
      name: "Carlos",
      position: "DFC",
      ovr: 80,
      team: null,
    },
    {
      userId: "player-3",
      name: "Marco",
      position: "POR",
      ovr: null,
      team: null,
    },
    {
      userId: "player-4",
      name: "Diego",
      position: "EI",
      ovr: 70,
      team: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockAssignTeams.mockResolvedValue({ ok: true, data: undefined });
  });

  it("should display all players", () => {
    render(
      <TeamPicker
        matchId="match-1"
        groupId="group-1"
        players={mockPlayers}
      />
    );

    expect(screen.getByText("Juan")).toBeInTheDocument();
    expect(screen.getByText("Carlos")).toBeInTheDocument();
    expect(screen.getByText("Marco")).toBeInTheDocument();
    expect(screen.getByText("Diego")).toBeInTheDocument();
  });

  it("should display OVR as '–' when null", () => {
    render(
      <TeamPicker
        matchId="match-1"
        groupId="group-1"
        players={mockPlayers}
      />
    );

    // Marco has null OVR
    const rows = screen.getAllByText("Marco");
    const marcoRow = rows[0].closest(".bg-card");
    expect(marcoRow).toHaveTextContent("–");
  });

  it("should display OVR values when not null", () => {
    render(
      <TeamPicker
        matchId="match-1"
        groupId="group-1"
        players={mockPlayers}
      />
    );

    // Check that OVRs are displayed
    expect(screen.getByText("75")).toBeInTheDocument(); // Juan
    expect(screen.getByText("80")).toBeInTheDocument(); // Carlos
    expect(screen.getByText("70")).toBeInTheDocument(); // Diego
  });

  it("should move a player to team B when button is clicked", () => {
    render(
      <TeamPicker
        matchId="match-1"
        groupId="group-1"
        players={mockPlayers}
      />
    );

    // Find the button for Juan's team B
    const buttons = screen.getAllByRole("button");
    // Each player has 3 buttons (A, B, Sin equipo), so Juan's B button is at index 1
    const juanBButton = buttons[1];
    fireEvent.click(juanBButton);

    // Check that Juan is now in team B
    expect(juanBButton).toHaveAttribute("aria-pressed", "true");

    // Verify team summaries updated
    // Team B should now have 1 player
    const teamBSection = screen.getByText("Equipo B").closest("div");
    expect(teamBSection).toHaveTextContent("1 jugador");

    // Team B OVR should be Juan's OVR (75)
    const teamBOvrElement = teamBSection?.querySelector(".text-display");
    expect(teamBOvrElement).toHaveTextContent("75");
  });

  it("should calculate team OVR with null values as 60", () => {
    const playersWithNull = [
      { userId: "p1", name: "A", position: "MC", ovr: 80, team: null },
      { userId: "p2", name: "B", position: "POR", ovr: null, team: null },
    ];

    render(
      <TeamPicker
        matchId="match-1"
        groupId="group-1"
        players={playersWithNull}
      />
    );

    // Move A to team A (80) and B to team A (null → 60)
    const aButton = screen.getByLabelText("Mandar a A al equipo A");
    const bButton = screen.getByLabelText("Mandar a B al equipo A");
    fireEvent.click(aButton);
    fireEvent.click(bButton);

    // Team A OVR should be 80 + 60 = 140
    const teamASection = screen.getByText("Equipo A").closest("div");
    const teamAOvr = teamASection?.querySelector(".text-display");
    expect(teamAOvr).toHaveTextContent("140");
  });

  it("should apply balanceTeams when 'Armar parejo' is clicked", () => {
    render(
      <TeamPicker
        matchId="match-1"
        groupId="group-1"
        players={mockPlayers}
      />
    );

    const balanceButton = screen.getByText("Armar parejo");
    fireEvent.click(balanceButton);

    // Get expected result from balanceTeams
    const expected = balanceTeams(
      mockPlayers.map((p) => ({
        id: p.userId,
        ovr: p.ovr,
        position: p.position,
      }))
    );

    // Verify that players are distributed according to balanceTeams
    expected.A.forEach((playerId) => {
      const player = mockPlayers.find((p) => p.userId === playerId);
      if (player) {
        const aButton = screen.getByLabelText(
          `Mandar a ${player.name} al equipo A`
        );
        expect(aButton).toHaveAttribute("aria-pressed", "true");
      }
    });

    expected.B.forEach((playerId) => {
      const player = mockPlayers.find((p) => p.userId === playerId);
      if (player) {
        const bButton = screen.getByLabelText(
          `Mandar a ${player.name} al equipo B`
        );
        expect(bButton).toHaveAttribute("aria-pressed", "true");
      }
    });
  });

  it("should call assignTeams with correct payload when saving", async () => {
    render(
      <TeamPicker
        matchId="match-1"
        groupId="group-1"
        players={mockPlayers}
      />
    );

    // Set teams manually using aria-labels
    const juan = screen.getByLabelText("Mandar a Juan al equipo A");
    const carlos = screen.getByLabelText("Mandar a Carlos al equipo A");
    const marco = screen.getByLabelText("Mandar a Marco al equipo B");
    const diego = screen.getByLabelText("Mandar a Diego al equipo B");

    fireEvent.click(juan);
    fireEvent.click(carlos);
    fireEvent.click(marco);
    fireEvent.click(diego);

    // Click save button
    const saveButton = screen.getByText("Guardar equipos");
    fireEvent.click(saveButton);

    // Wait for the action to be called
    await waitFor(() => {
      expect(mockAssignTeams).toHaveBeenCalled();
    });

    const callArgs = mockAssignTeams.mock.calls[0][0] as unknown;
    const typedArgs = callArgs as {
      matchId: string;
      groupId: string;
      assignments: Array<{ user_id: string; team: "A" | "B" | null }>;
    };

    expect(typedArgs).toEqual({
      matchId: "match-1",
      groupId: "group-1",
      assignments: [
        { user_id: "player-1", team: "A" },
        { user_id: "player-2", team: "A" },
        { user_id: "player-3", team: "B" },
        { user_id: "player-4", team: "B" },
      ],
    });
  });

  it("should show success toast on save success", async () => {
    mockAssignTeams.mockResolvedValue({ ok: true, data: undefined });

    render(
      <TeamPicker
        matchId="match-1"
        groupId="group-1"
        players={mockPlayers}
      />
    );

    const saveButton = screen.getByText("Guardar equipos");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Guardamos los equipos.");
    });
  });

  it("should show error toast on save failure", async () => {
    mockAssignTeams.mockResolvedValue({
      ok: false,
      error: "No se pudo guardar",
    });

    render(
      <TeamPicker
        matchId="match-1"
        groupId="group-1"
        players={mockPlayers}
      />
    );

    const saveButton = screen.getByText("Guardar equipos");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("No se pudo guardar");
    });
  });

  it("should display position as label-caps", () => {
    render(
      <TeamPicker
        matchId="match-1"
        groupId="group-1"
        players={mockPlayers}
      />
    );

    // Check that positions are displayed
    const mcElement = screen.getByText("MC");
    expect(mcElement).toHaveClass("label-caps");
  });
});
