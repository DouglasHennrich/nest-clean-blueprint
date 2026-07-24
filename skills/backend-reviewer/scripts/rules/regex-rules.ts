import * as fs from "node:fs";
import * as path from "node:path";
import { FileClassification, Severity, Violation } from "../types";

function v(
  file: string,
  line: number,
  rule: string,
  severity: Severity,
  detail: string,
): Violation {
  return { file, line, rule, severity, detail };
}

function checkNaming001(
  file: string,
  lines: string[],
  violations: Violation[],
) {
  lines.forEach((line, i) => {
    const match = line.match(/export\s+abstract\s+class\s+([A-Z][a-zA-Z]*)/);
    if (match && !match[1].startsWith("T")) {
      violations.push(
        v(
          file,
          i + 1,
          "NAMING-001",
          "HIGH",
          `Abstract class '${match[1]}' must start with 'T' — rename to 'T${match[1]}'`,
        ),
      );
    }
  });
}

function checkNaming002(
  file: string,
  lines: string[],
  violations: Violation[],
) {
  lines.forEach((line, i) => {
    const match = line.match(/export\s+class\s+\w+\s+extends\s+(T[A-Z]\w+)/);
    if (match) {
      violations.push(
        v(
          file,
          i + 1,
          "NAMING-002",
          "HIGH",
          `Concrete class extends '${match[1]}' — use 'implements ${match[1]}' instead`,
        ),
      );
    }
  });
}

function checkNaming003(file: string, violations: Violation[]) {
  const basename = path.basename(file);
  if (!basename.endsWith(".controller.ts")) {
    violations.push(
      v(
        file,
        1,
        "NAMING-003",
        "LOW",
        `Controller file '${basename}' must end in '.controller.ts'`,
      ),
    );
  }
}

function checkRouting001(
  file: string,
  lines: string[],
  violations: Violation[],
) {
  lines.forEach((line, i) => {
    if (
      /^\s*@(Get|Post|Put|Patch|Delete)\s*\(\s*['"`][^'"`]+['"`]\s*\)/.test(
        line,
      )
    ) {
      violations.push(
        v(
          file,
          i + 1,
          "ROUTING-001",
          "MEDIUM",
          `HTTP method decorator has path — move full path to @Controller() and leave method decorator empty: @Get()`,
        ),
      );
    }
  });
}

function checkZod001(file: string, lines: string[], violations: Violation[]) {
  lines.forEach((line, i) => {
    if (/@Body\(\s*\)/.test(line)) {
      violations.push(
        v(
          file,
          i + 1,
          "ZOD-001",
          "CRITICAL",
          `@Body() missing ZodValidationPipe — use @Body(new ZodValidationPipe(schema))`,
        ),
      );
    }
  });
}

function checkZod002(file: string, lines: string[], violations: Violation[]) {
  lines.forEach((line, i) => {
    if (/@Query\(\s*\)/.test(line)) {
      violations.push(
        v(
          file,
          i + 1,
          "ZOD-002",
          "CRITICAL",
          `@Query() missing ZodValidationPipe — use @Query(new ZodValidationPipe(schema))`,
        ),
      );
    }
  });
}

function checkZod003(file: string, lines: string[], violations: Violation[]) {
  lines.forEach((line, i) => {
    if (/@Param\(\s*\)/.test(line)) {
      violations.push(
        v(
          file,
          i + 1,
          "ZOD-003",
          "CRITICAL",
          `@Param() missing ZodValidationPipe — use @Param(new ZodValidationPipe(schema))`,
        ),
      );
    }
  });
}

function checkZod004(file: string, content: string, violations: Violation[]) {
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    const match = line.match(/const\s+(\w+DtoServiceSchema)\s*=/);
    if (!match) return;
    const snippet = lines.slice(i, i + 6).join("\n");
    if (
      /z\.object\s*\(/.test(snippet) &&
      !snippet.includes(".merge(") &&
      !snippet.includes(".extend(")
    ) {
      violations.push(
        v(
          file,
          i + 1,
          "ZOD-004",
          "HIGH",
          `'${match[1]}' uses z.object() directly — must .merge() or .extend() Param/Body/Query schemas from the same file`,
        ),
      );
    }
  });
}

function checkLogger001(
  file: string,
  content: string,
  violations: Violation[],
) {
  if (
    !content.includes("public logger:") &&
    !content.includes("public logger :")
  ) {
    violations.push(
      v(
        file,
        1,
        "LOGGER-001",
        "MEDIUM",
        `Service missing 'public logger: ILogger' (injected via constructor)`,
      ),
    );
  }
}

function checkPresenter001(
  file: string,
  lines: string[],
  violations: Violation[],
) {
  lines.forEach((line, i) => {
    if (/from\s+['"][^'"]*\/presenters\/[^'"]*['"]/.test(line)) {
      violations.push(
        v(
          file,
          i + 1,
          "PRESENTER-001",
          "CRITICAL",
          `Service imports from /presenters/ — presenters are exclusive to controllers`,
        ),
      );
    }
  });
}

// PAGINATION-001: List service must return IPagination
function checkPagination001(file: string, content: string, violations: Violation[]) {
  const basename = path.basename(file);
  if (!basename.startsWith('list-')) return;
  if (!content.includes('IPagination')) {
    violations.push(v(file, 1, 'PAGINATION-001', 'HIGH',
      `List service '${basename}' must return 'Promise<Result<IPaginationModel<T>>>' — not a plain array`));
  }
}

// DTO-001: Zod schema declared outside a 'dto/*.dto.ts' file — Zod DTOs belong in
// the module's 'dto/' folder, named '*.dto.ts'. Flags once per file.
const ZOD_SCHEMA = /\bz\.(object|enum|array|union|discriminatedUnion|record|tuple)\s*\(/;

function checkDto001(file: string, lines: string[], violations: Violation[]) {
  if (file.includes('/dto/') && file.endsWith('.dto.ts')) return;
  // Non-DTO Zod homes: reusable shared schemas ('*.schema.ts') and env/config
  // validation ('*.validation.ts') are not request DTOs.
  if (file.endsWith('.schema.ts') || file.endsWith('.validation.ts')) return;
  const idx = lines.findIndex(l => ZOD_SCHEMA.test(l));
  if (idx >= 0) {
    violations.push(v(file, idx + 1, 'DTO-001', 'HIGH',
      `Zod schema declared outside 'dto/*.dto.ts' — move the schema to the module's 'dto/<name>.dto.ts' file and import it`));
  }
}

// STRUCT-001: '*.types.ts' is not a valid file pattern — plain types/interfaces use
// '*.struct.ts', Zod schemas use '*.dto.ts'.
function checkStruct001(file: string, violations: Violation[]) {
  const base = path.basename(file);
  if (base.endsWith('.types.ts')) {
    violations.push(v(file, 1, 'STRUCT-001', 'MEDIUM',
      `'${base}': the '.types.ts' suffix is not a valid pattern — rename to '*.struct.ts' (types/interfaces) or '*.dto.ts' (Zod schemas)`));
  }
}

// PAGINATION-002: list service paginates over an entity instead of the domain interface
function checkPagination002(file: string, content: string, violations: Violation[]) {
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    const match = line.match(/IPagination\w*<\s*([A-Z]\w*Entity)\b/);
    if (match) {
      violations.push(v(file, i + 1, 'PAGINATION-002', 'HIGH',
        `IPagination generic exposes entity '${match[1]}' — paginate over the domain interface (e.g. 'IPaginationModel<I${match[1].replace(/Entity$/, '')}Model>') instead of the ORM entity`));
    }
  });
}

// SECURITY-001: Raw SQL with template literal interpolation
function checkSecurity001(file: string, lines: string[], violations: Violation[]) {
  lines.forEach((line, i) => {
    if (/\.query\s*\(`/.test(line) || /`[^`]*(SELECT|INSERT|UPDATE|DELETE)[^`]*\$\{/.test(line)) {
      // Explicit opt-out for audited query-builder code where only identifiers
      // (schema/table names) or code-built clause lists are interpolated and every
      // user value goes through bind params. Mark the line (or the one above) `sql-safe`.
      const marked = line.includes('sql-safe') || (i > 0 && lines[i - 1].includes('sql-safe'));
      if (marked) return;
      violations.push(v(file, i + 1, 'SECURITY-001', 'CRITICAL',
        `Raw SQL with template literal — use TypeORM query builder with parameters to prevent SQL injection`));
    }
  });
}

// ANY-001: TypeScript 'any' type in service/controller
function checkAny001(file: string, lines: string[], violations: Violation[]) {
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('catch')) return;
    if (/:\s*any[\s,\[\{>);]/.test(line) || /\bas\s+any\b/.test(line)) {
      violations.push(v(file, i + 1, 'ANY-001', 'MEDIUM',
        `TypeScript 'any' type — replace with a proper type or 'unknown'`));
    }
  });
}

function checkConstructor001(
  file: string,
  content: string,
  lines: string[],
  violations: Violation[],
) {
  const constructorMatch = content.match(/constructor\s*\(([^)]*)\)/s);
  if (!constructorMatch) return;
  const paramCount = constructorMatch[1]
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0).length;
  if (paramCount < 2) return;
  if (!content.includes("/// //")) {
    const lineNum = lines.findIndex((l) => l.includes("constructor")) + 1;
    violations.push(
      v(
        file,
        lineNum,
        "CONSTRUCTOR-001",
        "LOW",
        `Constructor has ${paramCount} dependencies without '/// ////' group separator comments`,
      ),
    );
  }
}

// DI-001: @Inject() in controllers
function checkDI001(file: string, lines: string[], violations: Violation[]) {
  lines.forEach((line, i) => {
    if (/@Inject\(/.test(line)) {
      violations.push(
        v(
          file,
          i + 1,
          "DI-001",
          "HIGH",
          `@Inject() used in controller — use standard TypeScript constructor injection`,
        ),
      );
    }
  });
}

// GUARD-001: Global guards in controllers
function checkGuard001(file: string, lines: string[], violations: Violation[]) {
  lines.forEach((line, i) => {
    if (/@UseGuards\(JwtAuthGuard,\s*RolesGuard\)/.test(line)) {
      violations.push(
        v(
          file,
          i + 1,
          "GUARD-001",
          "HIGH",
          `@UseGuards(JwtAuthGuard, RolesGuard) is redundant — guards are registered globally`,
        ),
      );
    }
  });
}

// RESULT-004: isFailure() or toHttpException() usage
function checkResult004(file: string, lines: string[], violations: Violation[]) {
  lines.forEach((line, i) => {
    if (/\.isFailure\(\)/.test(line)) {
      violations.push(
        v(
          file,
          i + 1,
          "RESULT-004",
          "CRITICAL",
          `'isFailure()' is deprecated — use 'if (result.error)' instead`,
        ),
      );
    }
    if (/\.toHttpException\(\)/.test(line)) {
      violations.push(
        v(
          file,
          i + 1,
          "RESULT-004",
          "CRITICAL",
          `'toHttpException()' is deprecated — use 'throw result.error' instead`,
        ),
      );
    }
  });
}

// RESULT-005: Result.ok() instead of Result.success()
function checkResult005(file: string, lines: string[], violations: Violation[]) {
  lines.forEach((line, i) => {
    if (/Result\.ok\(/.test(line)) {
      violations.push(
        v(
          file,
          i + 1,
          "RESULT-005",
          "HIGH",
          `'Result.ok()' is invalid — use 'Result.success()' instead`,
        ),
      );
    }
  });
}

// REPO-001: .save() in repository
function checkRepo001(file: string, lines: string[], violations: Violation[]) {
  lines.forEach((line, i) => {
    if (/\.save\(/.test(line) && !line.includes("async save")) {
      violations.push(
        v(
          file,
          i + 1,
          "REPO-001",
          "HIGH",
          `'.save()' is deprecated in repositories — use '.create()' instead`,
        ),
      );
    }
  });
}

export function runRegexRules(classified: FileClassification): Violation[] {
  const violations: Violation[] = [];

  for (const file of classified.services) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");
    checkNaming001(file, lines, violations);
    checkNaming002(file, lines, violations);
    checkLogger001(file, content, violations);
    checkPresenter001(file, lines, violations);
    checkPagination001(file, content, violations);
    checkPagination002(file, content, violations);
    checkSecurity001(file, lines, violations);
    checkAny001(file, lines, violations);
    checkConstructor001(file, content, lines, violations);
    checkResult004(file, lines, violations);
    checkResult005(file, lines, violations);
    checkRepo001(file, lines, violations);
  }

  for (const file of classified.controllers) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");
    checkNaming003(file, violations);
    checkRouting001(file, lines, violations);
    checkZod001(file, lines, violations);
    checkZod002(file, lines, violations);
    checkZod003(file, lines, violations);
    checkSecurity001(file, lines, violations);
    checkAny001(file, lines, violations);
    checkConstructor001(file, content, lines, violations);
    checkDI001(file, lines, violations);
    checkGuard001(file, lines, violations);
    checkResult004(file, lines, violations);
    checkResult005(file, lines, violations);
  }

  for (const file of classified.dtos) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, "utf-8");
    checkZod004(file, content, violations);
  }

  for (const file of classified.others) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");
    checkConstructor001(file, content, lines, violations);
    checkResult004(file, lines, violations);
    checkResult005(file, lines, violations);
  }

  // File-location / naming rules apply to every non-spec file, regardless of bucket.
  for (const file of classified.all) {
    if (file.endsWith(".spec.ts")) continue;
    if (!fs.existsSync(file)) continue;
    const lines = fs.readFileSync(file, "utf-8").split("\n");
    checkStruct001(file, violations);
    checkDto001(file, lines, violations);
  }

  return violations;
}
