# Contract: Ported Skills

## backend-patterns-nestjs
- **Files**: `SKILL.md` (frontmatter `name`, `description`).
- **Adaptation**: scope banner references THIS repo (`src/`), not `apps/backend/`. No monorepo
  `apps/web` disclaimer. Pattern examples match the blueprint's aligned conventions.
- **Locations**: `.claude/skills/backend-patterns-nestjs/` AND `skills/backend-patterns-nestjs/`.
- **Acceptance**: appears in `list_skills`; `get_skill backend-patterns-nestjs` returns it;
  content matches the conventions contract.

## backend-reviewer
- **Files**: `SKILL.md` + `scripts/pattern-validator.ts` + `scripts/types.ts` +
  `scripts/rules/{ast-rules,regex-rules,test-rules}.ts` + `scripts/package.json` +
  `scripts/tsconfig.json` + `scripts/.gitignore`. **No `node_modules`** (installed on use).
- **Adaptation** (per research D6):
  - File detection: `git diff --name-only HEAD | grep '^src/.*\.ts$' | grep -vE 'node_modules|dist|migrations|\.d\.ts'`.
  - Commands: `pnpm check`, `pnpm lint` at repo root (no `cd apps/backend`).
  - Validator path: `.claude/skills/backend-reviewer/scripts`.
  - **No Stop-hook skip-flag** (`./tmp/.backend-reviewer-skip` removed from the flow).
  - Rules encode the blueprint's conventions (`I…Model`, object-params, presenter usage,
    per-action DTOs, one-error-per-file).
- **Locations**: `.claude/skills/backend-reviewer/` AND `skills/backend-reviewer/`.
- **Acceptance**: runs `check`+`lint`+validator on changed `.ts`; exits cleanly with no changed
  files and no `--files` arg; reports zero violations on the aligned example module.

## Behavioral contract
- Neither skill assumes a monorepo, a Stop hook, or product-specific infra (tenancy/OpenAI).
- Both are discoverable by the MCP (`skills/`) and by the Claude Code project (`.claude/skills/`).
