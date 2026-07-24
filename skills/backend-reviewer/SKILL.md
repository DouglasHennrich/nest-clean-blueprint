---
name: backend-reviewer
description: Deterministic NestJS architecture/pattern reviewer for this repo's src/. Runs pnpm check + lint, then TypeScript validator scripts (regex + AST via ts-morph). Auto-corrects violations via parallel subagents (up to 3 attempts). Invoke after any src/ work.
---

> **Escopo:** Exclusivo para `src/` (NestJS). Não valida lógica de negócio — apenas conformidade arquitetural e de patterns.

# backend-reviewer

## Quando Usar

- Manualmente: `/backend-reviewer [--files file1.ts,file2.ts]`
- Após qualquer alteração em `src/` (controllers, services, repositories, presenters, dto, errors, entities).

Este repositório é um pacote único (não é um monorepo) e não possui Stop hook — não há necessidade de nenhum mecanismo de "skip flag" para evitar loops de re-disparo.

---

## Fluxo — ATTEMPT começa em 1, máximo 3

### Passo 0 — TypeScript Check

```bash
pnpm check
```

**Se falhar (exit ≠ 0):** apresentar os erros TypeScript → parar.

### Passo 1 — Lint

```bash
pnpm lint
```

Aplica `--fix` automaticamente (já configurado no script). Se ainda houver erros após fix: reportar e continuar.

### Passo 2 — Detectar Arquivos

```bash
git diff --name-only HEAD | grep '^src/.*\.ts$' | grep -vE "node_modules|dist|migrations|\.d\.ts"
```

Guardar como `CHANGED_FILES` (CSV). Se vazio e sem arg explícito → exit silencioso (nada a revisar).

### Passo 3 — Executar Validator

```bash
cd .claude/skills/backend-reviewer/scripts && \
  node_modules/.bin/ts-node \
    --project tsconfig.json \
    pattern-validator.ts \
    --files "<CHANGED_FILES>" \
    --diff-files "<CHANGED_FILES>" \
    --attempt <ATTEMPT>
```

Capturar stdout como JSON `{ violations[], summary{}, filesChecked, attempt }`.

### Passo 4 — Avaliar

- `violations.length === 0` → imprimir `✅ Nenhuma violação detectada (tentativa ATTEMPT/3)` → **FIM**
- `ATTEMPT > 3` → apresentar relatório final + `"Auto-correção falhou após 3 tentativas. Revisar manualmente."` → **FIM**

### Passo 5 — Consultar backend-patterns-nestjs (skill de referência do próprio repo)

Para cada `rule` único nas violations, consultar a skill `backend-patterns-nestjs` (que usa `src/modules/_example_orders/` como implementação canônica) e/ou o código-fonte de referência diretamente:

| Rule                          | Referência                                                          |
| ----------------------------- | -------------------------------------------------------------------- |
| RESULT-001 / RESULT-002 / RESULT-003 | `src/@shared/classes/service.ts`, `src/@shared/classes/result.ts` |
| ZOD-001 / ZOD-002 / ZOD-003   | `src/@shared/pipes/zod-validation.pipe.ts`, `dto/*.dto.ts` de `_example_orders` |
| ZOD-004                       | DTOs de `_example_orders/dto/` que fazem `.merge()`/`.extend()`     |
| ROUTING-001                   | `_example_orders/controllers/*.controller.ts`                       |
| NAMING-001 / NAMING-002       | `_example_orders/services/*.service.ts` (`abstract class T...Service`) |
| NAMING-004                    | `_example_orders/models/order.struct.ts` (`I...Model`)              |
| REPO-002                      | `_example_orders/repositories/orders.repository.ts`                 |
| PARAM-001                     | `src/@shared/classes/repository.ts` (métodos com objeto único)      |
| PRESENTER-001 / PRESENTER-002 | `_example_orders/presenters/order.presenter.ts`                     |
| CONTROLLER-001                | `_example_orders/controllers/*.controller.ts` (1 service + 1 presenter) |
| EXCEPTION-001 / EXCEPTION-002 | `src/@shared/errors/abstract-application-exception.ts`               |
| DI-001 / GUARD-001            | injeção via construtor + guards globais                              |
| REPO-001                      | `.create()` em vez de `.save()`                                      |
| VALIDATEDTO-001               | chamada estática `AbstractService.validateDto(schema, payload)` no topo de `execute()` |
| TEST-001..006                 | `_example_orders/services/*.spec.ts`, `_example_orders/controllers/*.spec.ts` |

### Passo 6 — Relatório

```
🔍 backend-reviewer — Tentativa ATTEMPT/3

⚙️  pnpm check: ✅ OK
⚙️  pnpm lint:  ✅ OK

📁 <arquivo>
  🔴 CRÍTICO [RULE:linha] <detalhe>
  🟠 ALTO    [RULE:linha] <detalhe>
  🟡 MÉDIO   [RULE:linha] <detalhe>

Resumo: CRÍTICO: N | ALTO: N | MÉDIO: N | BAIXO: N
```

### Passo 7 — Auto-Fix via subagent-driven-development

Agrupar violations por arquivo. Invocar `/subagent-driven-development` com subagents paralelos — um por arquivo. Cada subagent recebe:

```
Arquivo: <caminho absoluto>

Violações a corrigir:
  [RULE:linha] <detalhe>
  ...

Referência (src/modules/_example_orders/ e src/@shared/classes/):
  <trecho relevante para cada rule>

Instrução:
  Corrija SOMENTE as violações listadas.
  NÃO altere lógica de negócio.
  NÃO refatore além do necessário.
```

Aguardar todos os subagents. Depois: ATTEMPT += 1 → **voltar ao Passo 0**.

---

## Regras Validadas

| Rule            | Tipo  | Sev     | O que detecta                                                  |
| --------------- | ----- | ------- | -------------------------------------------------------------- |
| NAMING-001      | Regex | ALTO    | Classe abstrata em service sem prefixo `T`                     |
| NAMING-002      | Regex | ALTO    | Concrete class usa `extends T` em vez de `implements T`        |
| NAMING-003      | Regex | BAIXO   | Arquivo controller sem sufixo `.controller.ts`                 |
| ROUTING-001     | Regex | MÉDIO   | Decorator HTTP com path no método                              |
| ZOD-001/002/003 | Regex | CRÍTICO | `@Body/@Query/@Param` sem `ZodValidationPipe`                  |
| ZOD-004         | Regex | ALTO    | `*DtoServiceSchema` sem `.merge()`/`.extend()`                 |
| LOGGER-001      | Regex | MÉDIO   | Service sem `public logger: ILogger`                           |
| PRESENTER-001   | Regex | CRÍTICO | Service importa de `/presenters/`                              |
| CONSTRUCTOR-001 | Regex | BAIXO   | Construtor com 2+ deps sem separadores `/// ///`               |
| RESULT-001      | AST   | CRÍTICO | `execute()`/`handle()` não retorna `Promise<Result<>>`         |
| RESULT-002      | AST   | CRÍTICO | `throw` dentro de método de service                            |
| EXCEPTION-001   | AST   | ALTO    | Exceções NestJS nativas em service                             |
| PRESENTER-002   | AST   | CRÍTICO | `.present()` chamado dentro de service                         |
| TEST-001        | Regex | MÉDIO   | Import de `@jest/globals` (pacote não instalado, quebra `pnpm check`) — usar jest global |
| TEST-004        | Regex | ALTO    | Erro validado por `.message`                                   |
| TEST-005        | Regex | MÉDIO   | Sem `Test.createTestingModule` **e** sem instanciação direta (`new Xxx(mocks)`) |
| TEST-006        | Diff  | CRÍTICO | Service/controller sem spec correspondente (spec colocalizado no mesmo diretório) |
| RESULT-003      | AST   | ALTO    | `execute()`/`handle()` retorna `Promise<T \| null>` sem Result |
| RESULT-004      | Regex | CRÍTICO | Uso de `isFailure()` ou `toHttpException()`                    |
| RESULT-005      | Regex | ALTO    | Uso de `Result.ok()` (usar `Result.success()`)                 |
| DI-001          | Regex | ALTO    | Uso de `@Inject()` em controller (usar constructor injection)  |
| GUARD-001       | Regex | ALTO    | `@UseGuards(JwtAuthGuard, RolesGuard)` redundante em ctrl      |
| REPO-001        | Regex | ALTO    | Uso de `.save()` em repositório (usar `.create()`)             |
| PAGINATION-001  | Regex | ALTO    | `list-*.service.ts` não retorna `IPaginationModel<T>`          |
| SECURITY-001    | Regex | CRÍTICO | SQL com template literal (`.query(\`...\${`)`) — injeção       |
| ANY-001         | Regex | MÉDIO   | Uso de `: any` / `as any` em service/controller                |
| VALIDATEDTO-001 | AST   | ALTO    | `execute()`/`handle()` com payload mas sem validação — aceita tanto um método de instância `validateDto` quanto a chamada estática `AbstractService.validateDto(schema, payload)` (convenção deste repo) |
| REPO-002        | AST   | CRÍTICO | Repository sem classe abstrata `I*` extendendo `AbstractRepository`, ou classe concreta que não `extends` essa interface |
| NAMING-004      | AST   | ALTO    | Interface `I*` sem sufixo `Model`                              |
| PARAM-001       | AST   | ALTO    | Função/método com 2+ parâmetros posicionais — deve receber um único objeto (`params: { ... }`). Exclui construtores (DI), params decorados (`@Body`/`@Param`/`@CurrentUser`) e callbacks arrow inline |
| CONTROLLER-001  | AST   | ALTO    | Controller injeta mais de 1 service ou mais de 1 presenter — só pode ter 1 de cada. Services adicionais devem ser injetados pelo service primário como dependência dele, não pelo controller |
| DTO-001         | Regex | ALTO    | Schema Zod declarado fora de `dto/*.dto.ts` — deve viver na pasta `dto/` do módulo com nome `*.dto.ts` |
| STRUCT-001      | Regex | MÉDIO   | Arquivo `*.types.ts` — pattern inválido; renomear p/ `*.struct.ts` (tipos) ou `*.dto.ts` (Zod) |
| PAGINATION-002  | Regex | ALTO    | `IPagination*<*Entity>` — paginar sobre a interface de domínio, não a entity |
| ENTITY-001      | AST   | ALTO    | `execute()`/`handle()` ou generic de `AbstractService<>` expõe `*Entity` — retornar a interface `I*Model` |
| EXCEPTION-002   | AST   | ALTO    | Classe de erro em `errors/` não estende `AbstractApplicationException` (ex.: `extends Error`) |
| ERROR-LOC-001   | AST   | ALTO    | Classe de erro declarada fora de `errors/` (ex.: inline no `.service.ts`) — mover p/ `errors/`, 1 por arquivo |
| ERROR-LOC-002   | AST   | ALTO    | Arquivo em `errors/` declara 2+ classes de erro — 1 erro por arquivo |

### Notas de adaptação para este repositório

- **TEST-002 / TEST-003 removidas**: o port original (chat-dgt) exigia helpers `MockLogger`/`MockRepository` de uma pasta `stubs/` compartilhada. Este repositório não tem essa pasta — a convenção observada em `src/modules/_example_orders/services/*.spec.ts` é mockar `ILogger`/`I*Repository` inline com `jest.fn()` diretamente no `beforeEach`. Manter essas regras geraria falsos positivos em todo teste de service/repository existente.
- **VALIDATEDTO-001 adaptada**: a convenção deste repo (`src/@shared/classes/service.ts`) usa um helper **estático** `AbstractService.validateDto(schema, payload)` chamado no topo de `execute()`, em vez de um método de instância `validateDto` por classe (que era o padrão do chat-dgt). A regra aceita ambas as formas.
- **TEST-006 adaptada**: specs neste repo ficam **colocalizados** no mesmo diretório do arquivo-fonte (`create-order.service.ts` + `create-order.service.spec.ts` lado a lado), não espelhados em uma árvore `tests/` separada. O caminho esperado do spec é apenas o arquivo-fonte com sufixo `.spec.ts` trocado.
