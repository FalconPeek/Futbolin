import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

function getTsxFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getTsxFiles(fullPath));
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".tsx") &&
      !entry.name.endsWith(".test.tsx")
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("design tokens", () => {
  it("should not use tailwind default text sizes or rounded-xl", () => {
    const cwd = process.cwd();
    const componentDir = join(cwd, "src", "components");
    const appDir = join(cwd, "src", "app");

    const filesInComponents = getTsxFiles(componentDir);
    const filesInApp = getTsxFiles(appDir);
    const allFiles = [...filesInComponents, ...filesInApp];

    const forbiddenClasses = [
      /\btext-xs\b/,
      /\btext-sm\b/,
      /\btext-base\b/,
      /\btext-lg\b/,
      /\btext-xl\b/,
      /\btext-2xl\b/,
      /\brounded-xl\b/,
    ];

    const violations: { file: string; class: string }[] = [];

    for (const file of allFiles) {
      const content = readFileSync(file, "utf-8");
      for (const pattern of forbiddenClasses) {
        if (pattern.test(content)) {
          const matches = content.match(pattern);
          if (matches) {
            violations.push({
              file: relative(cwd, file),
              class: matches[0],
            });
          }
        }
      }
    }

    if (violations.length > 0) {
      const message = violations
        .map(({ file, class: cls }) => `${file}: ${cls}`)
        .join("\n");
      expect.fail(
        `Found forbidden tailwind classes:\n${message}`
      );
    }

    expect(violations.length).toBe(0);
  });
});
