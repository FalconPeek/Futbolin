import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MembersList } from "./members-list";
import { InviteLink } from "./invite-link";
import * as groupActions from "@/actions/groups";

vi.mock("@/actions/groups");
vi.mock("sonner");
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
  })),
}));

describe("MembersList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockMembers = [
    {
      userId: "user-1",
      name: "Alice",
      position: "MC",
      role: "admin" as const,
    },
    {
      userId: "user-2",
      name: "Bob",
      position: "DC",
      role: "member" as const,
    },
    {
      userId: "user-3",
      name: "Charlie",
      position: "POR",
      role: "member" as const,
    },
  ];

  it("renders all members with their names", () => {
    render(
      <MembersList
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        isAdmin={false}
      />
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("shows Admin badge for admin members", () => {
    render(
      <MembersList
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        isAdmin={false}
      />
    );

    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("shows (vos) next to current user", () => {
    render(
      <MembersList
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        isAdmin={false}
      />
    );

    expect(screen.getByText("(vos)")).toBeInTheDocument();
  });

  it("does not show admin actions when isAdmin is false", () => {
    render(
      <MembersList
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        isAdmin={false}
      />
    );

    const makeAdminButtons = screen.queryAllByText("Hacer admin");
    expect(makeAdminButtons).toHaveLength(0);
  });

  it("does not show admin actions for current user even when isAdmin is true", () => {
    render(
      <MembersList
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        isAdmin={true}
      />
    );

    const aliceRow = screen.getByText("Alice").closest("div");
    expect(aliceRow?.textContent).not.toContain("Hacer admin");
  });

  it("shows admin actions only for non-current members when isAdmin is true", () => {
    render(
      <MembersList
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        isAdmin={true}
      />
    );

    const makeAdminButtons = screen.getAllByText("Hacer admin");
    expect(makeAdminButtons.length).toBeGreaterThan(0);
  });

  it("calls setMemberRole when Hacer admin is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(groupActions.setMemberRole).mockResolvedValueOnce({
      ok: true,
      data: null,
    });

    render(
      <MembersList
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        isAdmin={true}
      />
    );

    const makeAdminButtons = screen.getAllByText("Hacer admin");
    await user.click(makeAdminButtons[0]);

    await waitFor(() => {
      expect(groupActions.setMemberRole).toHaveBeenCalledWith(
        expect.objectContaining({
          groupId: "group-1",
          role: "admin",
        })
      );
    });
  });

  it("calls removeMember when Quitar is confirmed", async () => {
    const user = userEvent.setup();
    vi.mocked(groupActions.removeMember).mockResolvedValueOnce({
      ok: true,
      data: null,
    });

    render(
      <MembersList
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        isAdmin={true}
      />
    );

    const quitarButtons = screen.getAllByText("Quitar");
    await user.click(quitarButtons[0]);

    const confirmButtons = screen.getAllByRole("button", { name: "Quitar" });
    const confirmButton = confirmButtons[confirmButtons.length - 1];
    await user.click(confirmButton);

    await waitFor(() => {
      expect(groupActions.removeMember).toHaveBeenCalledWith(
        expect.objectContaining({
          groupId: "group-1",
        })
      );
    });
  });

  it("calls leaveGroup when Salir del grupo is confirmed", async () => {
    const user = userEvent.setup();
    vi.mocked(groupActions.leaveGroup).mockResolvedValueOnce({
      ok: true,
      data: { redirectTo: "/grupos" },
    });

    render(
      <MembersList
        groupId="group-1"
        members={mockMembers}
        currentUserId="user-1"
        isAdmin={false}
      />
    );

    const salirButton = screen.getByText("Salir del grupo");
    await user.click(salirButton);

    const confirmButton = await screen.findByRole("button", { name: "Salir" });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(groupActions.leaveGroup).toHaveBeenCalledWith({
        groupId: "group-1",
      });
    });
  });
});

describe("InviteLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn(() => Promise.resolve()),
      },
      configurable: true,
      writable: true,
    });
  });

  it("renders the invite code", () => {
    render(<InviteLink code="ABC12345" />);
    expect(screen.getByText("ABC12345")).toBeInTheDocument();
  });

  it("builds the unirse URL with code when copying", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    render(<InviteLink code="ABC12345" />);

    const copyButton = screen.getByText("Copiar link");
    await user.click(copyButton);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining("/unirse/ABC12345")
      );
    });
  });
});
