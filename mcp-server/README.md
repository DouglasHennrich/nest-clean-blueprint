# nest-clean-blueprint MCP server

Exposes the architecture blueprint, patterns, conventions, provider docs and scaffolding templates as MCP tools so AI agents can always consult an up-to-date single source of truth.

## Build

```bash
cd mcp-server
pnpm install
pnpm build
```

## Tools

| Tool | Purpose |
|---|---|
| `get_blueprint` | Returns `docs/ARCHITECTURE-BLUEPRINT.md` |
| `list_patterns` / `get_pattern` | List or fetch a doc from `docs/patterns/` |
| `list_conventions` / `get_convention` | List or fetch a doc from `docs/conventions/` |
| `list_providers` / `get_provider_docs` | List or fetch a doc from `docs/providers/` |
| `list_templates` / `get_template` | List or fetch a `.hbs` scaffolding template |
| `get_email_template_example` | Returns the EJS welcome template + partials |
| `get_checklist` | Returns `docs/checklist-pr.md` |
| `validate_module_structure` | Checks a module folder for required layout |

## Register with Copilot / Claude / Cursor

Example `.mcp.json` (or equivalent) entry:

```json
{
  "mcpServers": {
    "nest-clean-blueprint": {
      "command": "node",
      "args": ["/abs/path/to/nest-clean-blueprint/mcp-server/dist/index.js"]
    }
  }
}
```
