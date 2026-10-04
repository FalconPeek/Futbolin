import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StandingsTable } from "./standings-table";
import { FormBadge } from "./form-badge";
import type { StandingsRow } from "./types";

describe("FormBadge", () => {
  it("renders result letter", () => {
    const { rerender } = render(<FormBadge result="G" />);
    expect(screen.getByText("G")).toBeInTheDocument();

    rerender(<FormBadge result="E" />);
    expect(screen.getByText("E")).toBeInTheDocument();

    rerender(<FormBadge result="P" />);
    expect(screen.getByText("P")).toBeInTheDocument();
  });

  it("has correct aria-label for each result", () => {
    const { rerender } = render(<FormBadge result="G" />);
    expect(screen.getByLabelText("Ganado")).toBeInTheDocument();

    rerender(<FormBadge result="E" />);
    expect(screen.getByLabelText("Empatado")).toBeInTheDocument();

    rerender(<FormBadge result="P" />);
    expect(screen.getByLabelText("Perdido")).toBeInTheDocument();
  });

  it("has correct styling for victory (G)", () => {
    const { container } = render(<FormBadge result="G" />);
    const span = container.querySelector("span");
    expect(span).toHaveClass("bg-primary", "text-primary-foreground");
  });

  it("has correct styling for draw (E)", () => {
    const { container } = render(<FormBadge result="E" />);
    const span = container.querySelector("span");
    expect(span).toHaveClass("bg-muted", "text-muted-foreground");
  });

  it("has correct styling for loss (P)", () => {
    const { container } = render(<FormBadge result="P" />);
    const span = container.querySelector("span");
    expect(span).toHaveClass("bg-transparent", "text-destructive");
  });

  it("has title attribute with result label", () => {
    const { rerender } = render(<FormBadge result="G" />);
    expect(screen.getByTitle("Ganado")).toBeInTheDocument();

    rerender(<FormBadge result="E" />);
    expect(screen.getByTitle("Empatado")).toBeInTheDocument();

    rerender(<FormBadge result="P" />);
    expect(screen.getByTitle("Perdido")).toBeInTheDocument();
  });
});

describe("StandingsTable", () => {
  it("renders a table with header and rows", () => {
    const rows: StandingsRow[] = [
      {
        id: "1",
        name: "Equipo A",
        pj: 5,
        g: 3,
        e: 1,
        p: 1,
        gf: 12,
        gc: 5,
        pts: 10,
      },
    ];

    render(<StandingsTable rows={rows} />);
    expect(screen.getByText("Equipo A")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("calculates DG (goal difference) correctly", () => {
    const rows: StandingsRow[] = [
      {
        name: "Positive DG",
        pj: 5,
        g: 3,
        e: 1,
        p: 1,
        gf: 15,
        gc: 10,
        pts: 10,
      },
      {
        name: "Negative DG",
        pj: 5,
        g: 1,
        e: 1,
        p: 3,
        gf: 5,
        gc: 13,
        pts: 4,
      },
      {
        name: "Zero DG",
        pj: 5,
        g: 2,
        e: 1,
        p: 2,
        gf: 7,
        gc: 7,
        pts: 7,
      },
    ];

    render(<StandingsTable rows={rows} />);

    expect(screen.getByText("+5")).toBeInTheDocument();
    expect(screen.getByText("-8")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("shows position number or calculated index", () => {
    const rows: StandingsRow[] = [
      {
        pos: 1,
        name: "Team 1",
        pj: 5,
        g: 3,
        e: 1,
        p: 1,
        gf: 15,
        gc: 5,
        pts: 10,
      },
      {
        name: "Team 2",
        pj: 5,
        g: 2,
        e: 1,
        p: 2,
        gf: 8,
        gc: 7,
        pts: 7,
      },
    ];

    const { container } = render(<StandingsTable rows={rows} />);
    const tbody = container.querySelector("tbody");
    const positionCells = tbody?.querySelectorAll("td:first-child") || [];

    expect(positionCells[0]?.textContent).toBe("1");
    expect(positionCells[1]?.textContent).toBe("2");
  });

  it("marks qualifying positions when qualify is set", () => {
    const rows: StandingsRow[] = [
      {
        pos: 1,
        name: "Team 1",
        pj: 5,
        g: 3,
        e: 1,
        p: 1,
        gf: 15,
        gc: 5,
        pts: 10,
      },
      {
        pos: 2,
        name: "Team 2",
        pj: 5,
        g: 2,
        e: 1,
        p: 2,
        gf: 8,
        gc: 7,
        pts: 7,
      },
      {
        pos: 3,
        name: "Team 3",
        pj: 5,
        g: 1,
        e: 1,
        p: 3,
        gf: 6,
        gc: 11,
        pts: 4,
      },
    ];

    const { container } = render(<StandingsTable rows={rows} qualify={2} />);
    const rows_ = container.querySelectorAll("tbody tr");

    expect(rows_[0]?.textContent).toContain("Team 1");
    expect(rows_[1]?.textContent).toContain("Team 2");
    expect(rows_[2]?.textContent).toContain("Team 3");

    const firstPosCell = rows_[0]?.querySelector("td:first-child");
    const secondPosCell = rows_[1]?.querySelector("td:first-child");
    const thirdPosCell = rows_[2]?.querySelector("td:first-child");

    expect(firstPosCell).toHaveClass("text-primary");
    expect(secondPosCell).toHaveClass("text-primary");
    expect(thirdPosCell).not.toHaveClass("text-primary");

    expect(secondPosCell).toHaveClass("border-b-primary");
  });

  it("shows Buchholz column only when data is present or explicitly enabled", () => {
    const rowsWithoutBuchholz: StandingsRow[] = [
      {
        name: "Team 1",
        pj: 5,
        g: 3,
        e: 1,
        p: 1,
        gf: 15,
        gc: 5,
        pts: 10,
      },
    ];

    const { rerender } = render(
      <StandingsTable rows={rowsWithoutBuchholz} />
    );
    expect(screen.queryByText("Bh")).not.toBeInTheDocument();

    const rowsWithBuchholz: StandingsRow[] = [
      {
        name: "Team 1",
        pj: 5,
        g: 3,
        e: 1,
        p: 1,
        gf: 15,
        gc: 5,
        pts: 10,
        buchholz: 42,
      },
    ];

    rerender(<StandingsTable rows={rowsWithBuchholz} />);
    expect(screen.getByText("Bh")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("shows Form column with FormBadges when data is present", () => {
    const rows: StandingsRow[] = [
      {
        name: "Team with form",
        pj: 10,
        g: 7,
        e: 1,
        p: 2,
        gf: 21,
        gc: 8,
        pts: 22,
        form: ["P", "E", "G", "G", "G"],
      },
    ];

    render(<StandingsTable rows={rows} />);
    expect(screen.getByText("Forma")).toBeInTheDocument();

    const formBadges = screen.getAllByLabelText(/Ganado|Empatado|Perdido/);
    expect(formBadges).toHaveLength(5);
  });

  it("shows last 5 form results even if more are provided", () => {
    const rows: StandingsRow[] = [
      {
        name: "Team with long form",
        pj: 10,
        g: 7,
        e: 1,
        p: 2,
        gf: 18,
        gc: 8,
        pts: 22,
        form: ["P", "P", "E", "G", "G", "G", "G"],
      },
    ];

    render(<StandingsTable rows={rows} />);
    const formBadges = screen.getAllByLabelText(/Ganado|Empatado|Perdido/);
    expect(formBadges).toHaveLength(5);

    const badgeResults = formBadges.map((el) => el.textContent?.trim());
    expect(badgeResults).toEqual(["E", "G", "G", "G", "G"]);
  });

  it("displays team color as inline style crest", () => {
    const rows: StandingsRow[] = [
      {
        name: "Colorful Team",
        color: "#ff0000",
        pj: 5,
        g: 3,
        e: 1,
        p: 1,
        gf: 15,
        gc: 5,
        pts: 10,
      },
    ];

    const { container } = render(<StandingsTable rows={rows} />);
    const crest = container.querySelector("span[style*='background']");
    expect(crest).toHaveStyle("background-color: #ff0000");
  });

  it("uses custom teamLabel", () => {
    const rows: StandingsRow[] = [
      {
        name: "Player Name",
        pj: 5,
        g: 3,
        e: 1,
        p: 1,
        gf: 15,
        gc: 5,
        pts: 10,
      },
    ];

    render(<StandingsTable rows={rows} teamLabel="Jugador" />);
    expect(screen.getByText("Jugador")).toBeInTheDocument();
  });

  it("displays caption when provided", () => {
    const rows: StandingsRow[] = [
      {
        name: "Team 1",
        pj: 5,
        g: 3,
        e: 1,
        p: 1,
        gf: 15,
        gc: 5,
        pts: 10,
      },
    ];

    render(<StandingsTable rows={rows} caption="Grupo A" />);
    expect(screen.getByText("Grupo A")).toBeInTheDocument();
  });

  it("shows Pts column with bold styling", () => {
    const rows: StandingsRow[] = [
      {
        name: "Team 1",
        pj: 5,
        g: 3,
        e: 1,
        p: 1,
        gf: 15,
        gc: 5,
        pts: 10,
      },
    ];

    const { container } = render(<StandingsTable rows={rows} />);
    const ptsCells = container.querySelectorAll("td.font-bold");
    expect(ptsCells.length).toBeGreaterThan(0);
  });

  it("uses tabular numbers for all numeric data", () => {
    const rows: StandingsRow[] = [
      {
        name: "Team 1",
        pj: 5,
        g: 3,
        e: 1,
        p: 1,
        gf: 15,
        gc: 5,
        pts: 10,
      },
    ];

    const { container } = render(<StandingsTable rows={rows} />);
    const table = container.querySelector("table");
    expect(table).toHaveClass("tabular");
  });

  it("renders sticky team name column", () => {
    const rows: StandingsRow[] = [
      {
        name: "Team 1",
        pj: 5,
        g: 3,
        e: 1,
        p: 1,
        gf: 15,
        gc: 5,
        pts: 10,
      },
    ];

    const { container } = render(<StandingsTable rows={rows} />);
    const teamCells = container.querySelectorAll("th:nth-child(2)");
    const cell = teamCells[1];
    expect(cell).toHaveClass("sticky");
  });
});
