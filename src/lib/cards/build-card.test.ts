import { describe, it, expect } from "vitest";
import { buildCard, sortCards, MIN_RATERS, type CardRow } from "./build-card";

describe("buildCard", () => {
  it("builds a field player card with stats and calculated OVR", () => {
    const row: CardRow = {
      user_id: "user-1",
      display_name: "Juan García",
      nickname: "Juanpi",
      position: "MC",
      kind: "campo",
      raters: 5,
      s1: 80, // RIT
      s2: 75, // TIR
      s3: 85, // PAS
      s4: 80, // REG
      s5: 70, // DEF
      s6: 60, // FIS
    };

    const card = buildCard(row);

    expect(card.name).toBe("Juanpi");
    expect(card.position).toBe("MC");
    expect(card.goalkeeper).toBe(false);
    expect(card.provisional).toBe(false);
    expect(card.raters).toBe(5);
    expect(card.stats).toEqual({
      RIT: 80,
      TIR: 75,
      PAS: 85,
      REG: 80,
      DEF: 70,
      FIS: 60,
    });
    expect(typeof card.ovr).toBe("number");
    expect(card.ovr).toBeGreaterThan(0);
    expect(card.ovr).toBeLessThanOrEqual(99);
    expect(card.mvp).toBe(false);
    expect(card.userId).toBe("user-1");
  });

  it("builds a goalkeeper card with DIV..SPD stats", () => {
    const row: CardRow = {
      user_id: "gk-1",
      display_name: "Carlos López",
      nickname: null,
      position: "POR",
      kind: "arquero",
      raters: 4,
      s1: 85, // DIV
      s2: 80, // HAN
      s3: 70, // KIC
      s4: 75, // REF
      s5: 82, // POS
      s6: 60, // SPD
    };

    const card = buildCard(row);

    expect(card.name).toBe("Carlos López");
    expect(card.goalkeeper).toBe(true);
    expect(card.stats).toEqual({
      DIV: 85,
      HAN: 80,
      KIC: 70,
      REF: 75,
      POS: 82,
      SPD: 60,
    });
    expect(typeof card.ovr).toBe("number");
  });

  it("marks card as provisional when raters < MIN_RATERS", () => {
    expect(MIN_RATERS).toBe(3);
    const row: CardRow = {
      user_id: "user-2",
      display_name: "Pedro",
      nickname: null,
      position: "EI",
      kind: "campo",
      raters: MIN_RATERS - 1,
      s1: 75,
      s2: 80,
      s3: 70,
      s4: 65,
      s5: 60,
      s6: 85,
    };

    const card = buildCard(row);

    expect(card.provisional).toBe(true);
    expect(card.ovr).toBe(0);
    expect(card.stats).toEqual({});
  });

  it("marks card as provisional when any stat is null", () => {
    const row: CardRow = {
      user_id: "user-3",
      display_name: "Martín",
      nickname: "Marty",
      position: "DC",
      kind: "campo",
      raters: 3,
      s1: 88,
      s2: 92,
      s3: null,
      s4: 85,
      s5: 80,
      s6: 75,
    };

    const card = buildCard(row);

    expect(card.provisional).toBe(true);
    expect(card.ovr).toBe(0);
    expect(card.stats).toEqual({});
  });

  it("uses display_name when nickname is null", () => {
    const row: CardRow = {
      user_id: "user-4",
      display_name: "Fernando González",
      nickname: null,
      position: "DFC",
      kind: "campo",
      raters: 3,
      s1: 70,
      s2: 65,
      s3: 75,
      s4: 80,
      s5: 85,
      s6: 60,
    };

    const card = buildCard(row);

    expect(card.name).toBe("Fernando González");
  });

  it("sets mvp flag when passed in options", () => {
    const row: CardRow = {
      user_id: "mvp-1",
      display_name: "Star Player",
      nickname: "MVP",
      position: "DC",
      kind: "campo",
      raters: 5,
      s1: 95,
      s2: 90,
      s3: 88,
      s4: 87,
      s5: 85,
      s6: 80,
    };

    const card = buildCard(row, { mvp: true });

    expect(card.mvp).toBe(true);
  });
});

describe("sortCards", () => {
  it("sorts non-provisional cards by OVR descending", () => {
    const cards = [
      buildCard({
        user_id: "1",
        display_name: "Alice",
        nickname: null,
        position: "MC",
        kind: "campo",
        raters: 3,
        s1: 70,
        s2: 70,
        s3: 70,
        s4: 70,
        s5: 70,
        s6: 70,
      }),
      buildCard({
        user_id: "2",
        display_name: "Bob",
        nickname: null,
        position: "MC",
        kind: "campo",
        raters: 3,
        s1: 80,
        s2: 80,
        s3: 80,
        s4: 80,
        s5: 80,
        s6: 80,
      }),
      buildCard({
        user_id: "3",
        display_name: "Charlie",
        nickname: null,
        position: "MC",
        kind: "campo",
        raters: 3,
        s1: 75,
        s2: 75,
        s3: 75,
        s4: 75,
        s5: 75,
        s6: 75,
      }),
    ];

    const sorted = sortCards(cards);

    expect(sorted[0].name).toBe("Bob"); // OVR ~80
    expect(sorted[1].name).toBe("Charlie"); // OVR ~75
    expect(sorted[2].name).toBe("Alice"); // OVR ~70
  });

  it("places non-provisional before provisional cards", () => {
    const nonProvisional = buildCard({
      user_id: "np-1",
      display_name: "Verified",
      nickname: null,
      position: "MC",
      kind: "campo",
      raters: 3,
      s1: 75,
      s2: 75,
      s3: 75,
      s4: 75,
      s5: 75,
      s6: 75,
    });

    const provisional = buildCard({
      user_id: "p-1",
      display_name: "Provisional",
      nickname: null,
      position: "MC",
      kind: "campo",
      raters: 2,
      s1: 75,
      s2: 75,
      s3: 75,
      s4: 75,
      s5: 75,
      s6: 75,
    });

    const sorted = sortCards([provisional, nonProvisional]);

    expect(sorted[0].userId).toBe("np-1");
    expect(sorted[1].userId).toBe("p-1");
  });

  it("sorts provisional cards by name ascending", () => {
    const cards = [
      buildCard({
        user_id: "1",
        display_name: "Zoe",
        nickname: null,
        position: "MC",
        kind: "campo",
        raters: 2,
        s1: 75,
        s2: 75,
        s3: 75,
        s4: 75,
        s5: 75,
        s6: 75,
      }),
      buildCard({
        user_id: "2",
        display_name: "Alice",
        nickname: null,
        position: "MC",
        kind: "campo",
        raters: 1,
        s1: 75,
        s2: 75,
        s3: 75,
        s4: 75,
        s5: 75,
        s6: 75,
      }),
      buildCard({
        user_id: "3",
        display_name: "Miguel",
        nickname: null,
        position: "MC",
        kind: "campo",
        raters: 2,
        s1: 75,
        s2: 75,
        s3: 75,
        s4: 75,
        s5: 75,
        s6: 75,
      }),
    ];

    const sorted = sortCards(cards);

    // All are provisional, so sort by name: Alice, Miguel, Zoe
    expect(sorted[0].name).toBe("Alice");
    expect(sorted[1].name).toBe("Miguel");
    expect(sorted[2].name).toBe("Zoe");
  });

  it("breaks OVR ties by name ascending", () => {
    const cards = [
      buildCard({
        user_id: "1",
        display_name: "Zoe",
        nickname: null,
        position: "MC",
        kind: "campo",
        raters: 3,
        s1: 75,
        s2: 75,
        s3: 75,
        s4: 75,
        s5: 75,
        s6: 75,
      }),
      buildCard({
        user_id: "2",
        display_name: "Alice",
        nickname: null,
        position: "MC",
        kind: "campo",
        raters: 3,
        s1: 75,
        s2: 75,
        s3: 75,
        s4: 75,
        s5: 75,
        s6: 75,
      }),
    ];

    const sorted = sortCards(cards);

    // Same OVR, sort by name: Alice, Zoe
    expect(sorted[0].name).toBe("Alice");
    expect(sorted[1].name).toBe("Zoe");
  });
});
