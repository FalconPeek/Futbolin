import { describe, it, expect, vi, beforeEach } from "vitest";
import { signUp, signIn, signOut } from "./auth";
import { updateProfile } from "./profile";

// Mock the Supabase client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const mockCreateClient = vi.mocked(createClient);
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("auth actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signUp", () => {
    it("returns validation error for invalid email", async () => {
      const result = await signUp({ email: "not-email", password: "password123", display_name: "John" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("email");
      }
    });

    it("returns validation error for short password", async () => {
      const result = await signUp({ email: "test@example.com", password: "short", display_name: "John" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("contraseña");
      }
    });

    it("returns validation error for short display_name", async () => {
      const result = await signUp({ email: "test@example.com", password: "password123", display_name: "J" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("nombre");
      }
    });

    it("returns error for email already registered (status 422)", async () => {
      const mockAuth = {
        signUp: vi.fn().mockResolvedValue({
          error: { status: 422, message: "already registered", code: "user_already_exists" },
        }),
      };
      mockCreateClient.mockResolvedValue({ auth: mockAuth } as never);

      const result = await signUp({ email: "existing@example.com", password: "password123", display_name: "John" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Ya hay una cuenta con ese email. Ingresá.");
      }
    });

    it("returns error for email already registered (email_exists code)", async () => {
      const mockAuth = {
        signUp: vi.fn().mockResolvedValue({
          error: { status: 400, code: "email_exists", message: "Email already registered" },
        }),
      };
      mockCreateClient.mockResolvedValue({ auth: mockAuth } as never);

      const result = await signUp({ email: "existing@example.com", password: "password123", display_name: "John" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Ya hay una cuenta con ese email. Ingresá.");
      }
    });

    it("returns generic error for unknown auth error", async () => {
      const mockAuth = {
        signUp: vi.fn().mockResolvedValue({
          error: { status: 500, message: "Internal server error" },
        }),
      };
      mockCreateClient.mockResolvedValue({ auth: mockAuth } as never);

      const result = await signUp({ email: "test@example.com", password: "password123", display_name: "John" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Algo salió mal. Probá de nuevo.");
      }
    });

    it("succeeds and sends display_name in options.data", async () => {
      const mockAuth = {
        signUp: vi.fn().mockResolvedValue({ error: null }),
      };
      mockCreateClient.mockResolvedValue({ auth: mockAuth } as never);

      const result = await signUp({ email: "new@example.com", password: "password123", display_name: "John Doe" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.redirectTo).toBe("/grupos");
      }
      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
        options: {
          data: {
            display_name: "John Doe",
          },
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    });
  });

  describe("signIn", () => {
    it("returns validation error for invalid email", async () => {
      const result = await signIn({ email: "not-email", password: "password123" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("email");
      }
    });

    it("returns validation error for short password", async () => {
      const result = await signIn({ email: "test@example.com", password: "short" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("contraseña");
      }
    });

    it("returns error for invalid credentials (status 400)", async () => {
      const mockAuth = {
        signInWithPassword: vi.fn().mockResolvedValue({
          error: { status: 400, code: "invalid_credentials", message: "Invalid credentials" },
        }),
      };
      mockCreateClient.mockResolvedValue({ auth: mockAuth } as never);

      const result = await signIn({ email: "test@example.com", password: "wrongpassword" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("El email o la contraseña no coinciden.");
      }
    });

    it("returns error for invalid credentials (invalid_credentials code)", async () => {
      const mockAuth = {
        signInWithPassword: vi.fn().mockResolvedValue({
          error: { code: "invalid_credentials", message: "Invalid credentials" },
        }),
      };
      mockCreateClient.mockResolvedValue({ auth: mockAuth } as never);

      const result = await signIn({ email: "test@example.com", password: "wrongpassword" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("El email o la contraseña no coinciden.");
      }
    });

    it("returns generic error for unknown auth error", async () => {
      const mockAuth = {
        signInWithPassword: vi.fn().mockResolvedValue({
          error: { status: 500, message: "Internal server error" },
        }),
      };
      mockCreateClient.mockResolvedValue({ auth: mockAuth } as never);

      const result = await signIn({ email: "test@example.com", password: "password123" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Algo salió mal. Probá de nuevo.");
      }
    });

    it("succeeds with correct credentials", async () => {
      const mockAuth = {
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      };
      mockCreateClient.mockResolvedValue({ auth: mockAuth } as never);

      const result = await signIn({ email: "test@example.com", password: "password123" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.redirectTo).toBe("/grupos");
      }
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    });
  });

  describe("signOut", () => {
    it("succeeds and redirects to /ingresar", async () => {
      const mockAuth = {
        signOut: vi.fn().mockResolvedValue({ error: null }),
      };
      mockCreateClient.mockResolvedValue({ auth: mockAuth } as never);

      const result = await signOut();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.redirectTo).toBe("/ingresar");
      }
      expect(mockAuth.signOut).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("returns error on signOut failure", async () => {
      const mockAuth = {
        signOut: vi.fn().mockResolvedValue({
          error: { message: "Failed to sign out" },
        }),
      };
      mockCreateClient.mockResolvedValue({ auth: mockAuth } as never);

      const result = await signOut();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Algo salió mal. Probá de nuevo.");
      }
    });
  });
});

describe("profile actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateProfile", () => {
    it("returns validation error for invalid position", async () => {
      const result = await updateProfile({
        display_name: "John Doe",
        nickname: "JD",
        position: "invalid_position",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Invalid option");
      }
    });

    it("returns validation error for short display_name", async () => {
      const result = await updateProfile({
        display_name: "J",
        nickname: "JD",
        position: "POR",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("nombre");
      }
    });

    it("returns error when user is not authenticated", async () => {
      const mockAuth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      };
      mockCreateClient.mockResolvedValue({ auth: mockAuth } as never);

      const result = await updateProfile({
        display_name: "John Doe",
        nickname: "JD",
        position: "POR",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Tenés que ingresar para hacer esto.");
      }
    });

    it("returns error on database failure", async () => {
      const mockAuth = {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
        }),
      };
      const mockEq = vi.fn().mockResolvedValue({
        error: { message: "INVALID_INPUT" },
      });
      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockEq,
      });
      const mockFrom = vi.fn().mockReturnValue({
        update: mockUpdate,
      });
      mockCreateClient.mockResolvedValue({
        auth: mockAuth,
        from: mockFrom,
      } as never);

      const result = await updateProfile({
        display_name: "John Doe",
        nickname: "JD",
        position: "POR",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Revisá los datos e intentá de nuevo.");
      }
    });

    it("succeeds and filters by user id", async () => {
      const mockAuth = {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
        }),
      };
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockEq,
      });
      const mockFrom = vi.fn().mockReturnValue({
        update: mockUpdate,
      });
      mockCreateClient.mockResolvedValue({
        auth: mockAuth,
        from: mockFrom,
      } as never);

      const result = await updateProfile({
        display_name: "John Doe",
        nickname: "JD",
        position: "POR",
      });
      expect(result.ok).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith("profiles");
      expect(mockUpdate).toHaveBeenCalledWith({
        display_name: "John Doe",
        nickname: "JD",
        position: "POR",
      });
      expect(mockEq).toHaveBeenCalledWith("id", "user-123");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("converts empty nickname to null", async () => {
      const mockAuth = {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
        }),
      };
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockEq,
      });
      const mockFrom = vi.fn().mockReturnValue({
        update: mockUpdate,
      });
      mockCreateClient.mockResolvedValue({
        auth: mockAuth,
        from: mockFrom,
      } as never);

      const result = await updateProfile({
        display_name: "John Doe",
        position: "POR",
      });
      expect(result.ok).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        display_name: "John Doe",
        nickname: null,
        position: "POR",
      });
    });
  });
});
