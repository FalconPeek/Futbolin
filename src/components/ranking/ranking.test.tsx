import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RankingView } from "./ranking-view";
import type { PlayerStandingsRow } from "@/lib/standings/players";

describe("RankingView", () => {
  it("displays empty state when no rows", () => {
    render(<RankingView rows={[]} />);
    expect(
      screen.getByText("Todavía no hay partidos jugados")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Cuando cierren el primer partido vas a ver la tabla acá.")
    ).toBeInTheDocument();
  });

  it("displays standings table with Jugador label", () => {
    const rows: PlayerStandingsRow[] = [
      {
        id: "1",
        name: "Player A",
        pos: 1,
        pj: 3,
        g: 2,
        e: 1,
        p: 0,
        gf: 5,
        gc: 2,
        pts: 7,
        form: ["G", "E", "G"],
        goals: 3,
        assists: 1,
        mvps: 1,
      },
    ];

    const { container } = render(<RankingView rows={rows} />);
    const tableHeaders = container.querySelectorAll("table th");
    expect(tableHeaders[1]).toHaveTextContent("Jugador");
    expect(screen.getAllByText("Player A")).toBeDefined();
  });

  it("displays top scorers sorted by goals desc, then name asc", () => {
    const rows: PlayerStandingsRow[] = [
      {
        id: "1",
        name: "Alfredo",
        pos: 1,
        pj: 1,
        g: 1,
        e: 0,
        p: 0,
        gf: 3,
        gc: 0,
        pts: 3,
        form: ["G"],
        goals: 3,
        assists: 0,
        mvps: 0,
      },
      {
        id: "2",
        name: "Beto",
        pos: 2,
        pj: 1,
        g: 0,
        e: 0,
        p: 1,
        gf: 0,
        gc: 3,
        pts: 0,
        form: ["P"],
        goals: 2,
        assists: 0,
        mvps: 0,
      },
      {
        id: "3",
        name: "Carlos",
        pos: 3,
        pj: 1,
        g: 0,
        e: 0,
        p: 1,
        gf: 0,
        gc: 3,
        pts: 0,
        form: ["P"],
        goals: 2,
        assists: 0,
        mvps: 0,
      },
    ];

    const { container } = render(<RankingView rows={rows} />);

    // Find the ol element that appears after the "Goleadores" title
    const allOlElements = container.querySelectorAll("ol");
    const scorersList = allOlElements[0];
    const scorerItems = scorersList?.querySelectorAll("li");

    expect(scorerItems).toHaveLength(3);
    expect(scorerItems?.[0]).toHaveTextContent("Alfredo");
    expect(scorerItems?.[0]).toHaveTextContent("3");
    expect(scorerItems?.[1]).toHaveTextContent("Beto");
    expect(scorerItems?.[1]).toHaveTextContent("2");
    expect(scorerItems?.[2]).toHaveTextContent("Carlos");
    expect(scorerItems?.[2]).toHaveTextContent("2");
  });

  it("hides players with 0 value in top lists", () => {
    const rows: PlayerStandingsRow[] = [
      {
        id: "1",
        name: "Player With Goals",
        pos: 1,
        pj: 1,
        g: 1,
        e: 0,
        p: 0,
        gf: 2,
        gc: 0,
        pts: 3,
        form: ["G"],
        goals: 2,
        assists: 0,
        mvps: 0,
      },
      {
        id: "2",
        name: "Player Without Goals",
        pos: 2,
        pj: 1,
        g: 0,
        e: 1,
        p: 0,
        gf: 0,
        gc: 0,
        pts: 1,
        form: ["E"],
        goals: 0,
        assists: 0,
        mvps: 0,
      },
    ];

    const { container } = render(<RankingView rows={rows} />);

    const allOlElements = container.querySelectorAll("ol");
    const scorersList = allOlElements[0];
    const scorerItems = scorersList?.querySelectorAll("li");

    expect(scorerItems).toHaveLength(1);
    expect(scorerItems?.[0]).toHaveTextContent("Player With Goals");
  });

  it("displays 'Todavía nadie.' when top list is empty", () => {
    const rows: PlayerStandingsRow[] = [
      {
        id: "1",
        name: "Player",
        pos: 1,
        pj: 1,
        g: 0,
        e: 1,
        p: 0,
        gf: 0,
        gc: 0,
        pts: 1,
        form: ["E"],
        goals: 0,
        assists: 0,
        mvps: 0,
      },
    ];

    render(<RankingView rows={rows} />);

    const emptyMessages = screen.getAllByText("Todavía nadie.");
    expect(emptyMessages.length).toBeGreaterThan(0);
  });

  it("truncates top list to 5 items", () => {
    const rows: PlayerStandingsRow[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      name: `Player ${i + 1}`,
      pos: i + 1,
      pj: 1,
      g: 1,
      e: 0,
      p: 0,
      gf: 1,
      gc: 0,
      pts: 3,
      form: ["G"],
      goals: 10 - i,
      assists: 5 - i,
      mvps: 3 - i,
    }));

    const { container } = render(<RankingView rows={rows} />);

    const allOlElements = container.querySelectorAll("ol");
    const scorersList = allOlElements[0];
    const scorerItems = scorersList?.querySelectorAll("li");

    expect(scorerItems).toHaveLength(5);
  });

  it("displays assists and MVP top lists", () => {
    const rows: PlayerStandingsRow[] = [
      {
        id: "1",
        name: "Assist Player",
        pos: 1,
        pj: 1,
        g: 0,
        e: 0,
        p: 1,
        gf: 0,
        gc: 1,
        pts: 0,
        form: ["P"],
        goals: 0,
        assists: 5,
        mvps: 2,
      },
    ];

    render(<RankingView rows={rows} />);

    expect(screen.getByText("Asistidores")).toBeInTheDocument();
    expect(screen.getByText("MVP")).toBeInTheDocument();
    expect(screen.getAllByText("Assist Player")).toBeDefined();
  });
});
