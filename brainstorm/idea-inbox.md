# Idea Inbox

Ideas captured from code reviews for future brainstorming.

### casl-subject-type-validation

- **Source**: deep-review
- **Date**: 2026-07-24
- **Reference**: 001-chatdgt-pattern-alignment
- **Summary**: `detectSubjectType` in `casl-ability.factory.ts` reads `__caslSubjectType__` off any non-string subject without validating it against `PERMISSIONS_RESOURCES`. Fails closed today since no code passes object subjects.

> Worth revisiting before this codebase adds object-subject CASL checks (e.g. entity-instance-based policy checks) — validate the tag against a known resource enum before trusting it, so a future caller can't smuggle in an unvalidated `__caslSubjectType__` from request-derived data.

### static-iv-cbc-encryption

- **Source**: deep-review
- **Date**: 2026-07-24
- **Reference**: 001-chatdgt-pattern-alignment
- **Summary**: `node-crypto.provider.ts`'s `encrypt()`/`decrypt()` reuse a single static IV from config across every call, which breaks CBC's semantic-security guarantees (identical plaintext prefixes produce identical leading ciphertext blocks).

> Pre-existing behavior, untouched by the chat-dgt pattern-alignment refactor's diff to this file (only an interface rename). Worth a dedicated fix: generate a fresh random IV per `encrypt()` call and store/prepend it alongside the ciphertext, reading it back out in `decrypt()`.
