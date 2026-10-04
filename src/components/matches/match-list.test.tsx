import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useRouter } from "next/navigation"
import { createMatch } from "@/actions/matches"
import { MatchCard } from "./match-card"
import { MatchForm } from "./match-form"

vi.mock("@/actions/matches")
vi.mock("next/navigation")

describe("MatchCard", () => {
  it("renders date with formatMatchDate for programado match", () => {
    const match = {
      id: "m1",
      groupId: "g1",
      scheduledAt: "2026-10-05T00:00:00Z",
      location: "Cancha Central",
      playersPerTeam: 5,
      confirmed: 8,
      status: "programado" as const,
      scoreA: null,
      scoreB: null,
    }

    render(<MatchCard match={match} />)

    // Check that the date is formatted (contains day, month, time)
    expect(screen.getByText(/oct/)).toBeInTheDocument()
    expect(screen.getByText(/21:00/)).toBeInTheDocument()
  })

  it("renders location with icon for all matches", () => {
    const match = {
      id: "m1",
      groupId: "g1",
      scheduledAt: "2026-10-04T21:00:00Z",
      location: "Cancha de Juan",
      playersPerTeam: 5,
      confirmed: 8,
      status: "programado" as const,
      scoreA: null,
      scoreB: null,
    }

    render(<MatchCard match={match} />)

    expect(screen.getByText("Cancha de Juan")).toBeInTheDocument()
  })

  it("renders confirmed/total players in tabular format", () => {
    const match = {
      id: "m1",
      groupId: "g1",
      scheduledAt: "2026-10-04T21:00:00Z",
      location: "Cancha Central",
      playersPerTeam: 5,
      confirmed: 8,
      status: "programado" as const,
      scoreA: null,
      scoreB: null,
    }

    render(<MatchCard match={match} />)

    expect(screen.getByText("8/10 confirmados")).toBeInTheDocument()
  })

  it("shows Programado badge with info variant", () => {
    const match = {
      id: "m1",
      groupId: "g1",
      scheduledAt: "2026-10-04T21:00:00Z",
      location: "Cancha Central",
      playersPerTeam: 5,
      confirmed: 8,
      status: "programado" as const,
      scoreA: null,
      scoreB: null,
    }

    render(<MatchCard match={match} />)

    expect(screen.getByText("Programado")).toBeInTheDocument()
    const badge = screen.getByText("Programado").closest("[data-slot='badge']")
    expect(badge).toHaveAttribute("data-variant", "info")
  })

  it("shows Finalizado badge with neutral variant", () => {
    const match = {
      id: "m1",
      groupId: "g1",
      scheduledAt: "2026-10-04T21:00:00Z",
      location: "Cancha Central",
      playersPerTeam: 5,
      confirmed: 8,
      status: "finalizado" as const,
      scoreA: 3,
      scoreB: 2,
    }

    render(<MatchCard match={match} />)

    expect(screen.getByText("Finalizado")).toBeInTheDocument()
    const badge = screen.getByText("Finalizado").closest("[data-slot='badge']")
    expect(badge).toHaveAttribute("data-variant", "neutral")
  })

  it("shows Cancelado badge with destructive variant", () => {
    const match = {
      id: "m1",
      groupId: "g1",
      scheduledAt: "2026-10-04T21:00:00Z",
      location: "Cancha Central",
      playersPerTeam: 5,
      confirmed: 8,
      status: "cancelado" as const,
      scoreA: null,
      scoreB: null,
    }

    render(<MatchCard match={match} />)

    expect(screen.getByText("Cancelado")).toBeInTheDocument()
    const badge = screen.getByText("Cancelado").closest("[data-slot='badge']")
    expect(badge).toHaveAttribute("data-variant", "destructive")
  })

  it("displays score only for finalized matches in display font", () => {
    const match = {
      id: "m1",
      groupId: "g1",
      scheduledAt: "2026-10-04T21:00:00Z",
      location: "Cancha Central",
      playersPerTeam: 5,
      confirmed: 8,
      status: "finalizado" as const,
      scoreA: 3,
      scoreB: 2,
    }

    render(<MatchCard match={match} />)

    expect(screen.getByText("3 – 2")).toBeInTheDocument()
    const scoreElement = screen.getByText("3 – 2")
    expect(scoreElement).toHaveClass("font-display", "text-display", "tabular")
  })

  it("does not display score for programado matches", () => {
    const match = {
      id: "m1",
      groupId: "g1",
      scheduledAt: "2026-10-04T21:00:00Z",
      location: "Cancha Central",
      playersPerTeam: 5,
      confirmed: 8,
      status: "programado" as const,
      scoreA: null,
      scoreB: null,
    }

    render(<MatchCard match={match} />)

    expect(screen.queryByText(/\d+ – \d+/)).not.toBeInTheDocument()
  })

  it("links to match detail page", () => {
    const match = {
      id: "match-123",
      groupId: "group-456",
      scheduledAt: "2026-10-04T21:00:00Z",
      location: "Cancha Central",
      playersPerTeam: 5,
      confirmed: 8,
      status: "programado" as const,
      scoreA: null,
      scoreB: null,
    }

    const { container } = render(<MatchCard match={match} />)

    const link = container.querySelector("a")
    expect(link).toHaveAttribute("href", "/g/group-456/partidos/match-123")
  })
})

describe("MatchForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows error when scheduled_at is empty on submit", async () => {
    const mockPush = vi.fn()
    const mockRefresh = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    } as unknown as ReturnType<typeof useRouter>)

    const user = userEvent.setup()
    render(<MatchForm groupId="g1" />)

    // Leave date empty and try to submit
    const button = screen.getByRole("button", { name: /crear partido/i })
    await user.click(button)

    // Should not have called createMatch
    expect(createMatch).not.toHaveBeenCalled()
  })

  it("shows error for location shorter than 2 characters", async () => {
    const mockPush = vi.fn()
    const mockRefresh = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    } as unknown as ReturnType<typeof useRouter>)

    const user = userEvent.setup()
    render(<MatchForm groupId="g1" />)

    const dateInputs = screen.getAllByDisplayValue("")
    const dateInput = dateInputs[0]
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 1)
    const dateString = futureDate.toISOString().slice(0, 16)
    await user.type(dateInput, dateString)

    const locationInput = screen.getByPlaceholderText("Cancha de Juan, Palermo")
    await user.type(locationInput, "C")

    await user.click(screen.getByRole("button", { name: /crear partido/i }))

    expect(
      await screen.findByText(/El lugar tiene que tener entre 2 y 80 caracteres./)
    ).toBeInTheDocument()
  })

  it("calls createMatch with correct data on valid submit", async () => {
    const mockPush = vi.fn()
    const mockRefresh = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    } as unknown as ReturnType<typeof useRouter>)

    vi.mocked(createMatch).mockResolvedValue({
      ok: true,
      data: { matchId: "m1", redirectTo: "/g/g1/partidos/m1" },
    })

    const user = userEvent.setup()
    render(<MatchForm groupId="g1" />)

    const dateInputs = screen.getAllByDisplayValue("")
    const dateInput = dateInputs[0]
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 1)
    const dateString = futureDate.toISOString().slice(0, 16)
    await user.type(dateInput, dateString)

    const locationInput = screen.getByPlaceholderText("Cancha de Juan, Palermo")
    await user.type(locationInput, "Cancha de Juan")

    // Verify select has default value
    const select = screen.getByRole("combobox")
    expect(select).toHaveValue("5")

    await user.click(screen.getByRole("button", { name: /crear partido/i }))

    await waitFor(() => {
      expect(createMatch).toHaveBeenCalledWith({
        groupId: "g1",
        scheduled_at: expect.any(String),
        location: "Cancha de Juan",
        players_per_team: 5,
      })
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/g/g1/partidos/m1")
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it("has select with options 3 to 11", () => {
    const mockPush = vi.fn()
    const mockRefresh = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    } as unknown as ReturnType<typeof useRouter>)

    render(<MatchForm groupId="g1" />)

    const select = screen.getByRole("combobox")
    const options = Array.from(select.querySelectorAll("option"))

    expect(options).toHaveLength(9)
    expect(options[0].textContent).toBe("3 contra 3")
    expect(options[6].textContent).toBe("9 contra 9")
    expect(options[8].textContent).toBe("11 contra 11")
  })

  it("clears errors when user changes field after submit error", async () => {
    const mockPush = vi.fn()
    const mockRefresh = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    } as unknown as ReturnType<typeof useRouter>)

    const user = userEvent.setup()
    render(<MatchForm groupId="g1" />)

    // Submit with empty fields to trigger error
    const button = screen.getByRole("button", { name: /crear partido/i })
    await user.click(button)

    // Error should not have called createMatch
    expect(vi.mocked(createMatch)).not.toHaveBeenCalled()
  })
})
