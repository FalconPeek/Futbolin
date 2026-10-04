import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RatingForm } from "./rating-form";

// Mock the modules
vi.mock("@/actions/ratings", () => ({
  rateTeammate: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("next/navigation", () => {
  const mockRouter = {
    push: vi.fn(),
    refresh: vi.fn(),
  };
  return {
    useRouter: vi.fn(() => mockRouter),
  };
});

import { rateTeammate } from "@/actions/ratings";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/result";

describe("RatingForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Field positions (campo)", () => {
    it("renders field stat labels: RIT, TIR, PAS, REG, DEF, FIS", () => {
      render(
        <RatingForm
          groupId="test-group-id"
          ratedId="test-user-id"
          kind="campo"
          initial={null}
        />
      );

      expect(screen.getByText(/RIT Ritmo/)).toBeInTheDocument();
      expect(screen.getByText(/TIR Tiro/)).toBeInTheDocument();
      expect(screen.getByText(/PAS Pase/)).toBeInTheDocument();
      expect(screen.getByText(/REG Regate/)).toBeInTheDocument();
      expect(screen.getByText(/DEF Defensa/)).toBeInTheDocument();
      expect(screen.getByText(/FIS Físico/)).toBeInTheDocument();
    });
  });

  describe("Goalkeeper positions (arquero)", () => {
    it("renders goalkeeper stat labels: DIV, HAN, KIC, REF, POS, SPD", () => {
      render(
        <RatingForm
          groupId="test-group-id"
          ratedId="test-user-id"
          kind="arquero"
          initial={null}
        />
      );

      expect(screen.getByText(/DIV Estirada/)).toBeInTheDocument();
      expect(screen.getByText(/HAN Manos/)).toBeInTheDocument();
      expect(screen.getByText(/KIC Saque/)).toBeInTheDocument();
      expect(screen.getByText(/REF Reflejos/)).toBeInTheDocument();
      expect(screen.getByText(/POS Colocación/)).toBeInTheDocument();
      expect(screen.getByText(/SPD Velocidad/)).toBeInTheDocument();
    });
  });

  describe("Initial values", () => {
    it("renders default values of 60 when initial is null", () => {
      render(
        <RatingForm
          groupId="test-group-id"
          ratedId="test-user-id"
          kind="campo"
          initial={null}
        />
      );

      // All stat values should default to 60
      const statValues = screen.getAllByText("60");
      expect(statValues.length).toBeGreaterThanOrEqual(6);
    });

    it("renders initial values when provided", () => {
      const initialValues = [70, 75, 80, 65, 55, 90];
      render(
        <RatingForm
          groupId="test-group-id"
          ratedId="test-user-id"
          kind="campo"
          initial={initialValues}
        />
      );

      expect(screen.getByDisplayValue("70")).toBeInTheDocument();
      expect(screen.getByDisplayValue("75")).toBeInTheDocument();
      expect(screen.getByDisplayValue("80")).toBeInTheDocument();
      expect(screen.getByDisplayValue("65")).toBeInTheDocument();
      expect(screen.getByDisplayValue("55")).toBeInTheDocument();
      expect(screen.getByDisplayValue("90")).toBeInTheDocument();
    });
  });

  describe("Slider interactions", () => {
    it("updates displayed value when slider changes", () => {
      render(
        <RatingForm
          groupId="test-group-id"
          ratedId="test-user-id"
          kind="campo"
          initial={null}
        />
      );

      const inputs = screen.getAllByRole("slider");
      const firstSlider = inputs[0] as HTMLInputElement;

      fireEvent.change(firstSlider, { target: { value: "85" } });

      expect(screen.getByDisplayValue("85")).toBeInTheDocument();
    });

    it("updates all stat values independently", () => {
      render(
        <RatingForm
          groupId="test-group-id"
          ratedId="test-user-id"
          kind="campo"
          initial={null}
        />
      );

      const inputs = screen.getAllByRole("slider");

      fireEvent.change(inputs[0], { target: { value: "10" } });
      fireEvent.change(inputs[1], { target: { value: "20" } });
      fireEvent.change(inputs[2], { target: { value: "30" } });
      fireEvent.change(inputs[3], { target: { value: "40" } });
      fireEvent.change(inputs[4], { target: { value: "50" } });
      fireEvent.change(inputs[5], { target: { value: "99" } });

      expect(screen.getByDisplayValue("10")).toBeInTheDocument();
      expect(screen.getByDisplayValue("20")).toBeInTheDocument();
      expect(screen.getByDisplayValue("30")).toBeInTheDocument();
      expect(screen.getByDisplayValue("40")).toBeInTheDocument();
      expect(screen.getByDisplayValue("50")).toBeInTheDocument();
      expect(screen.getByDisplayValue("99")).toBeInTheDocument();
    });
  });

  describe("Form submission", () => {
    it("calls rateTeammate with correct payload on submit", async () => {
      vi.mocked(rateTeammate).mockResolvedValue({
        ok: true,
        data: null,
      } as ActionResult<null>);

      render(
        <RatingForm
          groupId="test-group-id"
          ratedId="test-user-id"
          kind="campo"
          initial={null}
        />
      );

      const submitButton = screen.getByRole("button", {
        name: /Guardar calificación/,
      });
      fireEvent.click(submitButton);

      // Wait for async action
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(rateTeammate).toHaveBeenCalledWith({
        groupId: "test-group-id",
        ratedId: "test-user-id",
        kind: "campo",
        stats: [60, 60, 60, 60, 60, 60],
      });
    });

    it("shows success toast and navigates on successful submission", async () => {
      vi.mocked(rateTeammate).mockResolvedValue({
        ok: true,
        data: null,
      } as ActionResult<null>);

      render(
        <RatingForm
          groupId="test-group-id"
          ratedId="test-user-id"
          kind="campo"
          initial={null}
        />
      );

      const submitButton = screen.getByRole("button", {
        name: /Guardar calificación/,
      });
      fireEvent.click(submitButton);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(toast.success).toHaveBeenCalledWith(
        "Guardamos tu calificación."
      );
      const mockRouter = useRouter() as unknown as ReturnType<typeof useRouter>;
      expect(mockRouter.push).toHaveBeenCalledWith(
        "/g/test-group-id/cartas/test-user-id"
      );
      expect(mockRouter.refresh).toHaveBeenCalled();
    });

    it("shows error toast on submission failure", async () => {
      vi.mocked(rateTeammate).mockResolvedValue({
        ok: false,
        error: "No podés calificarte a voz mismo.",
      } as ActionResult<null>);

      render(
        <RatingForm
          groupId="test-group-id"
          ratedId="test-user-id"
          kind="campo"
          initial={null}
        />
      );

      const submitButton = screen.getByRole("button", {
        name: /Guardar calificación/,
      });
      fireEvent.click(submitButton);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(toast.error).toHaveBeenCalledWith(
        "No podés calificarte a voz mismo."
      );
    });

    it("shows loading state while submitting", () => {
      vi.mocked(rateTeammate).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ ok: true, data: null } as ActionResult<null>),
              1000
            )
          )
      );

      render(
        <RatingForm
          groupId="test-group-id"
          ratedId="test-user-id"
          kind="campo"
          initial={null}
        />
      );

      const submitButton = screen.getByRole("button", {
        name: /Guardar calificación/,
      });
      fireEvent.click(submitButton);

      expect(screen.getByRole("button", { name: /Guardando…/ })).toBeInTheDocument();
    });
  });

  describe("Anonymous vote notice", () => {
    it("displays anonymous vote message", () => {
      render(
        <RatingForm
          groupId="test-group-id"
          ratedId="test-user-id"
          kind="campo"
          initial={null}
        />
      );

      expect(
        screen.getByText(/Tu voto es anónimo/)
      ).toBeInTheDocument();
    });
  });
});
