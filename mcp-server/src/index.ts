#!/usr/bin/env node
/**
 * MCP server for nest-clean-blueprint.
 *
 * Exposes the architecture blueprint, patterns, conventions, provider docs,
 * scaffolding templates and the PR checklist as MCP tools so AI agents can
 * consult always-fresh guidance from a single source of truth.
 *
 * Supports two modes:
 *  - LOCAL  (default): reads from the local filesystem relative to REPO_ROOT.
 *  - REMOTE (GitHub):  reads from raw.githubusercontent.com when GITHUB_REPO
 *    env var is set (e.g. "username/nest-clean-blueprint").
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  CallToolRequest,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFile, readdir, stat, mkdir, writeFile } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ── Mode detection ─────────────────────────────────────────────────────────────
/** GitHub repository slug, e.g. "username/nest-clean-blueprint".
 *  When set, the server fetches ALL files from GitHub instead of the local filesystem. */
const GITHUB_REPO = process.env.GITHUB_REPO ?? "";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH ?? "main";
/** Optional Personal Access Token — required for private repos and avoids
 *  GitHub unauthenticated rate limits (60 req/h → 5 000 req/h with token). */
const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? "";
const REMOTE_MODE = GITHUB_REPO !== "";
/** Absolute path where synced docs are cached locally (e.g. "/my-project/.blueprint-cache").
 *  When set together with GITHUB_REPO, enables HYBRID mode: docs are auto-synced on startup
 *  when a newer blueprint version is available, and served from cache first. */
const LOCAL_CACHE_DIR = process.env.LOCAL_CACHE_DIR ?? "";
/** True when GITHUB_REPO + LOCAL_CACHE_DIR are both set. */
const HYBRID_MODE = REMOTE_MODE && LOCAL_CACHE_DIR !== "";

// ── Local paths (used only in LOCAL mode) ─────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// mcp-server/dist/index.js → mcp-server/ → repo-root/
const REPO_ROOT = resolve(__dirname, "..", "..");

// ── Repo-relative path constants (work in both modes) ─────────────────────────
const R_DOCS = "docs";
const R_TEMPLATES = "templates";
const R_PATTERNS = "docs/patterns";
const R_CONVENTIONS = "docs/conventions";
const R_PROVIDERS = "docs/providers";
const R_FLOWS = "docs/flows";
const R_SKILLS = "skills";

// ── GitHub helpers ─────────────────────────────────────────────────────────────
function githubHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "User-Agent": "nest-clean-blueprint-mcp",
  };
  if (GITHUB_TOKEN) h.Authorization = `Bearer ${GITHUB_TOKEN}`;
  return h;
}

async function fetchRaw(relPath: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${relPath}`;
  const res = await fetch(url, { headers: githubHeaders() });
  if (!res.ok)
    throw new Error(`GitHub fetch failed (HTTP ${res.status}): ${url}`);
  return res.text();
}

async function listGitHub(relDir: string, ext: string): Promise<string[]> {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${relDir}?ref=${GITHUB_BRANCH}`;
  const h = { ...githubHeaders(), Accept: "application/vnd.github.v3+json" };
  const res = await fetch(url, { headers: h });
  if (!res.ok) return [];
  const items = (await res.json()) as Array<{ name: string; type: string }>;
  return items
    .filter((i) => i.type === "file" && i.name.endsWith(ext))
    .map((i) => i.name.slice(0, -ext.length))
    .sort();
}

// ── Unified I/O helpers (mode-aware: LOCAL · REMOTE · HYBRID) ───────────────────
/** Read a file by repo-relative path. In HYBRID mode serves from LOCAL_CACHE_DIR
 *  first, falling back to live GitHub. */
async function readContent(relPath: string): Promise<string> {
  if (HYBRID_MODE) {
    try {
      return await readFile(join(LOCAL_CACHE_DIR, relPath), "utf-8");
    } catch {
      /* not cached yet — fall through to GitHub */
    }
    return fetchRaw(relPath);
  }
  if (REMOTE_MODE) return fetchRaw(relPath);
  try {
    return await readFile(join(REPO_ROOT, relPath), "utf-8");
  } catch (err) {
    throw new Error(
      `File not found: ${relPath}. ${err instanceof Error ? err.message : ""}`,
    );
  }
}

/**
 * Enriched read (HYBRID mode only): fetches fresh content from GitHub AND reads
 * the local cache simultaneously, returning both side-by-side when they differ.
 * Falls back to readContent in LOCAL or REMOTE mode.
 */
async function readContentEnriched(relPath: string): Promise<string> {
  if (!HYBRID_MODE) return readContent(relPath);

  const [liveResult, cachedResult] = await Promise.allSettled([
    fetchRaw(relPath),
    readFile(join(LOCAL_CACHE_DIR, relPath), "utf-8"),
  ]);

  const live = liveResult.status === "fulfilled" ? liveResult.value : null;
  const cached =
    cachedResult.status === "fulfilled" ? cachedResult.value : null;

  if (!live && !cached) throw new Error(`Content unavailable: ${relPath}`);
  if (!live) return cached!;
  if (!cached || cached.trim() === live.trim()) return live; // identical — avoid duplication

  return [
    `> 🔄 **Live (GitHub — latest)**`,
    ``,
    live,
    ``,
    `---`,
    ``,
    `> 📂 **Pinned cache (local)**`,
    ``,
    cached,
  ].join("\n");
}

/** List files in a repo-relative directory, returning names WITHOUT the extension.
 *  Works in all modes. */
async function listContent(relDir: string, ext = ".md"): Promise<string[]> {
  if (REMOTE_MODE) return listGitHub(relDir, ext);
  const absDir = join(REPO_ROOT, relDir);
  try {
    const entries = await readdir(absDir);
    const files: string[] = [];
    for (const entry of entries) {
      const s = await stat(join(absDir, entry));
      if (s.isFile() && entry.endsWith(ext)) {
        files.push(entry.slice(0, -ext.length));
      }
    }
    return files.sort();
  } catch {
    return [];
  }
}

/**
 * List skill names from a skills directory where each skill lives in its own
 * subdirectory as `<name>/SKILL.md`. Returns subdirectory names sorted.
 */
async function listSkillNames(relDir: string): Promise<string[]> {
  if (REMOTE_MODE) {
    // GitHub API: list subdirs that contain a SKILL.md
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${relDir}?ref=${GITHUB_BRANCH}`;
    const h = { ...githubHeaders(), Accept: "application/vnd.github.v3+json" };
    const res = await fetch(url, { headers: h });
    if (!res.ok) return [];
    const items = (await res.json()) as Array<{ name: string; type: string }>;
    return items
      .filter((i) => i.type === "dir")
      .map((i) => i.name)
      .sort();
  }
  const absDir = join(REPO_ROOT, relDir);
  try {
    const entries = await readdir(absDir);
    const names: string[] = [];
    for (const entry of entries) {
      const s = await stat(join(absDir, entry));
      if (s.isDirectory()) {
        // Only include if a SKILL.md exists inside
        try {
          await stat(join(absDir, entry, "SKILL.md"));
          names.push(entry);
        } catch {
          /* no SKILL.md — skip */
        }
      }
    }
    return names.sort();
  } catch {
    return [];
  }
}

/**
 * Safely build a repo-relative path from a user-supplied name.
 * Guards against path-traversal attacks (e.g. "../../etc/passwd").
 */
function safePath(baseRel: string, name: string, suffix = ""): string {
  const sanitized = name.replace(/\\/g, "/").replace(/\.\./g, "");
  const result = `${baseRel}/${sanitized}${suffix}`;
  if (!result.startsWith(`${baseRel}/`)) {
    throw new Error(`Path escapes base directory: ${name}`);
  }
  return result;
}

/**
 * Safely resolve a user-supplied name into an absolute path.
 * Used by validate_module_structure (LOCAL mode only).
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

// ── Version check & doc sync (HYBRID mode) ────────────────────────────────────
/** Returns true when the remote semver is strictly newer than local. */
function isNewer(remote: string, local: string): boolean {
  const parse = (v: string): number[] =>
    v
      .replace(/^v/, "")
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
  const [rMaj, rMin, rPat] = parse(remote);
  const [lMaj, lMin, lPat] = parse(local);
  if (rMaj !== lMaj) return rMaj > lMaj;
  if (rMin !== lMin) return rMin > lMin;
  return rPat > lPat;
}

/** Fetch the blueprint version string from docs/VERSION on GitHub. */
async function fetchRemoteVersion(): Promise<string> {
  return (await fetchRaw(`${R_DOCS}/VERSION`)).trim();
}

/** Read the locally-cached blueprint version (returns "0.0.0" if not found). */
async function readLocalVersion(): Promise<string> {
  try {
    const raw = await readFile(
      join(LOCAL_CACHE_DIR, R_DOCS, "VERSION"),
      "utf-8",
    );
    return raw.trim();
  } catch {
    return "0.0.0";
  }
}

/** Write a file into LOCAL_CACHE_DIR, creating parent directories as needed. */
async function writeCached(relPath: string, content: string): Promise<void> {
  const localPath = join(LOCAL_CACHE_DIR, relPath);
  await mkdir(dirname(localPath), { recursive: true });
  await writeFile(localPath, content, "utf-8");
}

/**
 * Download ALL blueprint docs from GitHub into LOCAL_CACHE_DIR.
 * Called automatically when the remote version is newer than local.
 */
async function syncDocs(newVersion: string): Promise<void> {
  const sections: Array<{ dir: string; ext: string }> = [
    { dir: R_PATTERNS, ext: ".md" },
    { dir: R_CONVENTIONS, ext: ".md" },
    { dir: R_PROVIDERS, ext: ".md" },
    { dir: R_FLOWS, ext: ".md" },
    { dir: R_TEMPLATES, ext: ".ts.hbs" },
  ];
  const topDocs = [
    `${R_DOCS}/ARCHITECTURE-BLUEPRINT.md`,
    `${R_DOCS}/checklist-pr.md`,
  ];

  await Promise.all([
    ...topDocs.map(async (relPath) => {
      const content = await fetchRaw(relPath);
      await writeCached(relPath, content);
    }),
    ...sections.map(async ({ dir, ext }) => {
      const names = await listGitHub(dir, ext);
      await Promise.all(
        names.map(async (name) => {
          const relPath = `${dir}/${name}${ext}`;
          const content = await fetchRaw(relPath);
          await writeCached(relPath, content);
        }),
      );
    }),
  ]);

  // Write the new version stamp last so a partial sync never looks complete.
  await writeCached(`${R_DOCS}/VERSION`, newVersion);
}

const server = new Server(
  { name: "nest-clean-blueprint", version: "0.2.0" },
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
      name: "get_flow",
      description:
        "Returns the full documentation for one of the 8 infrastructure flows (auth-jwt, authorization-casl, bullmq-queues, cache-redis, logger, rate-limit, cronjobs, health-check). Call list_flows to see available names.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              'Flow name without extension (e.g. "auth-jwt"). Call list_flows to see all available names.',
          },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
    {
      name: "list_flows",
      description:
        "Lists all available infrastructure flow doc names (auth-jwt, authorization-casl, bullmq-queues, cache-redis, logger, rate-limit, cronjobs, health-check).",
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
      name: "list_skills",
      description:
        "Lists all available skill names in .github/skills/ (e.g. backend-patterns, verification-loop).",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "get_skill",
      description:
        "Returns a skill document from skills/ by name (e.g. backend-patterns, verification-loop). Call list_skills to see available names.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              'Skill name without extension (e.g. "backend-patterns"). Call list_skills to see all available names.',
          },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
    {
      name: "install_skill",
      description:
        "Creates a skill at skills/<name>/SKILL.md with the given content. The directory is created if it does not exist. Only works in LOCAL mode. Use this to add or update a project skill.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              'Skill name used as the subdirectory (e.g. "backend-patterns"). Must contain only letters, digits, hyphens or underscores.',
          },
          content: {
            type: "string",
            description:
              "Full markdown content for SKILL.md, including YAML frontmatter (---\nname: ...\ndescription: ...\n---).",
          },
        },
        required: ["name", "content"],
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
          const text = await readContentEnriched(
            `${R_DOCS}/ARCHITECTURE-BLUEPRINT.md`,
          );
          return { content: [{ type: "text", text }] };
        }

        case "list_patterns": {
          const names = await listContent(R_PATTERNS);
          return { content: [{ type: "text", text: names.join("\n") }] };
        }

        case "get_pattern": {
          const n = String((args as any)?.name ?? "");
          return {
            content: [
              {
                type: "text",
                text: await readContentEnriched(safePath(R_PATTERNS, n, ".md")),
              },
            ],
          };
        }

        case "list_conventions": {
          const names = await listContent(R_CONVENTIONS);
          return { content: [{ type: "text", text: names.join("\n") }] };
        }

        case "get_convention": {
          const n = String((args as any)?.name ?? "");
          return {
            content: [
              {
                type: "text",
                text: await readContentEnriched(
                  safePath(R_CONVENTIONS, n, ".md"),
                ),
              },
            ],
          };
        }

        case "list_providers": {
          const names = await listContent(R_PROVIDERS);
          return { content: [{ type: "text", text: names.join("\n") }] };
        }

        case "get_provider_docs": {
          const n = String((args as any)?.name ?? "");
          return {
            content: [
              {
                type: "text",
                text: await readContentEnriched(
                  safePath(R_PROVIDERS, n, ".md"),
                ),
              },
            ],
          };
        }

        case "list_templates": {
          const names = await listContent(R_TEMPLATES, ".ts.hbs");
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
          return {
            content: [
              {
                type: "text",
                text: await readContent(`${R_TEMPLATES}/${layer}.ts.hbs`),
              },
            ],
          };
        }

        case "get_email_template_example": {
          const base = "src/@shared/providers/mail-provider/templates";
          const [welcome, header, footer] = await Promise.all([
            readContent(`${base}/welcome.ejs`),
            readContent(`${base}/partials/header.ejs`),
            readContent(`${base}/partials/footer.ejs`),
          ]);
          const text =
            `# welcome.ejs\n\n\`\`\`ejs\n${welcome}\n\`\`\`\n\n` +
            `# partials/header.ejs\n\n\`\`\`ejs\n${header}\n\`\`\`\n\n` +
            `# partials/footer.ejs\n\n\`\`\`ejs\n${footer}\n\`\`\`\n`;
          return { content: [{ type: "text", text }] };
        }

        case "get_checklist": {
          const text = await readContentEnriched(`${R_DOCS}/checklist-pr.md`);
          return { content: [{ type: "text", text }] };
        }

        case "list_flows": {
          const names = await listContent(R_FLOWS);
          return { content: [{ type: "text", text: names.join("\n") }] };
        }

        case "get_flow": {
          const n = String((args as any)?.name ?? "");
          return {
            content: [
              {
                type: "text",
                text: await readContentEnriched(safePath(R_FLOWS, n, ".md")),
              },
            ],
          };
        }

        case "list_skills": {
          const names = await listSkillNames(R_SKILLS);
          return { content: [{ type: "text", text: names.join("\n") }] };
        }

        case "get_skill": {
          const n = String((args as any)?.name ?? "");
          return {
            content: [
              {
                type: "text",
                text: await readContentEnriched(
                  safePath(R_SKILLS, n, "/SKILL.md"),
                ),
              },
            ],
          };
        }

        case "install_skill": {
          if (REMOTE_MODE) {
            return {
              content: [
                {
                  type: "text",
                  text: "install_skill is only available in LOCAL mode (requires filesystem write access).",
                },
              ],
              isError: true,
            };
          }
          const skillName = String((args as any)?.name ?? "");
          const skillContent = String((args as any)?.content ?? "");
          if (!/^[\w-]+$/.test(skillName)) {
            throw new Error(
              `Invalid skill name "${skillName}". Use only letters, digits, hyphens or underscores.`,
            );
          }
          const skillDir = join(REPO_ROOT, R_SKILLS, skillName);
          const skillFile = join(skillDir, "SKILL.md");
          await mkdir(skillDir, { recursive: true });
          await writeFile(skillFile, skillContent, "utf-8");
          return {
            content: [
              {
                type: "text",
                text: `Skill "${skillName}" installed at skills/${skillName}/SKILL.md`,
              },
            ],
          };
        }

        case "validate_module_structure": {
          if (REMOTE_MODE) {
            return {
              content: [
                {
                  type: "text",
                  text: "validate_module_structure is only available in LOCAL mode (requires filesystem access).",
                },
              ],
            };
          }
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

// ── HYBRID mode: auto-sync if remote is newer ─────────────────────────────────
if (HYBRID_MODE) {
  try {
    const remoteVer = await fetchRemoteVersion();
    const localVer = await readLocalVersion();
    if (isNewer(remoteVer, localVer)) {
      console.error(
        `[nest-clean-blueprint MCP] v${remoteVer} available (local: v${localVer}) — syncing docs…`,
      );
      await syncDocs(remoteVer);
      console.error(`[nest-clean-blueprint MCP] Sync complete.`);
    } else {
      console.error(
        `[nest-clean-blueprint MCP] Cache up to date (v${localVer}).`,
      );
    }
  } catch (err) {
    console.error(
      `[nest-clean-blueprint MCP] Version check failed — using cached content. ${err}`,
    );
  }
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[nest-clean-blueprint MCP] running on stdio");
