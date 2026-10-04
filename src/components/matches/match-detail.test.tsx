import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import * as matchesActions from "@/actions/matches"
import { AttendanceToggle } from "./attendance-toggle"
import { TeamLists } from "./team-lists"
import { MvpVote } from "./mvp-vote"
import { MatchActions } from "./match-actions"

vi.mock("@/actions/matches")

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

describe("AttendanceToggle", () => {
  const mockSetAttendance = vi.mocked(matchesActions.setAttendance)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders two buttons for attendance options", () => {
    render(
      <AttendanceToggle matchId="match-1" groupId="group-1" myStatus={null} />
    )
    expect(screen.getByRole("button", { name: "Voy" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "No voy" })).toBeInTheDocument()
  })

  it("marks Voy button as pressed when confirmed", () => {
    render(
      <AttendanceToggle matchId="match-1" groupId="group-1" myStatus="confirmado" />
    )
    const voyButton = screen.getByRole("button", { name: "Voy" })
    expect(voyButton).toHaveAttribute("aria-pressed", "true")
  })

  it("marks No voy button as pressed when baja", () => {
    render(
      <AttendanceToggle matchId="match-1" groupId="group-1" myStatus="baja" />
    )
    const noVoyButton = screen.getByRole("button", { name: "No voy" })
    expect(noVoyButton).toHaveAttribute("aria-pressed", "true")
  })

  it("calls setAttendance with confirmado when clicking Voy", async () => {
    mockSetAttendance.mockResolvedValue({ ok: true, data: undefined })
    const user = userEvent.setup()

    render(
      <AttendanceToggle matchId="match-1" groupId="group-1" myStatus={null} />
    )

    const voyButton = screen.getByRole("button", { name: "Voy" })
    await user.click(voyButton)

    await waitFor(() => {
      expect(mockSetAttendance).toHaveBeenCalledWith({
        matchId: "match-1",
        groupId: "group-1",
        status: "confirmado",
      })
    })
  })

  it("calls setAttendance with baja when clicking No voy", async () => {
    mockSetAttendance.mockResolvedValue({ ok: true, data: undefined })
    const user = userEvent.setup()

    render(
      <AttendanceToggle matchId="match-1" groupId="group-1" myStatus={null} />
    )

    const noVoyButton = screen.getByRole("button", { name: "No voy" })
    await user.click(noVoyButton)

    await waitFor(() => {
      expect(mockSetAttendance).toHaveBeenCalledWith({
        matchId: "match-1",
        groupId: "group-1",
        status: "baja",
      })
    })
  })
})

describe("TeamLists", () => {
  it("shows team columns when teams are assigned", () => {
    const players = [
      {
        userId: "user-1",
        name: "Juan",
        attendance: "confirmado" as const,
        team: "A" as const,
        goals: 2,
        assists: 1,
      },
      {
        userId: "user-2",
        name: "Pedro",
        attendance: "confirmado" as const,
        team: "B" as const,
        goals: 1,
        assists: 0,
      },
    ]

    render(<TeamLists players={players} status="programado" />)

    expect(screen.getByText("Equipo A")).toBeInTheDocument()
    expect(screen.getByText("Equipo B")).toBeInTheDocument()
  })

  it("shows score when finalized", () => {
    const players = [
      {
        userId: "user-1",
        name: "Juan",
        attendance: "confirmado" as const,
        team: "A" as const,
        goals: 2,
        assists: 1,
      },
    ]

    render(
      <TeamLists players={players} status="finalizado" scoreA={3} scoreB={2} />
    )

    expect(screen.getByText("3 – 2")).toBeInTheDocument()
  })

  it("shows goals and assists when finalized", () => {
    const players = [
      {
        userId: "user-1",
        name: "Juan",
        attendance: "confirmado" as const,
        team: "A" as const,
        goals: 2,
        assists: 1,
      },
    ]

    render(
      <TeamLists players={players} status="finalizado" scoreA={3} scoreB={2} />
    )

    expect(screen.getByText(/2 G/)).toBeInTheDocument()
    expect(screen.getByText(/1 A/)).toBeInTheDocument()
  })

  it("shows confirmed list when no teams assigned", () => {
    const players = [
      {
        userId: "user-1",
        name: "Juan",
        attendance: "confirmado" as const,
        team: null,
        goals: 0,
        assists: 0,
      },
    ]

    render(<TeamLists players={players} status="programado" />)

    expect(screen.getByText(/Confirmados \(1\)/)).toBeInTheDocument()
    expect(screen.getByText("Juan")).toBeInTheDocument()
  })

  it("shows baja list when there are withdrawals", () => {
    const players = [
      {
        userId: "user-1",
        name: "Juan",
        attendance: "confirmado" as const,
        team: null,
        goals: 0,
        assists: 0,
      },
      {
        userId: "user-2",
        name: "Pedro",
        attendance: "baja" as const,
        team: null,
        goals: 0,
        assists: 0,
      },
    ]

    render(<TeamLists players={players} status="programado" />)

    expect(screen.getByText(/Se bajaron \(1\)/)).toBeInTheDocument()
  })
})

describe("MvpVote", () => {
  const mockVoteMvp = vi.mocked(matchesActions.voteMvp)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not include current user in candidates", () => {
    render(
      <MvpVote
        matchId="match-1"
        groupId="group-1"
        candidates={[
          { userId: "user-2", name: "Juan" },
          { userId: "user-3", name: "Pedro" },
        ]}
        canVote
        myVote={null}
        eligible={2}
        votesCast={1}
        closed={false}
        mvpNames={[]}
      />
    )

    expect(screen.getByText("Juan")).toBeInTheDocument()
    expect(screen.getByText("Pedro")).toBeInTheDocument()
  })

  it("shows vote count while voting is open", () => {
    render(
      <MvpVote
        matchId="match-1"
        groupId="group-1"
        candidates={[{ userId: "user-2", name: "Juan" }]}
        canVote
        myVote={null}
        eligible={5}
        votesCast={2}
        closed={false}
        mvpNames={[]}
      />
    )

    expect(screen.getByText("2 de 5 votaron")).toBeInTheDocument()
  })

  it("shows 'Ya votaste' when user has already voted", () => {
    render(
      <MvpVote
        matchId="match-1"
        groupId="group-1"
        candidates={[{ userId: "user-2", name: "Juan" }]}
        canVote={false}
        myVote="user-2"
        eligible={5}
        votesCast={3}
        closed={false}
        mvpNames={[]}
      />
    )

    expect(screen.getByText("Ya votaste.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Votá" })).not.toBeInTheDocument()
  })

  it("shows MVP names and badge when voting is closed", () => {
    render(
      <MvpVote
        matchId="match-1"
        groupId="group-1"
        candidates={[]}
        canVote={false}
        myVote={null}
        eligible={5}
        votesCast={5}
        closed
        mvpNames={["Juan", "Pedro"]}
      />
    )

    expect(screen.getByText(/MVP: Juan, Pedro/)).toBeInTheDocument()
  })

  it("shows 'Nadie votó' when closed with no votes", () => {
    render(
      <MvpVote
        matchId="match-1"
        groupId="group-1"
        candidates={[]}
        canVote={false}
        myVote={null}
        eligible={5}
        votesCast={0}
        closed
        mvpNames={[]}
      />
    )

    expect(screen.getByText("Nadie votó.")).toBeInTheDocument()
  })

  it("does not show mvp names while voting is open", () => {
    render(
      <MvpVote
        matchId="match-1"
        groupId="group-1"
        candidates={[{ userId: "user-2", name: "Juan" }]}
        canVote
        myVote={null}
        eligible={5}
        votesCast={2}
        closed={false}
        mvpNames={["Juan"]}
      />
    )

    expect(screen.queryByText(/MVP:/)).not.toBeInTheDocument()
  })

  it("calls voteMvp with selected candidate when voting", async () => {
    mockVoteMvp.mockResolvedValue({ ok: true, data: undefined })
    const user = userEvent.setup()

    render(
      <MvpVote
        matchId="match-1"
        groupId="group-1"
        candidates={[
          { userId: "user-2", name: "Juan" },
          { userId: "user-3", name: "Pedro" },
        ]}
        canVote
        myVote={null}
        eligible={5}
        votesCast={2}
        closed={false}
        mvpNames={[]}
      />
    )

    const juanRadio = screen.getByDisplayValue("user-2")
    await user.click(juanRadio)

    const votarButton = screen.getByRole("button", { name: "Votá" })
    await user.click(votarButton)

    await waitFor(() => {
      expect(mockVoteMvp).toHaveBeenCalledWith({
        matchId: "match-1",
        groupId: "group-1",
        votedId: "user-2",
      })
    })
  })
})

describe("MatchActions", () => {
  const mockCancelMatch = vi.mocked(matchesActions.cancelMatch)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders action buttons", () => {
    render(<MatchActions matchId="match-1" groupId="group-1" />)

    expect(screen.getByRole("link", { name: "Armar equipos" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Cargar resultado" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancelar partido" })).toBeInTheDocument()
  })

  it("has correct links for equipos and resultado", () => {
    render(<MatchActions matchId="match-1" groupId="group-1" />)

    const equiposLink = screen.getByRole("link", { name: "Armar equipos" })
    expect(equiposLink).toHaveAttribute(
      "href",
      "/g/group-1/partidos/match-1/equipos"
    )

    const resultadoLink = screen.getByRole("link", { name: "Cargar resultado" })
    expect(resultadoLink).toHaveAttribute(
      "href",
      "/g/group-1/partidos/match-1/resultado"
    )
  })

  it("opens dialog when cancel button is clicked", async () => {
    const user = userEvent.setup()

    render(<MatchActions matchId="match-1" groupId="group-1" />)

    const cancelButton = screen.getByRole("button", { name: "Cancelar partido" })
    await user.click(cancelButton)

    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("calls cancelMatch when confirming in dialog", async () => {
    mockCancelMatch.mockResolvedValue({ ok: true, data: undefined })
    const user = userEvent.setup()

    render(<MatchActions matchId="match-1" groupId="group-1" />)

    const cancelButton = screen.getByRole("button", { name: "Cancelar partido" })
    await user.click(cancelButton)

    const confirmButton = screen.getByRole("button", { name: "Cancelar partido" })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(mockCancelMatch).toHaveBeenCalledWith({
        matchId: "match-1",
        groupId: "group-1",
      })
    })
  })

  it("closes dialog after successful cancel", async () => {
    mockCancelMatch.mockResolvedValue({ ok: true, data: undefined })
    const user = userEvent.setup()

    render(<MatchActions matchId="match-1" groupId="group-1" />)

    const cancelButton = screen.getByRole("button", { name: "Cancelar partido" })
    await user.click(cancelButton)

    const confirmButton = screen.getByRole("button", { name: "Cancelar partido" })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })
})
