import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthForm } from "./auth-form";

vi.mock("@/actions/auth");
vi.mock("next/navigation");

describe("AuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows display_name field in signup mode", () => {
    render(<AuthForm mode="signup" />);
    expect(screen.getByLabelText("Tu nombre")).toBeInTheDocument();
  });

  it("does not show display_name field in signin mode", () => {
    render(<AuthForm mode="signin" />);
    expect(screen.queryByLabelText("Tu nombre")).not.toBeInTheDocument();
  });

  it("shows password hint in signup mode", () => {
    render(<AuthForm mode="signup" />);
    expect(screen.getByText("Mínimo 8 caracteres.")).toBeInTheDocument();
  });

  it("does not show password hint in signin mode", () => {
    render(<AuthForm mode="signin" />);
    expect(screen.queryByText("Mínimo 8 caracteres.")).not.toBeInTheDocument();
  });

  it("displays validation error for invalid email", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="signin" />);

    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      "Contraseña"
    ) as HTMLInputElement;
    const button = screen.getByRole("button", { name: "Ingresá" });

    await user.type(emailInput, "invalid-email");
    await user.type(passwordInput, "password123");
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("Ingresá un email válido.")).toBeInTheDocument();
    });
  });

  it("displays validation error for short password", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="signin" />);

    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      "Contraseña"
    ) as HTMLInputElement;
    const button = screen.getByRole("button", { name: "Ingresá" });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "short");
    await user.click(button);

    await waitFor(() => {
      expect(
        screen.getByText("La contraseña tiene que tener al menos 8 caracteres.")
      ).toBeInTheDocument();
    });
  });

  it("displays server error when action fails", async () => {
    const { signIn: mockSignIn } = await import("@/actions/auth");

    vi.mocked(mockSignIn).mockResolvedValueOnce({
      ok: false,
      error: "El email o la contraseña no coinciden.",
    });

    const user = userEvent.setup();
    render(<AuthForm mode="signin" />);

    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      "Contraseña"
    ) as HTMLInputElement;
    const button = screen.getByRole("button", { name: "Ingresá" });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.click(button);

    await waitFor(() => {
      expect(
        screen.getByText("El email o la contraseña no coinciden.")
      ).toBeInTheDocument();
    });
  });

  it("redirects to safe path on successful signin", async () => {
    const { signIn: mockSignIn } = await import("@/actions/auth");
    const { useRouter: mockUseRouter } = await import("next/navigation");

    const mockPush = vi.fn();
    const mockRefresh = vi.fn();

    const mockRouterInstance = {
      push: mockPush,
      refresh: mockRefresh,
      back: vi.fn(),
      forward: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      bfcacheId: "",
    };

    vi.mocked(mockUseRouter).mockReturnValue(mockRouterInstance);

    vi.mocked(mockSignIn).mockResolvedValueOnce({
      ok: true,
      data: { redirectTo: "/grupos" },
    });

    const user = userEvent.setup();
    render(<AuthForm mode="signin" next="/g/abc" />);

    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      "Contraseña"
    ) as HTMLInputElement;
    const button = screen.getByRole("button", { name: "Ingresá" });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.click(button);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/g/abc");
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("sanitizes next parameter on successful signin", async () => {
    const { signIn: mockSignIn } = await import("@/actions/auth");
    const { useRouter: mockUseRouter } = await import("next/navigation");

    const mockPush = vi.fn();
    const mockRefresh = vi.fn();

    const mockRouterInstance = {
      push: mockPush,
      refresh: mockRefresh,
      back: vi.fn(),
      forward: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      bfcacheId: "",
    };

    vi.mocked(mockUseRouter).mockReturnValue(mockRouterInstance);

    vi.mocked(mockSignIn).mockResolvedValueOnce({
      ok: true,
      data: { redirectTo: "/grupos" },
    });

    const user = userEvent.setup();
    render(<AuthForm mode="signin" next="//evil.com" />);

    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      "Contraseña"
    ) as HTMLInputElement;
    const button = screen.getByRole("button", { name: "Ingresá" });

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.click(button);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/grupos");
    });
  });

  it("sends display_name in signup", async () => {
    const { signUp: mockSignUp } = await import("@/actions/auth");
    const { useRouter: mockUseRouter } = await import("next/navigation");

    const mockPush = vi.fn();
    const mockRefresh = vi.fn();

    const mockRouterInstance = {
      push: mockPush,
      refresh: mockRefresh,
      back: vi.fn(),
      forward: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      bfcacheId: "",
    };

    vi.mocked(mockUseRouter).mockReturnValue(mockRouterInstance);

    vi.mocked(mockSignUp).mockResolvedValueOnce({
      ok: true,
      data: { redirectTo: "/grupos" },
    });

    const user = userEvent.setup();
    render(<AuthForm mode="signup" />);

    const displayNameInput = screen.getByLabelText("Tu nombre");
    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Contraseña");
    const button = screen.getByRole("button", { name: "Crear cuenta" });

    await user.type(displayNameInput, "Juan Pérez");
    await user.type(emailInput, "juan@example.com");
    await user.type(passwordInput, "password123");
    await user.click(button);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        display_name: "Juan Pérez",
        email: "juan@example.com",
        password: "password123",
      });
      expect(mockPush).toHaveBeenCalled();
    });
  });

  it("shows signup toggle link in signin mode", () => {
    render(<AuthForm mode="signin" />);
    const link = screen.getByRole("link", { name: "¿No tenés cuenta? Creá una" });
    expect(link).toHaveAttribute("href", "/registrarme");
  });

  it("shows signin toggle link in signup mode", () => {
    render(<AuthForm mode="signup" />);
    const link = screen.getByRole("link", {
      name: "¿Ya tenés cuenta? Ingresá",
    });
    expect(link).toHaveAttribute("href", "/ingresar");
  });

  it("includes next parameter in toggle links", () => {
    render(<AuthForm mode="signin" next="/g/abc" />);
    const link = screen.getByRole("link", { name: "¿No tenés cuenta? Creá una" });
    expect(link).toHaveAttribute("href", "/registrarme?next=%2Fg%2Fabc");
  });
});
