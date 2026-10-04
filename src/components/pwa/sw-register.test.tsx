import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { SwRegister } from "./sw-register";
import { RetryButton } from "./retry-button";

describe("SwRegister", () => {
  let registerMock: ReturnType<typeof vi.fn>;
  const originalDescriptor = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");

  beforeEach(() => {
    registerMock = vi.fn().mockResolvedValue({});
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: registerMock },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    if (originalDescriptor) {
      Object.defineProperty(navigator, "serviceWorker", originalDescriptor);
    } else {
      delete (navigator as unknown as Record<string, unknown>).serviceWorker;
    }
  });

  it("registers /sw.js in production when serviceWorker is supported", async () => {
    vi.stubEnv("NODE_ENV", "production");
    render(<SwRegister />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(registerMock).toHaveBeenCalledWith("/sw.js", { scope: "/" });
  });

  it("does not register in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    render(<SwRegister />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(registerMock).not.toHaveBeenCalled();
  });

  it("does not break if serviceWorker is not supported", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;

    expect(() => {
      render(<SwRegister />);
    }).not.toThrow();
  });

  it("handles registration failure silently", async () => {
    vi.stubEnv("NODE_ENV", "production");
    registerMock = vi.fn().mockRejectedValue(new Error("Registration failed"));
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: registerMock },
      configurable: true,
      writable: true,
    });

    expect(() => {
      render(<SwRegister />);
    }).not.toThrow();
  });
});

describe("RetryButton", () => {
  it("reloads the page when clicked", () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { reload: reloadMock },
      writable: true,
    });

    const { getByRole } = render(<RetryButton />);
    const button = getByRole("button", { name: /reintentar/i });

    button.click();

    expect(reloadMock).toHaveBeenCalled();
  });
});
