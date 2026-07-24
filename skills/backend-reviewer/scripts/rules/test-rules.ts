import * as fs from "node:fs";
import * as path from "node:path";
import { Violation } from "../types";

function checkTest001(file: string, content: string, violations: Violation[]) {
  // This project uses GLOBAL jest types (tsconfig types: ["jest", "node"]);
  // '@jest/globals' is not a dependency, so importing it breaks `pnpm check`.
  // Flag the import instead of requiring it.
  const lines = content.split("\n");
  const lineNum = lines.findIndex((l) => l.includes("from '@jest/globals'")) + 1;
  if (lineNum > 0) {
    violations.push({
      file,
      line: lineNum,
      rule: "TEST-001",
      severity: "MEDIUM",
      detail: `Import from '@jest/globals' — this package is not installed and breaks 'pnpm check'. Remove the import; use global jest (describe/it/expect/jest are global via tsconfig types: ["jest", "node"])`,
    });
  }
}

function checkTest004(file: string, content: string, violations: Violation[]) {
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    // Exact-equality message asserts are the smell: a self-produced error should be
    // a domain exception checked with toBeInstanceOf. `toContain` is allowed — it
    // typically matches a fragment of an external/library error with no domain class.
    if (
      /result\.error[?.]*message/.test(line) &&
      /toBe\b|toEqual|toMatch/.test(line)
    ) {
      violations.push({
        file,
        line: i + 1,
        rule: "TEST-004",
        severity: "HIGH",
        detail: `Error validated by message — use expect(result.error).toBeInstanceOf(SomeException)`,
      });
    }
  });
}

function checkTest005(file: string, content: string, violations: Violation[]) {
  // Only service/controller unit tests have a class to instantiate. Pure-function,
  // schema/struct, config, and infra specs legitimately have no unit to 'new'.
  if (!/\.(service|controller)\.spec\.ts$/.test(file)) return;
  if (!content.includes("describe(")) return;
  if (content.includes("Test.createTestingModule")) return;
  // Direct instantiation (new Xxx(mocks)) is the dominant convention in this repo
  // (see src/modules/_example_orders/services/*.spec.ts) and a valid unit-test
  // style — only require a TestingModule when neither is used.
  if (/new\s+\w+\s*\(/.test(content)) return;
  violations.push({
    file,
    line: 1,
    rule: "TEST-005",
    severity: "MEDIUM",
    detail: `No Test.createTestingModule and no direct instantiation — instantiate the unit under test (new Xxx(mocks)) or use a NestJS testing module`,
  });
}

export function checkTest006(
  srcFilesInDiff: string[],
  allFiles: string[],
  violations: Violation[],
): void {
  // This repo colocates specs next to their source file (e.g.
  // src/modules/_example_orders/services/create-order.service.ts +
  // create-order.service.spec.ts in the same directory) — there is no mirrored
  // 'tests/' tree, so the expected spec is just the source path with '.spec.ts'.
  const sourceToSpec = (src: string): string => src.replace(/\.ts$/, ".spec.ts");

  for (const srcFile of srcFilesInDiff) {
    const isSource =
      (srcFile.includes("/services/") || srcFile.includes("/controllers/")) &&
      !srcFile.endsWith(".spec.ts") &&
      !srcFile.endsWith(".module.ts");
    if (!isSource) continue;

    const expectedSpec = sourceToSpec(srcFile);
    const repoRoot = path.resolve(__dirname, '../../../../..');
    const specOnDisk = fs.existsSync(path.resolve(repoRoot, expectedSpec));
    const specInDiff = allFiles.some(
      (f) => path.basename(f) === path.basename(expectedSpec),
    );

    if (!specOnDisk && !specInDiff) {
      violations.push({
        file: srcFile,
        line: 1,
        rule: "TEST-006",
        severity: "CRITICAL",
        detail: `No spec file for this source — create: ${expectedSpec}`,
      });
    }
  }
}

export function runTestRules(specFiles: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of specFiles) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, "utf-8");
    checkTest001(file, content, violations);
    checkTest004(file, content, violations);
    checkTest005(file, content, violations);
  }
  return violations;
}
