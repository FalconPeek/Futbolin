import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { addTeam, updateTeam, removeTeam, startTournament } from "@/actions/tournaments";
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

const NAME_ERROR = "El nombre del equipo tiene que tener entre 1 y 30 caracteres.";

const twoTeams = [
  { id: "team1", name: "Los Galácticos", color: "#e53935" },
  { id: "team2", name: "Los Campeones", color: "#1e88e5" },
];

describe("TeamEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockRefresh.mockClear();
    vi.mocked(addTeam).mockResolvedValue({ ok: true, data: null });
    vi.mocked(updateTeam).mockResolvedValue({ ok: true, data: null });
    vi.mocked(removeTeam).mockResolvedValue({ ok: true, data: null });
    vi.mocked(startTournament).mockResolvedValue({
      ok: true,
      data: { redirectTo: "/g/g1/torneos/t1" },
    });
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
  describe("agregar", () => {
    it("llama a addTeam con el nombre y el color elegido y limpia el input", async () => {
      const user = userEvent.setup();
      render(<TeamEditor tournamentId="t1" groupId="g1" format="liga" teams={[]} />);

      const input = screen.getByLabelText("Nombre del equipo");
      await user.type(input, "Los Galácticos");
      await user.click(screen.getByRole("radio", { name: "Azul" }));
      expect(screen.getByRole("radio", { name: "Azul" })).toHaveAttribute("aria-checked", "true");
      expect(screen.getByRole("radio", { name: "Rojo" })).toHaveAttribute("aria-checked", "false");

      await user.click(screen.getByRole("button", { name: "Agregar equipo" }));

      expect(addTeam).toHaveBeenCalledTimes(1);
      expect(addTeam).toHaveBeenCalledWith({
        tournamentId: "t1",
        groupId: "g1",
        name: "Los Galácticos",
        color: "#1e88e5",
      });
      await waitFor(() => expect(input).toHaveValue(""));
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("usa el primer color de la paleta si no se elige otro y recorta el nombre", async () => {
      const user = userEvent.setup();
      render(<TeamEditor tournamentId="t1" groupId="g1" format="liga" teams={[]} />);

      await user.type(screen.getByLabelText("Nombre del equipo"), "  Los Pibes  ");
      await user.click(screen.getByRole("button", { name: "Agregar equipo" }));

      expect(addTeam).toHaveBeenCalledWith({
        tournamentId: "t1",
        groupId: "g1",
        name: "Los Pibes",
        color: "#e53935",
      });
    });

    it("con el nombre vacío muestra el error del schema y no llama a addTeam", async () => {
      const user = userEvent.setup();
      render(<TeamEditor tournamentId="t1" groupId="g1" format="liga" teams={[]} />);

      await user.click(screen.getByRole("button", { name: "Agregar equipo" }));

      expect(screen.getByText(NAME_ERROR)).toBeInTheDocument();
      expect(addTeam).not.toHaveBeenCalled();
    });

    it("con solo espacios tampoco llama a addTeam", async () => {
      const user = userEvent.setup();
      render(<TeamEditor tournamentId="t1" groupId="g1" format="liga" teams={[]} />);

      await user.type(screen.getByLabelText("Nombre del equipo"), "   ");
      await user.click(screen.getByRole("button", { name: "Agregar equipo" }));

      expect(screen.getByText(NAME_ERROR)).toBeInTheDocument();
      expect(addTeam).not.toHaveBeenCalled();
    });

    it("si addTeam falla muestra el error del servidor y conserva el nombre", async () => {
      vi.mocked(addTeam).mockResolvedValue({ ok: false, error: "Ya hay un equipo con ese nombre." });
      const user = userEvent.setup();
      render(<TeamEditor tournamentId="t1" groupId="g1" format="liga" teams={[]} />);

      const input = screen.getByLabelText("Nombre del equipo");
      await user.type(input, "Los Galácticos");
      await user.click(screen.getByRole("button", { name: "Agregar equipo" }));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Ya hay un equipo con ese nombre.")
      );
      expect(input).toHaveValue("Los Galácticos");
    });

    it("con 16 equipos no deja agregar", async () => {
      const user = userEvent.setup();
      const teams = Array.from({ length: 16 }, (_, i) => ({
        id: `team${i}`,
        name: `Team ${i}`,
        color: "#e53935",
      }));
      render(<TeamEditor tournamentId="t1" groupId="g1" format="liga" teams={teams} />);

      expect(screen.getByLabelText("Nombre del equipo")).toBeDisabled();
      expect(screen.getByRole("radio", { name: "Azul" })).toBeDisabled();
      await user.click(screen.getByRole("button", { name: "Agregar equipo" }));

      expect(addTeam).not.toHaveBeenCalled();
    });

    it("con 15 equipos todavía deja agregar", () => {
      const teams = Array.from({ length: 15 }, (_, i) => ({
        id: `team${i}`,
        name: `Team ${i}`,
        color: "#e53935",
      }));
      render(<TeamEditor tournamentId="t1" groupId="g1" format="liga" teams={teams} />);

      expect(screen.getByRole("button", { name: "Agregar equipo" })).toBeEnabled();
      expect(screen.queryByText("Llegaste al máximo de 16 equipos.")).not.toBeInTheDocument();
    });
  });

  describe("quitar", () => {
    it("llama a removeTeam con el id real del equipo", async () => {
      const user = userEvent.setup();
      render(<TeamEditor tournamentId="t1" groupId="g1" format="liga" teams={twoTeams} />);

      await user.click(screen.getByRole("button", { name: "Quitar Los Campeones" }));

      expect(removeTeam).toHaveBeenCalledTimes(1);
      expect(removeTeam).toHaveBeenCalledWith({
        teamId: "team2",
        tournamentId: "t1",
        groupId: "g1",
      });
    });

    it("si removeTeam falla muestra el error", async () => {
      vi.mocked(removeTeam).mockResolvedValue({ ok: false, error: "No podés quitar equipos." });
      const user = userEvent.setup();
      render(<TeamEditor tournamentId="t1" groupId="g1" format="liga" teams={twoTeams} />);

      await user.click(screen.getByRole("button", { name: "Quitar Los Galácticos" }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("No podés quitar equipos."));
    });

    it("muestra la lista nueva cuando el servidor devuelve menos equipos", () => {
      const { rerender } = render(
        <TeamEditor tournamentId="t1" groupId="g1" format="liga" teams={twoTeams} />
      );
      expect(screen.getByText("Equipos (2)")).toBeInTheDocument();

      rerender(<TeamEditor tournamentId="t1" groupId="g1" format="liga" teams={[twoTeams[0]]} />);

      expect(screen.getByText("Equipos (1)")).toBeInTheDocument();
      expect(screen.queryByText("Los Campeones")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Empezar torneo/ })).toBeDisabled();
    });
  });

  describe("renombrar", () => {
    it("llama a updateTeam con el nombre nuevo y el color que ya tenía", async () => {
      const user = userEvent.setup();
      render(<TeamEditor tournamentId="t1" groupId="g1" format="liga" teams={twoTeams} />);

      await user.click(screen.getByRole("button", { name: "Renombrar Los Campeones" }));
      const input = screen.getByLabelText("Nuevo nombre de Los Campeones");
      expect(input).toHaveValue("Los Campeones");
      await user.clear(input);
      await user.type(input, "Los Invencibles");
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      expect(updateTeam).toHaveBeenCalledTimes(1);
      expect(updateTeam).toHaveBeenCalledWith({
        teamId: "team2",
        tournamentId: "t1",
        groupId: "g1",
        name: "Los Invencibles",
        color: "#1e88e5",
      });
      await waitFor(() =>
        expect(screen.queryByLabelText("Nuevo nombre de Los Campeones")).not.toBeInTheDocument()
      );
    });

    it("con el nombre vacío muestra el error y no llama a updateTeam", async () => {
      const user = userEvent.setup();
      render(<TeamEditor tournamentId="t1" groupId="g1" format="liga" teams={twoTeams} />);

      await user.click(screen.getByRole("button", { name: "Renombrar Los Galácticos" }));
      await user.clear(screen.getByLabelText("Nuevo nombre de Los Galácticos"));
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      expect(screen.getByText(NAME_ERROR)).toBeInTheDocument();
      expect(updateTeam).not.toHaveBeenCalled();
    });

    it("cancelar vuelve a la lista sin llamar a updateTeam", async () => {
      const user = userEvent.setup();
      render(<TeamEditor tournamentId="t1" groupId="g1" format="liga" teams={twoTeams} />);

      await user.click(screen.getByRole("button", { name: "Renombrar Los Galácticos" }));
      await user.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(updateTeam).not.toHaveBeenCalled();
      expect(screen.getByText("Los Galácticos")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Renombrar Los Galácticos" })).toBeInTheDocument();
    });

    it("si updateTeam falla muestra el error y sigue editando", async () => {
      vi.mocked(updateTeam).mockResolvedValue({ ok: false, error: "Ya hay un equipo con ese nombre." });
      const user = userEvent.setup();
      render(<TeamEditor tournamentId="t1" groupId="g1" format="liga" teams={twoTeams} />);

      await user.click(screen.getByRole("button", { name: "Renombrar Los Galácticos" }));
      const input = screen.getByLabelText("Nuevo nombre de Los Galácticos");
      await user.clear(input);
      await user.type(input, "Los Campeones");
      await user.click(screen.getByRole("button", { name: "Guardar" }));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Ya hay un equipo con ese nombre.")
      );
      expect(screen.getByLabelText("Nuevo nombre de Los Galácticos")).toBeInTheDocument();
    });
  });

  describe("empezar torneo", () => {
    it("con 2 equipos llama a startTournament y navega a redirectTo", async () => {
      const user = userEvent.setup();
      render(<TeamEditor tournamentId="t1" groupId="g1" format="liga" teams={twoTeams} />);

      await user.click(screen.getByRole("button", { name: "Empezar torneo" }));

      expect(startTournament).toHaveBeenCalledTimes(1);
      expect(startTournament).toHaveBeenCalledWith({ tournamentId: "t1", groupId: "g1" });
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/g/g1/torneos/t1"));
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("con menos de 2 equipos no llama a startTournament", async () => {
      const user = userEvent.setup();
      render(<TeamEditor tournamentId="t1" groupId="g1" format="liga" teams={[twoTeams[0]]} />);

      const startButton = screen.getByRole("button", { name: "Empezar torneo" });
      expect(startButton).toBeDisabled();
      await user.click(startButton);

      expect(startTournament).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("si startTournament falla muestra el error y no navega", async () => {
      vi.mocked(startTournament).mockResolvedValue({
        ok: false,
        error: "Hacen falta al menos 2 equipos.",
      });
      const user = userEvent.setup();
      render(<TeamEditor tournamentId="t1" groupId="g1" format="liga" teams={twoTeams} />);

      await user.click(screen.getByRole("button", { name: "Empezar torneo" }));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Hacen falta al menos 2 equipos.")
      );
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
