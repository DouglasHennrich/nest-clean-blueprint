# Quickstart: Validate the aligned blueprint

Run these to prove the feature works end-to-end. Details live in the spec, contracts, and
data-model; this is the run/validation guide only.

## Prerequisites
- `pnpm install` (adds `argon2`, `@sentry/node`, `@google-cloud/storage`; removes `bcryptjs`).
- Node per `.nvmrc`.

## 1. Build & type-check (R1–R3)
```bash
pnpm check      # tsc --noEmit — zero errors
pnpm lint       # ported eslint + local rules — zero violations
pnpm test       # jest 30 — green, coverage ≥ 80%
```
Expected: all green. Confirms shared-layer refactor, zod v4 / jest 30 migration, and the ported
ESLint config (I…Model, …Enum, require-presenter-usage) hold.

## 2. Convention conformance (R2)
- Inspect `src/modules/_example_orders`: controllers single-arg `service.execute(dto)` + presenter
  return; services no `context` param + `validateDto()`; repos object-param; presenters no
  `@Injectable`; entities `extends BaseEntity`; one-error-per-file; `order.struct.ts`; per-action DTOs.
- Confirm `src/@shared/schemas/` exists (not `schames`), `src/@shared/context/request.context.ts`
  exists, `src/@decorators` is gone (moved to `@shared/decorators`).

## 3. Skills (R4)
```bash
ls .claude/skills/backend-patterns-nestjs .claude/skills/backend-reviewer
ls skills/backend-patterns-nestjs skills/backend-reviewer
test ! -d skills/backend-patterns && echo "old skill retired"
# Run the reviewer end-to-end (installs its own scripts deps on first use):
#   invoke the backend-reviewer skill → runs check+lint+validator on changed src/*.ts
```
Expected: both skills present in both locations; `backend-reviewer` reports zero violations on the
aligned example module and exits cleanly when nothing changed.

## 4. Scaffold-from-template (SC-005)
- Render `templates/*.hbs` for a throwaway module and run `backend-reviewer` on it.
Expected: zero violations without manual edits.

## 5. MCP surface (R5)
```bash
cd mcp-server && pnpm build   # if applicable
# Via an MCP client / manual tool calls:
#   list_skills                → includes backend-patterns-nestjs, backend-reviewer; no backend-patterns
#   get_skill backend-reviewer → returns SKILL.md
#   get_pattern result-pattern → aligned content
#   validate_module_structure src/modules/_example_orders → OK
```
Expected: aligned content; server `version` > `0.3.0`; `docs/VERSION` bumped.

## 6. Runtime graceful-degradation (D8)
- Start the app with no `SENTRY_DSN` and no GCP creds.
Expected: boots; Sentry capture is a no-op; S3 upload path works as default.

## Done
All six sections pass → SC-001…SC-006 satisfied.
