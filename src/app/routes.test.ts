import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { readdirSync } from "node:fs";

const projectRoot = process.cwd();

const EXPECTED_ROUTES = [
  "src/app/page.tsx",
  "src/app/offline/page.tsx",
  "src/app/(auth)/ingresar/page.tsx",
  "src/app/(auth)/registrarme/page.tsx",
  "src/app/(app)/perfil/page.tsx",
  "src/app/(app)/grupos/page.tsx",
  "src/app/(app)/grupos/nuevo/page.tsx",
  "src/app/(app)/unirse/[code]/page.tsx",
  "src/app/(app)/g/[gid]/page.tsx",
  "src/app/(app)/g/[gid]/miembros/page.tsx",
  "src/app/(app)/g/[gid]/partidos/page.tsx",
  "src/app/(app)/g/[gid]/partidos/nuevo/page.tsx",
  "src/app/(app)/g/[gid]/partidos/[mid]/page.tsx",
  "src/app/(app)/g/[gid]/partidos/[mid]/equipos/page.tsx",
  "src/app/(app)/g/[gid]/partidos/[mid]/resultado/page.tsx",
  "src/app/(app)/g/[gid]/cartas/page.tsx",
  "src/app/(app)/g/[gid]/cartas/[uid]/page.tsx",
  "src/app/(app)/g/[gid]/cartas/[uid]/calificar/page.tsx",
  "src/app/(app)/g/[gid]/ranking/page.tsx",
  "src/app/(app)/g/[gid]/torneos/page.tsx",
  "src/app/(app)/g/[gid]/torneos/nuevo/page.tsx",
  "src/app/(app)/g/[gid]/torneos/[tid]/page.tsx",
  "src/app/(app)/g/[gid]/torneos/[tid]/equipos/page.tsx",
  "src/app/(app)/g/[gid]/torneos/[tid]/partidos/[tmid]/page.tsx",
];

const EXPECTED_LAYOUTS = [
  "src/app/layout.tsx",
  "src/app/(app)/layout.tsx",
  "src/app/(app)/g/[gid]/layout.tsx",
];

describe("routes", () => {
  describe("all expected pages exist", () => {
    it.each(EXPECTED_ROUTES)("page exists: %s", (route) => {
      const fullPath = join(projectRoot, route);
      expect(existsSync(fullPath)).toBe(true);
    });
  });

  describe("all required layouts exist", () => {
    it.each(EXPECTED_LAYOUTS)("layout exists: %s", (layout) => {
      const fullPath = join(projectRoot, layout);
      expect(existsSync(fullPath)).toBe(true);
    });
  });

  it("should have no backslashes in src/ filenames or directories", () => {
    const srcPath = join(projectRoot, "src");

    function checkForBackslashes(dir: string, relativePath = ""): string[] {
      const issues: string[] = [];
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.includes("\\")) {
          issues.push(`${relativePath}/${entry.name}`);
        }
        if (entry.isDirectory()) {
          issues.push(
            ...checkForBackslashes(
              join(dir, entry.name),
              `${relativePath}/${entry.name}`
            )
          );
        }
      }
      return issues;
    }

    const backslashIssues = checkForBackslashes(srcPath);
    expect(backslashIssues).toHaveLength(0);
  });
});
