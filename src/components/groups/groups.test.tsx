import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { GroupList } from "./group-list"
import { CreateGroupForm } from "./create-group-form"
import { JoinGroupCard } from "./join-group-card"

vi.mock("@/actions/groups")
vi.mock("next/navigation")

describe("GroupList", () => {
  it("renders groups with member count and admin badge", () => {
    const groups = [
      { id: "1", name: "Grupo A", memberCount: 8, role: "admin" as const },
      { id: "2", name: "Grupo B", memberCount: 1, role: "member" as const },
    ]
    render(<GroupList groups={groups} />)

    expect(screen.getByText("Grupo A")).toBeInTheDocument()
    expect(screen.getByText("8 miembros")).toBeInTheDocument()
    expect(screen.getByText("Grupo B")).toBeInTheDocument()
    expect(screen.getByText("1 miembro")).toBeInTheDocument()
    expect(screen.getByText("Admin")).toBeInTheDocument()
  })

  it("shows empty state when no groups", () => {
    render(<GroupList groups={[]} />)

    expect(
      screen.getByText("Todavía no estás en ningún grupo")
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Creá uno y pasales el link a tus amigos, o pedile el link a quien lo organiza."
      )
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Crear grupo" })).toBeInTheDocument()
  })

  it("renders links to each group", () => {
    const groups = [
      { id: "gid-123", name: "Grupo Test", memberCount: 5, role: "member" as const },
    ]
    render(<GroupList groups={groups} />)

    const links = screen.getAllByRole("link", { name: /Grupo Test|Crear grupo/ })
    const groupLink = links.find((link) => link.getAttribute("href") === "/g/gid-123")
    expect(groupLink).toBeInTheDocument()
  })
})

describe("CreateGroupForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("displays validation error for group name too short", async () => {
    const user = userEvent.setup()
    render(<CreateGroupForm />)

    const input = screen.getByLabelText("Nombre del grupo") as HTMLInputElement
    const button = screen.getByRole("button", { name: "Crear grupo" })

    await user.type(input, "A")
    await user.click(button)

    await waitFor(() => {
      expect(
        screen.getByText(
          "El nombre del grupo tiene que tener entre 2 y 40 caracteres."
        )
      ).toBeInTheDocument()
    })
  })

  it("does not call action when validation fails", async () => {
    const { createGroup: mockCreateGroup } = await import("@/actions/groups")
    const user = userEvent.setup()
    render(<CreateGroupForm />)

    const input = screen.getByLabelText("Nombre del grupo") as HTMLInputElement
    const button = screen.getByRole("button", { name: "Crear grupo" })

    await user.type(input, "A")
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText(/tener entre 2 y 40/)).toBeInTheDocument()
    })

    expect(vi.mocked(mockCreateGroup)).not.toHaveBeenCalled()
  })

  it("displays server error when action fails", async () => {
    const { createGroup: mockCreateGroup } = await import("@/actions/groups")
    const { useRouter: mockUseRouter } = await import("next/navigation")

    vi.mocked(mockCreateGroup).mockResolvedValueOnce({
      ok: false,
      error: "Error del servidor",
    })

    vi.mocked(mockUseRouter).mockReturnValue({
      push: vi.fn(),
      refresh: vi.fn(),
    } as unknown as ReturnType<typeof mockUseRouter>)

    const user = userEvent.setup()
    render(<CreateGroupForm />)

    const input = screen.getByLabelText("Nombre del grupo") as HTMLInputElement
    const button = screen.getByRole("button", { name: "Crear grupo" })

    await user.type(input, "Mi Grupo")
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText("Error del servidor")).toBeInTheDocument()
    })
  })

  it("navigates on success", async () => {
    const { createGroup: mockCreateGroup } = await import("@/actions/groups")
    const { useRouter: mockUseRouter } = await import("next/navigation")

    const mockRouter = {
      push: vi.fn(),
      refresh: vi.fn(),
    }

    vi.mocked(mockCreateGroup).mockResolvedValueOnce({
      ok: true,
      data: { groupId: "gid-123", redirectTo: "/g/gid-123" },
    })

    vi.mocked(mockUseRouter).mockReturnValue(mockRouter as unknown as ReturnType<typeof mockUseRouter>)

    const user = userEvent.setup()
    render(<CreateGroupForm />)

    const input = screen.getByLabelText("Nombre del grupo") as HTMLInputElement
    const button = screen.getByRole("button", { name: "Crear grupo" })

    await user.type(input, "Mi Grupo")
    await user.click(button)

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/g/gid-123")
    })
  })
})

describe("JoinGroupCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("displays group info and join button", () => {
    render(
      <JoinGroupCard code="ABCD1234" name="Grupo Test" memberCount={5} />
    )

    expect(screen.getByText("Te invitaron a")).toBeInTheDocument()
    expect(screen.getByText("Grupo Test")).toBeInTheDocument()
    expect(screen.getByText("5 miembros")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Unite al grupo" })).toBeInTheDocument()
  })

  it("calls joinGroup with correct code on submit", async () => {
    const { joinGroup: mockJoinGroup } = await import("@/actions/groups")
    const { useRouter: mockUseRouter } = await import("next/navigation")

    const mockRouter = {
      push: vi.fn(),
      refresh: vi.fn(),
    }

    vi.mocked(mockJoinGroup).mockResolvedValueOnce({
      ok: true,
      data: { groupId: "gid-123", redirectTo: "/g/gid-123" },
    })

    vi.mocked(mockUseRouter).mockReturnValue(mockRouter as unknown as ReturnType<typeof mockUseRouter>)

    const user = userEvent.setup()
    render(
      <JoinGroupCard code="ABCD1234" name="Grupo Test" memberCount={5} />
    )

    const button = screen.getByRole("button", { name: "Unite al grupo" })
    await user.click(button)

    await waitFor(() => {
      expect(vi.mocked(mockJoinGroup)).toHaveBeenCalledWith({
        code: "ABCD1234",
      })
    })
  })

  it("navigates on success", async () => {
    const { joinGroup: mockJoinGroup } = await import("@/actions/groups")
    const { useRouter: mockUseRouter } = await import("next/navigation")

    const mockRouter = {
      push: vi.fn(),
      refresh: vi.fn(),
    }

    vi.mocked(mockJoinGroup).mockResolvedValueOnce({
      ok: true,
      data: { groupId: "gid-123", redirectTo: "/g/gid-123" },
    })

    vi.mocked(mockUseRouter).mockReturnValue(mockRouter as unknown as ReturnType<typeof mockUseRouter>)

    const user = userEvent.setup()
    render(
      <JoinGroupCard code="ABCD1234" name="Grupo Test" memberCount={5} />
    )

    const button = screen.getByRole("button", { name: "Unite al grupo" })
    await user.click(button)

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/g/gid-123")
    })
  })
})
