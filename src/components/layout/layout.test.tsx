import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { BottomNav } from "./bottom-nav"
import { EmptyState } from "./empty-state"
import { AppHeader } from "./app-header"
import { ErrorState } from "./error-state"
import { PageSkeleton } from "./page-skeleton"
import { House } from "lucide-react"

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/g/abc/partidos",
}))

describe("Layout Components", () => {
  describe("BottomNav", () => {
    it("renders all five navigation links", () => {
      render(<BottomNav groupId="abc" />)

      expect(screen.getByRole("link", { name: /Inicio/i })).toBeInTheDocument()
      expect(
        screen.getByRole("link", { name: /Partidos/i })
      ).toBeInTheDocument()
      expect(screen.getByRole("link", { name: /Torneos/i })).toBeInTheDocument()
      expect(screen.getByRole("link", { name: /Ranking/i })).toBeInTheDocument()
      expect(screen.getByRole("link", { name: /Cartas/i })).toBeInTheDocument()
    })

    it("sets active link based on current pathname", () => {
      render(<BottomNav groupId="abc" />)

      const partidosLink = screen.getByRole("link", { name: /Partidos/i })
      expect(partidosLink).toHaveAttribute("aria-current", "page")
    })

    it("highlights current page in primary color", () => {
      render(<BottomNav groupId="abc" />)

      const partidosLink = screen.getByRole("link", { name: /Partidos/i })
      expect(partidosLink).toHaveClass("text-primary")
    })

    it("renders with correct nav landmark", () => {
      render(<BottomNav groupId="abc" />)

      const nav = screen.getByRole("navigation", {
        name: /Secciones del grupo/i,
      })
      expect(nav).toBeInTheDocument()
    })

    it("generates correct href for each link with groupId", () => {
      const groupId = "test-group-123"
      render(<BottomNav groupId={groupId} />)

      const inicioLink = screen.getByRole("link", { name: /Inicio/i })
      const partidosLink = screen.getByRole("link", { name: /Partidos/i })
      const torneosLink = screen.getByRole("link", { name: /Torneos/i })
      const rankingLink = screen.getByRole("link", { name: /Ranking/i })
      const cartasLink = screen.getByRole("link", { name: /Cartas/i })

      expect(inicioLink).toHaveAttribute("href", `/g/${groupId}`)
      expect(partidosLink).toHaveAttribute("href", `/g/${groupId}/partidos`)
      expect(torneosLink).toHaveAttribute("href", `/g/${groupId}/torneos`)
      expect(rankingLink).toHaveAttribute("href", `/g/${groupId}/ranking`)
      expect(cartasLink).toHaveAttribute("href", `/g/${groupId}/cartas`)
    })
  })

  describe("EmptyState", () => {
    it("renders title", () => {
      render(<EmptyState title="No hay resultados" />)

      expect(screen.getByText("No hay resultados")).toBeInTheDocument()
    })

    it("renders description when provided", () => {
      render(
        <EmptyState
          title="No hay resultados"
          description="Intenta buscar otra cosa"
        />
      )

      expect(screen.getByText("Intenta buscar otra cosa")).toBeInTheDocument()
    })

    it("renders action when provided", () => {
      render(
        <EmptyState
          title="No hay resultados"
          action={<button>Crear nuevo</button>}
        />
      )

      expect(screen.getByRole("button", { name: /Crear nuevo/i })).toBeInTheDocument()
    })

    it("renders icon when provided", () => {
      const { container } = render(<EmptyState title="Test" icon={House} />)

      const svg = container.querySelector("svg")
      expect(svg).toBeInTheDocument()
    })
  })

  describe("AppHeader", () => {
    it("renders title", () => {
      render(<AppHeader title="Mi Grupo" />)

      expect(screen.getByRole("heading", { name: /Mi Grupo/i })).toBeInTheDocument()
    })

    it("renders back link when backHref is provided", () => {
      render(<AppHeader title="Test" backHref="/groups" />)

      const backLink = screen.getByRole("link", { name: /Volver/i })
      expect(backLink).toBeInTheDocument()
      expect(backLink).toHaveAttribute("href", "/groups")
    })

    it("does not render back link when backHref is not provided", () => {
      render(<AppHeader title="Test" />)

      expect(screen.queryByRole("link", { name: /Volver/i })).not.toBeInTheDocument()
    })

    it("renders right slot content when provided", () => {
      render(
        <AppHeader
          title="Test"
          right={<button>Action</button>}
        />
      )

      expect(screen.getByRole("button", { name: /Action/i })).toBeInTheDocument()
    })
  })

  describe("ErrorState", () => {
    it("renders default title when not provided", () => {
      render(<ErrorState />)

      expect(screen.getByText("Algo salió mal")).toBeInTheDocument()
    })

    it("renders custom title when provided", () => {
      render(<ErrorState title="Error personalizado" />)

      expect(screen.getByText("Error personalizado")).toBeInTheDocument()
    })

    it("renders description when provided", () => {
      render(<ErrorState description="Intenta nuevamente más tarde" />)

      expect(screen.getByText("Intenta nuevamente más tarde")).toBeInTheDocument()
    })

    it("renders retry button when onRetry is provided", () => {
      const onRetry = vi.fn()
      render(<ErrorState onRetry={onRetry} />)

      const retryButton = screen.getByRole("button", { name: /Reintentar/i })
      expect(retryButton).toBeInTheDocument()
    })

    it("does not render retry button when onRetry is not provided", () => {
      render(<ErrorState />)

      expect(screen.queryByRole("button", { name: /Reintentar/i })).not.toBeInTheDocument()
    })
  })

  describe("PageSkeleton", () => {
    it("renders default number of skeleton rows", () => {
      const { container } = render(<PageSkeleton />)

      const skeletons = container.querySelectorAll("[data-slot='skeleton']")
      expect(skeletons).toHaveLength(3)
    })

    it("renders custom number of skeleton rows", () => {
      const { container } = render(<PageSkeleton rows={5} />)

      const skeletons = container.querySelectorAll("[data-slot='skeleton']")
      expect(skeletons).toHaveLength(5)
    })
  })
})
