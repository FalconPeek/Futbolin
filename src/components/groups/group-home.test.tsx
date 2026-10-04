import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { GroupHome } from "./group-home"

const mockGroupId = "group-123"

const mockMatch = {
  id: "match-123",
  groupId: mockGroupId,
  scheduledAt: "2026-10-10T21:00:00Z",
  location: "Parque de los Arboles",
  playersPerTeam: 5,
  confirmed: 8,
  status: "programado" as const,
  scoreA: null,
  scoreB: null,
}

const mockTournament = {
  id: "tournament-123",
  groupId: mockGroupId,
  name: "Torneo Octubre",
  format: "liga" as const,
  teamCount: 4,
  status: "en_curso" as const,
  championName: null,
}

describe("GroupHome", () => {
  describe("Próximo partido section", () => {
    it("renders MatchCard when nextMatch is provided", () => {
      render(
        <GroupHome
          groupId={mockGroupId}
          nextMatch={mockMatch}
          pendingVotes={[]}
          unratedCount={0}
          tournaments={[]}
        />
      )

      expect(screen.getByText("Próximo partido")).toBeInTheDocument()
      // MatchCard renders the location
      expect(screen.getByText("Parque de los Arboles")).toBeInTheDocument()
    })

    it("renders 'No hay partidos programados' and 'Crear partido' button when no nextMatch", () => {
      render(
        <GroupHome
          groupId={mockGroupId}
          nextMatch={null}
          pendingVotes={[]}
          unratedCount={0}
          tournaments={[]}
        />
      )

      expect(screen.getByText("Próximo partido")).toBeInTheDocument()
      expect(screen.getByText("No hay partidos programados.")).toBeInTheDocument()
      const createBtn = screen.getByRole("link", { name: /Crear partido/i })
      expect(createBtn).toHaveAttribute("href", `/g/${mockGroupId}/partidos/nuevo`)
    })
  })

  describe("Pendientes section", () => {
    it("renders 'Estás al día' when no pending votes and no unrated members", () => {
      render(
        <GroupHome
          groupId={mockGroupId}
          nextMatch={null}
          pendingVotes={[]}
          unratedCount={0}
          tournaments={[]}
        />
      )

      expect(screen.getByText("Pendientes")).toBeInTheDocument()
      expect(screen.getByText("Estás al día.")).toBeInTheDocument()
    })

    it("renders pending MVP votes with correct link and label", () => {
      const pendingVotes = [
        { matchId: "match-1", label: "sáb 5 oct · 21:00" },
        { matchId: "match-2", label: "dom 6 oct · 15:00" },
      ]

      render(
        <GroupHome
          groupId={mockGroupId}
          nextMatch={null}
          pendingVotes={pendingVotes}
          unratedCount={0}
          tournaments={[]}
        />
      )

      const vote1Link = screen.getByRole("link", {
        name: /Votá al MVP del partido del sáb 5 oct · 21:00/i,
      })
      expect(vote1Link).toHaveAttribute(
        "href",
        `/g/${mockGroupId}/partidos/match-1`
      )

      const vote2Link = screen.getByRole("link", {
        name: /Votá al MVP del partido del dom 6 oct · 15:00/i,
      })
      expect(vote2Link).toHaveAttribute(
        "href",
        `/g/${mockGroupId}/partidos/match-2`
      )
    })

    it("renders unrated count when there are members to rate", () => {
      render(
        <GroupHome
          groupId={mockGroupId}
          nextMatch={null}
          pendingVotes={[]}
          unratedCount={4}
          tournaments={[]}
        />
      )

      const ratingLink = screen.getByRole("link", {
        name: /Calificá a tus compañeros/i,
      })
      expect(ratingLink).toHaveAttribute("href", `/g/${mockGroupId}/cartas`)
      expect(screen.getByText("4 sin calificar")).toBeInTheDocument()
    })

    it("renders both pending votes and unrated count", () => {
      const pendingVotes = [{ matchId: "match-1", label: "sáb 5 oct · 21:00" }]

      render(
        <GroupHome
          groupId={mockGroupId}
          nextMatch={null}
          pendingVotes={pendingVotes}
          unratedCount={2}
          tournaments={[]}
        />
      )

      expect(
        screen.getByRole("link", {
          name: /Votá al MVP del partido del sáb 5 oct · 21:00/i,
        })
      ).toBeInTheDocument()
      expect(
        screen.getByRole("link", { name: /Calificá a tus compañeros/i })
      ).toBeInTheDocument()
      expect(screen.getByText("2 sin calificar")).toBeInTheDocument()
    })
  })

  describe("Torneos en curso section", () => {
    it("renders tournaments with TournamentCard", () => {
      const tournaments = [
        mockTournament,
        {
          id: "tournament-2",
          groupId: mockGroupId,
          name: "Liga de Otoño",
          format: "eliminacion" as const,
          teamCount: 8,
          status: "en_curso" as const,
          championName: null,
        },
      ]

      render(
        <GroupHome
          groupId={mockGroupId}
          nextMatch={null}
          pendingVotes={[]}
          unratedCount={0}
          tournaments={tournaments}
        />
      )

      expect(screen.getByText("Torneos en curso")).toBeInTheDocument()
      expect(screen.getByText("Torneo Octubre")).toBeInTheDocument()
      expect(screen.getByText("Liga de Otoño")).toBeInTheDocument()
    })

    it("renders 'No hay torneos en curso' and 'Ver torneos' link when empty", () => {
      render(
        <GroupHome
          groupId={mockGroupId}
          nextMatch={null}
          pendingVotes={[]}
          unratedCount={0}
          tournaments={[]}
        />
      )

      expect(screen.getByText("Torneos en curso")).toBeInTheDocument()
      expect(screen.getByText("No hay torneos en curso.")).toBeInTheDocument()
      const verLink = screen.getByRole("link", { name: /Ver torneos/i })
      expect(verLink).toHaveAttribute("href", `/g/${mockGroupId}/torneos`)
    })
  })

  describe("layout", () => {
    it("renders all three sections in order", () => {
      render(
        <GroupHome
          groupId={mockGroupId}
          nextMatch={mockMatch}
          pendingVotes={[]}
          unratedCount={0}
          tournaments={[mockTournament]}
        />
      )

      const headings = screen.getAllByRole("heading", { level: 2 })
      expect(headings).toHaveLength(3)
      expect(headings[0]).toHaveTextContent("Próximo partido")
      expect(headings[1]).toHaveTextContent("Pendientes")
      expect(headings[2]).toHaveTextContent("Torneos en curso")
    })
  })
})
