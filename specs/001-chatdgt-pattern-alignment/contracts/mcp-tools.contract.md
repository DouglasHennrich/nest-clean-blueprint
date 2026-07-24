# Contract: MCP Tool Surface

Server: `mcp-server/src/index.ts` (`nest-clean-blueprint`). Modes LOCAL / REMOTE / HYBRID.

## Unchanged tools (behavior preserved, content refreshed)
`get_blueprint`, `get_pattern`/`list_patterns`, `get_convention`/`list_conventions`,
`get_provider_docs`/`list_providers`, `get_template`/`list_templates`, `get_flow`/`list_flows`,
`get_email_template_example`, `get_checklist`, `install_skill`, `setup_speckit`.
- `get_pattern`/`get_template`/`get_convention` MUST now return the aligned content.

## Skill tools (must surface ported skills)
- `list_skills` → includes `backend-patterns-nestjs` and `backend-reviewer`; excludes the retired
  `backend-patterns`.
- `get_skill <name>` → returns `skills/<name>/SKILL.md`.
- Served from top-level `skills/` (the server's `R_SKILLS = "skills"`), so the ported skills MUST
  exist there (not only `.claude/skills/`).

## `validate_module_structure`
- Required folders unchanged: `controllers, dto, entities, errors, models, presenters,
  repositories, services` + ≥1 `*.module.ts`.
- MUST report OK for the aligned `_example_orders` module.

## Metadata
- Server `version` MUST be bumped above `0.3.0` (e.g. `0.4.0`).
- `docs/VERSION` bumped so HYBRID-mode sync detects the new blueprint version.

## `get_template` enum
- Layers stay: `service, controller, repository, presenter, entity, dto, exception, module`.
  (Template filenames: note existing `dtos.ts.hbs` vs enum `dto` — implementation must keep the
  enum→filename mapping consistent.)

## Acceptance
- All content tools return aligned text; `list_skills` shows exactly the two ported skills (plus any
  other legitimately present); version > 0.3.0.
