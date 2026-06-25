# Sanitize Utility Class Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `src/@shared/utils/sanitize.ts` into a utility class and update the request logging middleware to use it for consistent data masking.

**Architecture:** Helper class pattern with static methods (`Sanitize.data`, `Sanitize.headers`, `Sanitize.file`, `Sanitize.files`) using pre-defined `SENSITIVE_KEYS`.

**Tech Stack:** TypeScript, NestJS, Express, BullMQ.

---

### Task 1: Refactor `sanitize.ts` to `Sanitize` class

**Files:**
- Modify: `src/@shared/utils/sanitize.ts`

- [ ] **Step 1: Create the `Sanitize` class with static methods**

Implement the class with the proposed methods (`data`, `headers`, `file`, `files`) as discussed in the design.
Use the existing `SENSITIVE_KEYS` set.

```typescript
export class Sanitize {
  private static readonly SENSITIVE_KEYS = SENSITIVE_KEYS;

  static data(data: any): string | undefined {
    // ... logic to mask and stringify
  }

  static headers(headers: any): string | undefined {
    // ... logic to mask headers and stringify
  }

  static file(file: any): string | undefined {
    // ... logic to extract metadata and stringify
  }

  static files(files: any): string | undefined {
    // ... logic to extract multiple metadata and stringify
  }

  private static maskSensitiveData(data: any): any {
    // ... existing recursive masking logic adapted for class
  }
}
```

- [ ] **Step 2: Replace `sanitizeData` function**

Remove the top-level `sanitizeData` function after implementing `Sanitize.data`.

- [ ] **Step 3: Verify syntax and basic functionality**

- [ ] **Step 4: Commit**

```bash
git add src/@shared/utils/sanitize.ts
git commit -m "refactor: create Sanitize class in shared utils"
```

---

### Task 2: Update `CreateRequestLogEntityMiddleware`

**Files:**
- Modify: `src/@shared/middlewares/create-request-log-entity.middleware.ts`

- [ ] **Step 1: Update imports**

Ensure `Sanitize` is imported from `../utils/sanitize`. (It should already be there based on current context, but verify the usage matches the new static methods).

- [ ] **Step 2: Replace instance-style calls/old calls with new static methods**

Update:
- `Sanitize.data(req.body)`
- `Sanitize.headers(req.headers)`
- `Sanitize.file(...)`
- `Sanitize.files(...)`

- [ ] **Step 3: Remove unused `sanitizeData` or similar private methods from middleware if any**

- [ ] **Step 4: Verify middleware builds**

Run: `pnpm check` (or relevant lint/build command)

- [ ] **Step 5: Commit**

```bash
git add src/@shared/middlewares/create-request-log-entity.middleware.ts
git commit -m "refactor: update request log middleware to use Sanitize static methods"
```

---

### Task 3: Final Verification

- [ ] **Step 1: Run project-wide type checks**

Run: `pnpm check`

- [ ] **Step 2: Manual verification of logs (optional if test env available)**

- [ ] **Step 3: Cleanup Design and Plan docs**

Delete or archive the temporary docs.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: complete Sanitize class refactoring"
```
