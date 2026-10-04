import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useRouter } from "next/navigation"
import { finalizeMatch } from "@/actions/matches"
import { ResultForm } from "./result-form"

vi.mock("@/actions/matches")
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}))
vi.mock("next/navigation")

describe("ResultForm", () => {
  const mockFinalizeMatch = vi.mocked(finalizeMatch)
  const mockUseRouter = vi.mocked(useRouter)

  const mockPlayers = [
    { userId: "550e8400-e29b-41d4-a716-446655440001", name: "Juan", team: "A" as const },
    { userId: "550e8400-e29b-41d4-a716-446655440002", name: "Pedro", team: "A" as const },
    { userId: "550e8400-e29b-41d4-a716-446655440003", name: "Carlos", team: "B" as const },
    { userId: "550e8400-e29b-41d4-a716-446655440004", name: "Diego", team: "B" as const },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRouter.mockReturnValue({
      push: vi.fn(),
      refresh: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)
  })

  it("validates that assists cannot exceed goals per team", async () => {
    const user = userEvent.setup()
    render(
      <ResultForm matchId="m1" groupId="g1" players={mockPlayers} />
    )

    // Get all spinbutton inputs
    const inputs = screen.getAllByRole("spinbutton")

    // inputs[0] = scoreA, inputs[1] = scoreB
    // inputs[2-5] = Team A (Juan goals/assists, Pedro goals/assists)
    // inputs[6-9] = Team B

    // Set score A = 1
    await user.type(inputs[0], "1")

    // Set assists: Juan (index 3) = 1, Pedro (index 5) = 1
    // Total = 2, which exceeds scoreA = 1
    await user.type(inputs[3], "1")
    await user.type(inputs[5], "1")

    // Submit
    const button = screen.getByRole("button", { name: "Cerrar partido" })
    await user.click(button)

    // Verify error appears
    await waitFor(() => {
      const alert = screen.getByRole("alert", { hidden: true })
      expect(alert.textContent).toContain("Las asistencias no pueden superar los goles.")
    }, { timeout: 3000 })

    expect(mockFinalizeMatch).not.toHaveBeenCalled()
  })

  it("validates that goals cannot exceed team score", async () => {
    const user = userEvent.setup()
    render(
      <ResultForm matchId="m1" groupId="g1" players={mockPlayers} />
    )

    const inputs = screen.getAllByRole("spinbutton")

    // Set score A = 1
    await user.type(inputs[0], "1")

    // Set goals: Juan (index 2) = 1, Pedro (index 4) = 1
    // Total = 2, which exceeds scoreA = 1
    await user.type(inputs[2], "1")
    await user.type(inputs[4], "1")

    // Submit
    const button = screen.getByRole("button", { name: "Cerrar partido" })
    await user.click(button)

    // Verify error appears
    await waitFor(() => {
      const alert = screen.getByRole("alert", { hidden: true })
      expect(alert.textContent).toContain("Los goles de los jugadores superan el resultado.")
    }, { timeout: 3000 })

    expect(mockFinalizeMatch).not.toHaveBeenCalled()
  })

  it("sends correct payload to finalizeMatch on valid submission", async () => {
    const user = userEvent.setup()
    mockFinalizeMatch.mockResolvedValue({ ok: true, data: undefined })

    render(
      <ResultForm matchId="m1" groupId="g1" players={mockPlayers} />
    )

    const inputs = screen.getAllByRole("spinbutton")

    // Set scores
    await user.type(inputs[0], "2") // scoreA
    await user.type(inputs[1], "1") // scoreB

    // Set stats
    await user.type(inputs[2], "1") // Juan goals
    await user.type(inputs[4], "1") // Pedro goals
    await user.type(inputs[5], "1") // Pedro assists
    await user.type(inputs[6], "1") // Carlos goals

    // Submit
    const button = screen.getByRole("button", { name: "Cerrar partido" })
    await user.click(button)

    // Verify action was called
    await waitFor(() => {
      expect(mockFinalizeMatch).toHaveBeenCalledWith({
        matchId: "m1",
        groupId: "g1",
        score_a: 2,
        score_b: 1,
        stats: [
          { user_id: "550e8400-e29b-41d4-a716-446655440001", team: "A", goals: 1, assists: 0 },
          { user_id: "550e8400-e29b-41d4-a716-446655440002", team: "A", goals: 1, assists: 1 },
          { user_id: "550e8400-e29b-41d4-a716-446655440003", team: "B", goals: 1, assists: 0 },
          { user_id: "550e8400-e29b-41d4-a716-446655440004", team: "B", goals: 0, assists: 0 },
        ],
      })
    }, { timeout: 3000 })
  })

  it("displays error from action when finalizeMatch fails", async () => {
    const user = userEvent.setup()
    mockFinalizeMatch.mockResolvedValue({
      ok: false,
      error: "No tenés permiso para hacer esto.",
    })

    render(
      <ResultForm matchId="m1" groupId="g1" players={mockPlayers} />
    )

    const inputs = screen.getAllByRole("spinbutton")

    // Set minimal valid data
    await user.type(inputs[0], "1") // scoreA
    await user.type(inputs[2], "1") // Juan goals

    // Submit
    const button = screen.getByRole("button", { name: "Cerrar partido" })
    await user.click(button)

    // Verify error appears
    await waitFor(() => {
      const alert = screen.getByRole("alert", { hidden: true })
      expect(alert.textContent).toContain("No tenés permiso para hacer esto.")
    }, { timeout: 3000 })
  })
})
