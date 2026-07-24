import { runAstRules, runControllerAstRules, runErrorLocationRules, runExceptionAstRules, runInterfaceNamingRule, runParamRules, runRepositoryAstRules } from './rules/ast-rules';
import { runRegexRules } from './rules/regex-rules';
import { checkTest006, runTestRules } from './rules/test-rules';
import { FileClassification, Severity, ValidatorResult, Violation } from './types';

interface CliArgs {
  files: string[];
  diffFiles: string[];
  attempt: number;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let files: string[] = [];
  let diffFiles: string[] = [];
  let attempt = 1;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--files' && args[i + 1]) {
      files = args[++i].split(',').map(f => f.trim()).filter(Boolean);
    } else if (args[i] === '--diff-files' && args[i + 1]) {
      diffFiles = args[++i].split(',').map(f => f.trim()).filter(Boolean);
    } else if (args[i] === '--attempt' && args[i + 1]) {
      attempt = parseInt(args[++i], 10) || 1;
    }
  }

  return { files, diffFiles: diffFiles.length > 0 ? diffFiles : files, attempt };
}

function classifyFiles(files: string[]): FileClassification {
  const EXCLUDE = ['node_modules', 'dist', 'migrations', '.d.ts'];
  const filtered = files.filter(
    f => !EXCLUDE.some(ex => f.includes(ex)) && f.endsWith('.ts'),
  );

  return {
    services: filtered.filter(
      // Only real use-case services ('*.service.ts'); config/loader helpers that
      // happen to live under services/ are not services and are exempt.
      f => f.includes('/services/') && f.endsWith('.service.ts'),
    ),
    controllers: filtered.filter(
      f => f.includes('/controllers/') && !f.endsWith('.spec.ts'),
    ),
    repositories: filtered.filter(
      f => f.includes('/repositories/') && !f.endsWith('.spec.ts'),
    ),
    dtos: filtered.filter(f => f.includes('/dto/') && !f.endsWith('.spec.ts')),
    exceptions: filtered.filter(
      f => (f.includes('/errors/') || f.endsWith('.exception.ts')) && !f.endsWith('.spec.ts'),
    ),
    specs: filtered.filter(f => f.endsWith('.spec.ts')),
    others: filtered.filter(
      f => !f.includes('/services/') && !f.includes('/controllers/') &&
           !f.includes('/repositories/') &&
           !f.includes('/dto/') && !f.includes('/errors/') && !f.endsWith('.exception.ts') &&
           !f.endsWith('.spec.ts') &&
           !f.endsWith('.module.ts') && !f.includes('index.ts'),
    ),
    all: filtered,
  };
}

function buildSummary(violations: Violation[]): Record<Severity, number> {
  return {
    CRITICAL: violations.filter(v => v.severity === 'CRITICAL').length,
    HIGH: violations.filter(v => v.severity === 'HIGH').length,
    MEDIUM: violations.filter(v => v.severity === 'MEDIUM').length,
    LOW: violations.filter(v => v.severity === 'LOW').length,
  };
}

async function main(): Promise<void> {
  const { files, diffFiles, attempt } = parseArgs();

  if (files.length === 0) {
    const empty: ValidatorResult = {
      violations: [],
      summary: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
      filesChecked: 0,
      attempt,
    };
    process.stdout.write(JSON.stringify(empty, null, 2) + '\n');
    return;
  }

  const classified = classifyFiles(files);
  const allViolations: Violation[] = [];

  allViolations.push(...runRegexRules(classified));
  allViolations.push(...runAstRules(classified.services));
  allViolations.push(...runRepositoryAstRules(classified.repositories));
  allViolations.push(...runExceptionAstRules(classified.exceptions));
  allViolations.push(...runErrorLocationRules(classified.all));
  allViolations.push(...runControllerAstRules(classified.controllers));
  allViolations.push(...runInterfaceNamingRule(classified.all));
  allViolations.push(...runParamRules(classified.all));
  allViolations.push(...runTestRules(classified.specs));
  checkTest006(diffFiles, files, allViolations);

  const result: ValidatorResult = {
    violations: allViolations,
    summary: buildSummary(allViolations),
    filesChecked: classified.all.length,
    attempt,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

main().catch(err => {
  process.stderr.write(`Validator error: ${(err as Error).message}\n`);
  process.exit(1);
});
