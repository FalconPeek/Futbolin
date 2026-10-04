import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUpdateProfile = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("@/actions/profile");
vi.mock("sonner");
vi.mock("next/navigation");

import { ProfileForm } from "./profile-form";
import * as profileActions from "@/actions/profile";
import * as sonnerLib from "sonner";
import * as navigation from "next/navigation";

// Setup mocks after imports
vi.mocked(profileActions.updateProfile).mockImplementation((input) => mockUpdateProfile(input));
vi.mocked(sonnerLib.toast).success = mockToastSuccess;
vi.mocked(sonnerLib.toast).error = mockToastError;
vi.mocked(navigation.useRouter).mockImplementation(() => ({
  push: mockPush,
  refresh: mockRefresh,
  back: vi.fn(),
  forward: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  bfcacheId: "test-cache-id",
}));

describe("ProfileForm", () => {
  beforeEach(() => {
    mockUpdateProfile.mockClear();
    mockPush.mockClear();
    mockRefresh.mockClear();
    mockToastSuccess.mockClear();
    mockToastError.mockClear();
  });

  it("loads default values from props", () => {
    render(
      <ProfileForm
        defaultValues={{
          display_name: "John Doe",
          nickname: "JD",
          position: "DC",
        }}
      />
    );

    const nameInput = screen.getByLabelText("Tu nombre") as HTMLInputElement;
    const nicknameInput = screen.getByLabelText("Apodo") as HTMLInputElement;
    const positionSelect = screen.getByDisplayValue("DC · Centrodelantero") as HTMLSelectElement;

    expect(nameInput.value).toBe("John Doe");
    expect(nicknameInput.value).toBe("JD");
    expect(positionSelect.value).toBe("DC");
  });

  it("renders position select with 15 options", () => {
    render(
      <ProfileForm
        defaultValues={{
          display_name: "John",
          nickname: "",
          position: "POR",
        }}
      />
    );

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(15);
  });

  it("has correct position option format", () => {
    render(
      <ProfileForm
        defaultValues={{
          display_name: "John",
          nickname: "",
          position: "DC",
        }}
      />
    );

    const dcOption = screen.getByDisplayValue("DC · Centrodelantero");
    expect(dcOption).toBeInTheDocument();
  });

  it("shows validation error for name shorter than 2 characters", async () => {
    const user = userEvent.setup();
    render(
      <ProfileForm
        defaultValues={{
          display_name: "John",
          nickname: "",
          position: "DC",
        }}
      />
    );

    const nameInput = screen.getByLabelText("Tu nombre");
    const button = screen.getByRole("button", { name: /Guardar cambios/ });

    await user.clear(nameInput);
    await user.type(nameInput, "A");
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText("Tu nombre tiene que tener entre 2 y 40 caracteres.")).toBeInTheDocument();
    });

    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it("calls updateProfile with form data on success", async () => {
    const user = userEvent.setup();

    mockUpdateProfile.mockResolvedValueOnce({ ok: true, data: null });

    render(
      <ProfileForm
        defaultValues={{
          display_name: "John Doe",
          nickname: "JD",
          position: "DC",
        }}
      />
    );

    const nameInput = screen.getByLabelText("Tu nombre");
    const button = screen.getByRole("button", { name: /Guardar cambios/ });

    await user.clear(nameInput);
    await user.type(nameInput, "Jane Doe");
    await user.click(button);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        display_name: "Jane Doe",
        nickname: "JD",
        position: "DC",
      });
    });
  });

  it("clears empty nickname before sending", async () => {
    const user = userEvent.setup();

    mockUpdateProfile.mockResolvedValueOnce({ ok: true, data: null });

    render(
      <ProfileForm
        defaultValues={{
          display_name: "John Doe",
          nickname: "JD",
          position: "DC",
        }}
      />
    );

    const button = screen.getByRole("button", { name: /Guardar cambios/ });
    const nicknameInput = screen.getByLabelText("Apodo");

    await user.clear(nicknameInput);
    await user.click(button);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        display_name: "John Doe",
        nickname: undefined,
        position: "DC",
      });
    });
  });

  it("shows success toast after save", async () => {
    const user = userEvent.setup();

    mockUpdateProfile.mockResolvedValueOnce({ ok: true, data: null });

    render(
      <ProfileForm
        defaultValues={{
          display_name: "John Doe",
          nickname: "JD",
          position: "DC",
        }}
      />
    );

    const button = screen.getByRole("button", { name: /Guardar cambios/ });
    await user.click(button);

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Guardamos tus cambios.");
    });
  });

  it("shows error toast on failure", async () => {
    const user = userEvent.setup();

    mockUpdateProfile.mockResolvedValueOnce({
      ok: false,
      error: "Algo salió mal.",
    });

    render(
      <ProfileForm
        defaultValues={{
          display_name: "John Doe",
          nickname: "JD",
          position: "DC",
        }}
      />
    );

    const button = screen.getByRole("button", { name: /Guardar cambios/ });
    await user.click(button);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Algo salió mal.");
    });
  });

  it("disables button while submitting", async () => {
    const user = userEvent.setup();

    mockUpdateProfile.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, data: null }), 100)
        )
    );

    render(
      <ProfileForm
        defaultValues={{
          display_name: "John Doe",
          nickname: "JD",
          position: "DC",
        }}
      />
    );

    const button = screen.getByRole("button", { name: /Guardar cambios/ });
    await user.click(button);

    expect(button).toBeDisabled();

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it("shows loading state text while submitting", async () => {
    const user = userEvent.setup();

    mockUpdateProfile.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, data: null }), 100)
        )
    );

    render(
      <ProfileForm
        defaultValues={{
          display_name: "John Doe",
          nickname: "JD",
          position: "DC",
        }}
      />
    );

    const button = screen.getByRole("button", { name: /Guardar cambios/ });
    await user.click(button);

    expect(screen.getByRole("button", { name: /Guardando/ })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Guardar cambios/ })).toBeInTheDocument();
    });
  });
});
