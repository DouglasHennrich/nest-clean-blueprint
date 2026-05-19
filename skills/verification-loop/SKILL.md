---
name: verification-loop
description: "REQUIRED after any code change. ALWAYS load when: done implementing, finished a feature, completed a task, ready to commit, verifying the implementation, checking for errors, running tests, opening a PR, validating changes, or when asked to verify/check/review what was built. Runs build, type-check, lint, unit tests, E2E tests, and project-specific pattern checks."
---

# Verification Loop — NestJS Backend

Comprehensive quality verification after completing a feature, fixing a bug, or before a PR.

## When to Activate

- After completing a feature or significant code change
- Before opening a pull request
- After refactoring existing code
- When you want to ensure all quality gates pass

---

## Verification Steps

Run each phase in order. **Stop and fix before continuing if any phase fails.**

### Phase 1: Build

```bash
pnpm run build
```

Confirms TypeScript compiles and there are no module resolution errors.

### Phase 2: Type Check

```bash
pnpm exec tsc --noEmit
```

Reports type errors without emitting files. Fix all `error TS*` before continuing.

### Phase 3: Lint

```bash
pnpm run lint
```

Ensures code follows ESLint rules. Fix all errors (warnings may be noted).

### Phase 4: Unit Tests

```bash
pnpm run test
```

Runs all `*.spec.ts` test files. Target: all passing.

### Phase 5: E2E Tests (when applicable)

```bash
pnpm run test:e2e
```

Runs `*.spec.e2e.ts` tests against the test database. Required for changes to controllers or module structure.

### Phase 6: Security Scan

```bash
# Check for hardcoded secrets
grep -rn "sk-\|sk_live_\|AKIA\|ghp_" --include="*.ts" src/ 2>/dev/null

# Check for console.log (should use ILogger instead)
grep -rn "console\.log\|console\.error\|console\.warn" --include="*.ts" src/ 2>/dev/null

# Dependency vulnerabilities
pnpm audit
```

### Phase 7: Diff Review

```bash
git diff --stat
git diff HEAD --name-only
```

Review each changed file for:

- Unintended changes
- Missing error handling in new services
- Raw entities returned from controllers (not through Presenters)
- Missing `@Index()` on FK columns

---

## Verification Report Template

```
VERIFICATION REPORT
===================

Build:        [ PASS / FAIL ]
Type Check:   [ PASS / FAIL ]  (X errors)
Lint:         [ PASS / FAIL ]  (X warnings)
Unit Tests:   [ PASS / FAIL ]  (X/Y passed)
E2E Tests:    [ PASS / FAIL ]  (X/Y passed)  — if applicable
Security:     [ PASS / FAIL ]  (console.logs: X, secrets: X, audit: X)
Diff:         X files changed

Overall:      [ READY / NOT READY ] for PR

Remaining Issues:
1. ...
2. ...
```

---

## Project-Specific Checks

In addition to the standard phases, verify:

- [ ] New entities have `@Index()` on all FK columns
- [ ] New migrations include `CREATE INDEX` for FK columns
- [ ] Services return `Result<T>`, not raw values
- [ ] Controllers use `Presenter.toHTTP()`, not raw entities
- [ ] DTOs use Zod schemas (`z.object(...)`)
- [ ] New tests are in `tests/` (not `src/`)
- [ ] Test factories are in `tests/@shared/factories/`
- [ ] No MongoDB-style operators in TypeORM queries
- [ ] `date-fns` used for date operations (not `new Date()` arithmetic)
- [ ] `pnpm run` used everywhere (not `npm run`)

---

## Quick Fix Commands

```bash
# Auto-fix lint issues
pnpm run lint -- --fix

# Run only failed tests
pnpm run test -- --onlyFailures

# Run tests for a specific module
pnpm run test -- --testPathPattern="orders"

# Run tests with coverage
pnpm run test -- --coverage

# Check what's changed vs main
git diff main --stat
```

---

## When to Run Each Test Suite

| Scenario                 | Unit Tests  | E2E Tests      |
| ------------------------ | ----------- | -------------- |
| Changed a service        | ✅ Required | Optional       |
| Changed a controller     | ✅ Required | ✅ Required    |
| Changed repository query | ✅ Required | ✅ Recommended |
| Added a new module       | ✅ Required | ✅ Required    |
| Changed a migration      | ✅ Required | ✅ Required    |
| Refactored utilities     | ✅ Required | Optional       |
