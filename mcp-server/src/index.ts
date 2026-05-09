#!/usr/bin/env node
/**
 * MCP server for nest-clean-blueprint.
 *
 * Exposes the architecture blueprint, patterns, conventions, provider docs,
 * scaffolding templates and the PR checklist as MCP tools so AI agents can
 * consult always-fresh guidance from a single source of truth.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  CallToolRequest,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Repo root is two levels up from dist/ (mcp-server/dist/index.js → mcp-server/ → repo-root/)
const REPO_ROOT = resolve(__dirname, "..", "..");
const DOCS_DIR = join(REPO_ROOT, "docs");
const TEMPLATES_DIR = join(REPO_ROOT, "templates");

/**
 * Safely resolve a user-supplied name into an absolute file path inside `baseDir`.
 * Throws if the resolved path escapes the base (path-traversal guard).
 */
function safeResolve(baseDir: string, name: string, suffix = ""): string {
  const sanitized = name.replace(/\\/g, "/").replace(/\.\./g, "");
  const target = resolve(baseDir, sanitized + suffix);
  if (
    !target.startsWith(resolve(baseDir) + "/") &&
    target !== resolve(baseDir)
  ) {
    throw new Error(`Path escapes base directory: ${name}`);
  }
  return target;
}

async function readMarkdown(path: string): Promise<string> {
  try {
    return await readFile(path, "utf-8");
  } catch (err) {
    throw new Error(
      `File not found: ${path}. ${err instanceof Error ? err.message : ""}`,
    );
  }
}

async function listMarkdownFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir);
    const files: string[] = [];
    for (const entry of entries) {
      const full = join(dir, entry);
      const s = await stat(full);
      if (s.isFile() && entry.endsWith(".md")) {
        files.push(entry.replace(/\.md$/, ""));
      }
    }
    return files.sort();
  } catch {
    return [];
  }
}

const server = new Server(
  { name: "nest-clean-blueprint", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_blueprint",
      description:
        "Returns the full architecture blueprint (docs/ARCHITECTURE-BLUEPRINT.md). Always read this first when starting work on a NestJS module.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "get_pattern",
      description:
        "Returns a specific pattern doc (e.g. result-pattern, dependency-injection, pagination, async-context, event-driven).",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              'Pattern name without extension (e.g. "result-pattern"). Call list_patterns to see available names.',
          },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
    {
      name: "list_patterns",
      description: "Lists all available pattern doc names.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "get_convention",
      description:
        "Returns a specific convention doc (e.g. naming, module-structure, testing).",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              "Convention name without extension. Call list_conventions to see available names.",
          },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
    {
      name: "list_conventions",
      description: "Lists all available convention doc names.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "get_provider_docs",
      description:
        "Returns documentation for a shared provider (mail-provider, encrypt-decrypt-provider, upload-provider).",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              "Provider name without extension. Call list_providers to see available names.",
          },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
    {
      name: "list_providers",
      description: "Lists all available provider doc names.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "get_template",
      description:
        "Returns a Handlebars scaffolding template for a specific layer (service, controller, repository, presenter, entity, dto, exception, module). Placeholders: {{Name}}, {{name}}, {{namesPlural}}.",
      inputSchema: {
        type: "object",
        properties: {
          layer: {
            type: "string",
            enum: [
              "service",
              "controller",
              "repository",
              "presenter",
              "entity",
              "dto",
              "exception",
              "module",
            ],
          },
        },
        required: ["layer"],
        additionalProperties: false,
      },
    },
    {
      name: "list_templates",
      description: "Lists all available scaffolding template layers.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "get_email_template_example",
      description:
        "Returns the EJS welcome email template plus its partials (header.ejs, footer.ejs) demonstrating the include pattern.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "get_checklist",
      description:
        "Returns the mandatory PR checklist (docs/checklist-pr.md). Run this before opening a PR.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "validate_module_structure",
      description:
        "Validates that a module folder follows the required layout (controllers/, dto/, entities/, errors/, models/, presenters/, repositories/, services/, *.module.ts).",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              'Absolute or repo-relative path to the module folder (e.g. "src/modules/orders").',
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
  ],
}));

server.setRequestHandler(
  CallToolRequestSchema,
  async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "get_blueprint": {
          const text = await readMarkdown(
            join(DOCS_DIR, "ARCHITECTURE-BLUEPRINT.md"),
          );
          return { content: [{ type: "text", text }] };
        }

        case "list_patterns": {
          const names = await listMarkdownFiles(join(DOCS_DIR, "patterns"));
          return { content: [{ type: "text", text: names.join("\n") }] };
        }

        case "get_pattern": {
          const n = String((args as any)?.name ?? "");
          const path = safeResolve(join(DOCS_DIR, "patterns"), n, ".md");
          return {
            content: [{ type: "text", text: await readMarkdown(path) }],
          };
        }

        case "list_conventions": {
          const names = await listMarkdownFiles(join(DOCS_DIR, "conventions"));
          return { content: [{ type: "text", text: names.join("\n") }] };
        }

        case "get_convention": {
          const n = String((args as any)?.name ?? "");
          const path = safeResolve(join(DOCS_DIR, "conventions"), n, ".md");
          return {
            content: [{ type: "text", text: await readMarkdown(path) }],
          };
        }

        case "list_providers": {
          const names = await listMarkdownFiles(join(DOCS_DIR, "providers"));
          return { content: [{ type: "text", text: names.join("\n") }] };
        }

        case "get_provider_docs": {
          const n = String((args as any)?.name ?? "");
          const path = safeResolve(join(DOCS_DIR, "providers"), n, ".md");
          return {
            content: [{ type: "text", text: await readMarkdown(path) }],
          };
        }

        case "list_templates": {
          const entries = await readdir(TEMPLATES_DIR);
          const names = entries
            .filter((e) => e.endsWith(".ts.hbs"))
            .map((e) => e.replace(/\.ts\.hbs$/, ""))
            .sort();
          return { content: [{ type: "text", text: names.join("\n") }] };
        }

        case "get_template": {
          const layer = String((args as any)?.layer ?? "");
          const allowed = [
            "service",
            "controller",
            "repository",
            "presenter",
            "entity",
            "dto",
            "exception",
            "module",
          ];
          if (!allowed.includes(layer)) {
            throw new Error(`Unknown layer: ${layer}`);
          }
          const path = join(TEMPLATES_DIR, `${layer}.ts.hbs`);
          return {
            content: [{ type: "text", text: await readMarkdown(path) }],
          };
        }

        case "get_email_template_example": {
          const base = join(
            REPO_ROOT,
            "src",
            "@shared",
            "providers",
            "mail-provider",
            "templates",
          );
          const welcome = await readMarkdown(join(base, "welcome.ejs"));
          const header = await readMarkdown(
            join(base, "partials", "header.ejs"),
          );
          const footer = await readMarkdown(
            join(base, "partials", "footer.ejs"),
          );
          const text =
            `# welcome.ejs\n\n\`\`\`ejs\n${welcome}\n\`\`\`\n\n` +
            `# partials/header.ejs\n\n\`\`\`ejs\n${header}\n\`\`\`\n\n` +
            `# partials/footer.ejs\n\n\`\`\`ejs\n${footer}\n\`\`\`\n`;
          return { content: [{ type: "text", text }] };
        }

        case "get_checklist": {
          const text = await readMarkdown(join(DOCS_DIR, "checklist-pr.md"));
          return { content: [{ type: "text", text }] };
        }

        case "validate_module_structure": {
          const requested = String((args as any)?.path ?? "");
          const target = requested.startsWith("/")
            ? requested
            : join(REPO_ROOT, requested);
          const required = [
            "controllers",
            "dto",
            "entities",
            "errors",
            "models",
            "presenters",
            "repositories",
            "services",
          ];
          const missing: string[] = [];
          const present: string[] = [];

          for (const folder of required) {
            try {
              const s = await stat(join(target, folder));
              if (s.isDirectory()) present.push(folder);
              else missing.push(folder);
            } catch {
              missing.push(folder);
            }
          }

          // Check for at least one *.module.ts file.
          let hasModuleFile = false;
          try {
            const files = await readdir(target);
            hasModuleFile = files.some((f) => f.endsWith(".module.ts"));
          } catch {
            /* ignore */
          }

          const ok = missing.length === 0 && hasModuleFile;
          const report = [
            `Module: ${target}`,
            `Status: ${ok ? "✅ OK" : "❌ Issues found"}`,
            "",
            `Present folders: ${present.join(", ") || "(none)"}`,
            `Missing folders: ${missing.join(", ") || "(none)"}`,
            `Has *.module.ts: ${hasModuleFile ? "yes" : "no"}`,
          ].join("\n");

          return { content: [{ type: "text", text: report }] };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[nest-clean-blueprint MCP] running on stdio");
