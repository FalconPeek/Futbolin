import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlayerCard } from "./player-card";

describe("PlayerCard", () => {
  describe("Tiers", () => {
    it("renders bronze tier for OVR < 65", () => {
      const { container } = render(
        <PlayerCard
          name="Test"
          position="MC"
          ovr={50}
          stats={{ RIT: 50, TIR: 50, PAS: 50, REG: 50, DEF: 50, FIS: 50 }}
        />
      );
      const article = container.querySelector("article");
      expect(article).toHaveClass("bg-tier-bronze");
      expect(article).toHaveClass("text-tier-bronze-ink");
    });

    it("renders silver tier for OVR 65-74", () => {
      const { container } = render(
        <PlayerCard
          name="Test"
          position="MC"
          ovr={70}
          stats={{ RIT: 70, TIR: 70, PAS: 70, REG: 70, DEF: 70, FIS: 70 }}
        />
      );
      const article = container.querySelector("article");
      expect(article).toHaveClass("bg-tier-silver");
      expect(article).toHaveClass("text-tier-silver-ink");
    });

    it("renders gold tier for OVR 75-84", () => {
      const { container } = render(
        <PlayerCard
          name="Test"
          position="MC"
          ovr={80}
          stats={{ RIT: 80, TIR: 80, PAS: 80, REG: 80, DEF: 80, FIS: 80 }}
        />
      );
      const article = container.querySelector("article");
      expect(article).toHaveClass("bg-tier-gold");
      expect(article).toHaveClass("text-tier-gold-ink");
    });

    it("renders special tier for OVR >= 85", () => {
      const { container } = render(
        <PlayerCard
          name="Test"
          position="MC"
          ovr={85}
          stats={{ RIT: 85, TIR: 85, PAS: 85, REG: 85, DEF: 85, FIS: 85 }}
        />
      );
      const article = container.querySelector("article");
      expect(article).toHaveClass("bg-tier-special");
      expect(article).toHaveClass("text-tier-special-ink");
    });

    it("renders special tier for MVP even with OVR < 85", () => {
      const { container } = render(
        <PlayerCard
          name="Test"
          position="MC"
          ovr={78}
          mvp
          stats={{ RIT: 78, TIR: 78, PAS: 78, REG: 78, DEF: 78, FIS: 78 }}
        />
      );
      const article = container.querySelector("article");
      expect(article).toHaveClass("bg-tier-special");
      expect(article).toHaveClass("text-tier-special-ink");
    });

    it("renders provisional tier when provisional is true", () => {
      const { container } = render(
        <PlayerCard
          name="Test"
          position="MC"
          ovr={90}
          provisional
          stats={{ RIT: 90, TIR: 90, PAS: 90, REG: 90, DEF: 90, FIS: 90 }}
        />
      );
      const article = container.querySelector("article");
      expect(article).toHaveClass("bg-tier-provisional");
      expect(article).toHaveClass("text-tier-provisional-ink");
    });

    it("uses explicit tier prop if provided", () => {
      const { container } = render(
        <PlayerCard
          name="Test"
          position="MC"
          ovr={50}
          tier="gold"
          stats={{ RIT: 50, TIR: 50, PAS: 50, REG: 50, DEF: 50, FIS: 50 }}
        />
      );
      const article = container.querySelector("article");
      expect(article).toHaveClass("bg-tier-gold");
    });
  });

  describe("Provisional mode", () => {
    it("hides OVR when provisional", () => {
      render(
        <PlayerCard
          name="Test"
          position="MC"
          ovr={85}
          provisional
          stats={{ RIT: 85, TIR: 85, PAS: 85, REG: 85, DEF: 85, FIS: 85 }}
        />
      );
      const ovrSpan = screen.getByText("–");
      expect(ovrSpan).toBeInTheDocument();
    });

    it("shows 'Provisional · faltan votos' note", () => {
      render(
        <PlayerCard
          name="Test"
          position="MC"
          ovr={85}
          provisional
          stats={{ RIT: 85, TIR: 85, PAS: 85, REG: 85, DEF: 85, FIS: 85 }}
        />
      );
      expect(screen.getByText("Provisional · faltan votos")).toBeInTheDocument();
    });

    it("shows – for stats when provisional", () => {
      const { container } = render(
        <PlayerCard
          name="Test"
          position="MC"
          ovr={85}
          provisional
          stats={{}}
        />
      );
      const dds = container.querySelectorAll("dd");
      dds.forEach((dd) => {
        expect(dd.textContent).toBe("–");
      });
    });
  });

  describe("Stats", () => {
    it("renders field stats by default", () => {
      render(
        <PlayerCard
          name="Test"
          position="MC"
          ovr={75}
          stats={{
            RIT: 80,
            TIR: 75,
            PAS: 85,
            REG: 70,
            DEF: 65,
            FIS: 60,
          }}
        />
      );
      expect(screen.getByText("RIT")).toBeInTheDocument();
      expect(screen.getByText("TIR")).toBeInTheDocument();
      expect(screen.getByText("PAS")).toBeInTheDocument();
      expect(screen.getByText("REG")).toBeInTheDocument();
      expect(screen.getByText("DEF")).toBeInTheDocument();
      expect(screen.getByText("FIS")).toBeInTheDocument();
    });

    it("renders goalkeeper stats when goalkeeper prop is true", () => {
      render(
        <PlayerCard
          name="Test"
          position="POR"
          ovr={75}
          goalkeeper
          stats={{
            DIV: 80,
            HAN: 75,
            KIC: 85,
            REF: 70,
            POS: 65,
            SPD: 60,
          }}
        />
      );
      expect(screen.getByText("DIV")).toBeInTheDocument();
      expect(screen.getByText("HAN")).toBeInTheDocument();
      expect(screen.getByText("KIC")).toBeInTheDocument();
      expect(screen.getByText("REF")).toBeInTheDocument();
      expect(screen.getByText("POS")).toBeInTheDocument();
      expect(screen.getByText("SPD")).toBeInTheDocument();
    });

    it("shows – for missing stat values", () => {
      const { container } = render(
        <PlayerCard
          name="Test"
          position="MC"
          ovr={75}
          stats={{ RIT: 80 }}
        />
      );
      const dds = container.querySelectorAll("dd");
      expect(dds[1]).toHaveTextContent("–"); // TIR missing
    });
  });

  describe("Photo and Initials", () => {
    it("renders photo when photoUrl is provided", () => {
      render(
        <PlayerCard
          name="John Doe"
          position="MC"
          ovr={75}
          photoUrl="https://example.com/photo.jpg"
          stats={{ RIT: 75, TIR: 75, PAS: 75, REG: 75, DEF: 75, FIS: 75 }}
        />
      );
      const img = screen.getByAltText("John Doe");
      expect(img).toHaveAttribute("src", "https://example.com/photo.jpg");
    });

    it("renders initials when photoUrl is not provided", () => {
      render(
        <PlayerCard
          name="John Doe"
          position="MC"
          ovr={75}
          stats={{ RIT: 75, TIR: 75, PAS: 75, REG: 75, DEF: 75, FIS: 75 }}
        />
      );
      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("handles names with multiple words correctly", () => {
      render(
        <PlayerCard
          name="Juan Carlos García"
          position="MC"
          ovr={75}
          stats={{ RIT: 75, TIR: 75, PAS: 75, REG: 75, DEF: 75, FIS: 75 }}
        />
      );
      expect(screen.getByText("JC")).toBeInTheDocument();
    });
  });

  describe("PlayStyles", () => {
    it("renders up to 3 PlayStyles", () => {
      render(
        <PlayerCard
          name="Test"
          position="MC"
          ovr={75}
          playStyles={["Tiki-Taka", "Presión", "Contra", "Extra"]}
          stats={{ RIT: 75, TIR: 75, PAS: 75, REG: 75, DEF: 75, FIS: 75 }}
        />
      );
      expect(screen.getByText("Tiki-Taka")).toBeInTheDocument();
      expect(screen.getByText("Presión")).toBeInTheDocument();
      expect(screen.getByText("Contra")).toBeInTheDocument();
      expect(screen.queryByText("Extra")).not.toBeInTheDocument();
    });

    it("renders PlayStyle+ with plus indicator", () => {
      render(
        <PlayerCard
          name="Test"
          position="MC"
          ovr={75}
          playStyles={["Tiki-Taka", { label: "Presión", plus: true }]}
          stats={{ RIT: 75, TIR: 75, PAS: 75, REG: 75, DEF: 75, FIS: 75 }}
        />
      );
      expect(screen.getByText("Tiki-Taka")).toBeInTheDocument();
      expect(screen.getByText("Presión+")).toBeInTheDocument();
    });

    it("hides PlayStyles in small size", () => {
      const { container } = render(
        <PlayerCard
          name="Test"
          position="MC"
          ovr={75}
          size="sm"
          playStyles={["Tiki-Taka"]}
          stats={{ RIT: 75, TIR: 75, PAS: 75, REG: 75, DEF: 75, FIS: 75 }}
        />
      );
      const ul = container.querySelector("ul");
      expect(ul).not.toBeInTheDocument();
    });
  });

  describe("Sizes", () => {
    it("renders md size by default", () => {
      const { container } = render(
        <PlayerCard
          name="Test"
          position="MC"
          ovr={75}
          stats={{ RIT: 75, TIR: 75, PAS: 75, REG: 75, DEF: 75, FIS: 75 }}
        />
      );
      const article = container.querySelector("article");
      expect(article).toHaveClass("w-[200px]");
    });

    it("renders sm size when requested", () => {
      const { container } = render(
        <PlayerCard
          name="Test"
          position="MC"
          ovr={75}
          size="sm"
          stats={{ RIT: 75, TIR: 75, PAS: 75, REG: 75, DEF: 75, FIS: 75 }}
        />
      );
      const article = container.querySelector("article");
      expect(article).toHaveClass("w-[148px]");
    });
  });

  describe("Aria labels", () => {
    it("has correct aria-label for normal card", () => {
      render(
        <PlayerCard
          name="John Doe"
          position="MC"
          ovr={75}
          stats={{ RIT: 75, TIR: 75, PAS: 75, REG: 75, DEF: 75, FIS: 75 }}
        />
      );
      const article = screen.getByLabelText(
        /John Doe, MC, OVR 75, nivel Oro/
      );
      expect(article).toBeInTheDocument();
    });

    it("has aria-label with 'oculto' for provisional", () => {
      render(
        <PlayerCard
          name="John Doe"
          position="MC"
          ovr={75}
          provisional
          stats={{ RIT: 75, TIR: 75, PAS: 75, REG: 75, DEF: 75, FIS: 75 }}
        />
      );
      const article = screen.getByLabelText(
        /John Doe, MC, OVR oculto, nivel Provisional/
      );
      expect(article).toBeInTheDocument();
    });
  });

  describe("Name rendering", () => {
    it("renders name and truncates with ellipsis", () => {
      render(
        <PlayerCard
          name="Verylongnamethatmightoverflow"
          position="MC"
          ovr={75}
          stats={{ RIT: 75, TIR: 75, PAS: 75, REG: 75, DEF: 75, FIS: 75 }}
        />
      );
      const heading = screen.getByText("Verylongnamethatmightoverflow");
      expect(heading).toHaveClass("truncate");
    });
  });
});
