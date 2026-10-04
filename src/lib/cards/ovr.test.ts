import { describe, it, expect } from "vitest";
import {
  computeOvr,
  OVR_WEIGHTS,
} from "./ovr";
import {
  positionGroup,
  ratingKind,
} from "./positions";

describe("OVR Weights", () => {
  it("arquero weights sum to 1", () => {
    const sum = OVR_WEIGHTS.arquero.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("defensa weights sum to 1", () => {
    const sum = OVR_WEIGHTS.defensa.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("medio weights sum to 1", () => {
    const sum = OVR_WEIGHTS.medio.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("ataque weights sum to 1", () => {
    const sum = OVR_WEIGHTS.ataque.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe("computeOvr", () => {
  it("calculates arquero OVR correctly", () => {
    const ovr = computeOvr("POR", [80, 75, 70, 85, 65, 55]);
    expect(ovr).toBe(75);
  });

  it("calculates defensa OVR correctly", () => {
    const ovr = computeOvr("DFC", [75, 65, 70, 72, 80, 85]);
    expect(ovr).toBe(78);
  });

  it("calculates medio OVR correctly", () => {
    const ovr = computeOvr("MC", [70, 60, 80, 75, 50, 65]);
    expect(ovr).toBe(70);
  });

  it("calculates ataque OVR correctly", () => {
    const ovr = computeOvr("DC", [85, 90, 75, 80, 50, 70]);
    expect(ovr).toBe(82);
  });

  it("clamps OVR to minimum of 1", () => {
    const ovr = computeOvr("POR", [1, 1, 1, 1, 1, 1]);
    expect(ovr).toBe(1);
  });

  it("clamps OVR to maximum of 99", () => {
    const ovr = computeOvr("POR", [99, 99, 99, 99, 99, 99]);
    expect(ovr).toBe(99);
  });

  it("throws error when stats don't have exactly 6 values", () => {
    expect(() => computeOvr("POR", [70, 75, 80])).toThrow(
      "Stats must have exactly 6 values"
    );
  });

  it("throws error when stats have more than 6 values", () => {
    expect(() => computeOvr("POR", [70, 75, 80, 85, 90, 95, 100])).toThrow(
      "Stats must have exactly 6 values"
    );
  });

  it("throws error when stats array is empty", () => {
    expect(() => computeOvr("POR", [])).toThrow(
      "Stats must have exactly 6 values"
    );
  });
});

describe("positionGroup", () => {
  it("returns arquero for POR", () => {
    expect(positionGroup("POR")).toBe("arquero");
  });

  it("returns defensa for defensive positions", () => {
    expect(positionGroup("LI")).toBe("defensa");
    expect(positionGroup("DFC")).toBe("defensa");
    expect(positionGroup("LD")).toBe("defensa");
    expect(positionGroup("CAI")).toBe("defensa");
    expect(positionGroup("CAD")).toBe("defensa");
  });

  it("returns medio for midfield positions", () => {
    expect(positionGroup("MCD")).toBe("medio");
    expect(positionGroup("MC")).toBe("medio");
    expect(positionGroup("MCO")).toBe("medio");
    expect(positionGroup("MI")).toBe("medio");
    expect(positionGroup("MD")).toBe("medio");
  });

  it("returns ataque for attacking positions", () => {
    expect(positionGroup("EI")).toBe("ataque");
    expect(positionGroup("ED")).toBe("ataque");
    expect(positionGroup("SD")).toBe("ataque");
    expect(positionGroup("DC")).toBe("ataque");
  });
});

describe("ratingKind", () => {
  it("returns arquero for POR", () => {
    expect(ratingKind("POR")).toBe("arquero");
  });

  it("returns campo for all other positions", () => {
    expect(ratingKind("DFC")).toBe("campo");
    expect(ratingKind("MC")).toBe("campo");
    expect(ratingKind("DC")).toBe("campo");
  });
});
