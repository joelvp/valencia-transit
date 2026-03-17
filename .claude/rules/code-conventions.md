# Code Conventions

## TypeScript

- **Strict mode** always (`strict: true` in tsconfig).
- **ESModules** (`import/export`), never CommonJS.
- **One class per file**. File name matches class name: `Station.ts`, `StationRepository.ts`.
- **Path aliases**: Use `@/` alias for `src/` to avoid deep relative imports: `import { Station } from "@/core/domain/station/Station"`.

## Formatting (Prettier)

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

## Linting (ESLint)

- `@typescript-eslint/recommended` + strict rules
- `eslint-plugin-hexagonal-architecture` — enforces that domain never imports from infrastructure
- `eslint-config-prettier` — disables formatting rules that conflict with Prettier

## Naming Conventions

| Concept            | Convention                     | Example                                           |
| ------------------ | ------------------------------ | ------------------------------------------------- |
| Entities           | PascalCase, noun               | `Station`, `Line`, `Schedule`                     |
| Value Objects      | PascalCase, noun               | `StationId`, `TimeOfDay`, `LineStop`              |
| Ports (interfaces) | PascalCase, noun               | `StationRepository`, `EventBus`                   |
| Use cases          | PascalCase, verb phrase        | `SearchNextDepartures`, `ImportTransitData`       |
| Adapters           | PascalCase, noun + tech suffix | `StationRepositoryDrizzle`, `InMemoryEventBus`    |
| Domain events      | PascalCase, past tense         | `DepartureSearched`, `DatasetImported`            |
| Domain errors      | PascalCase, noun + "Error"     | `StationNotFoundError`, `InvalidArgumentError`    |
| Handlers           | camelCase, noun + "Handler"    | `departureHandler`, `helpHandler`                 |
| Test files         | Same name + `.test.ts`         | `Station.test.ts`, `SearchNextDepartures.test.ts` |
| Mapper files       | PascalCase + "Mapper"          | `StationMapper.ts`, `TripMapper.ts`               |

## Domain Conventions

- **No anemic entities**. Entities have methods, not just data.
- **Value Objects are immutable**. Use `readonly` properties. Validate in constructor.
- **One repository per aggregate root**. Child entities accessed through the root's repo.
- **Errors are typed**. Extend a base `DomainError` class. Never throw generic `Error`.
- **Ports are interfaces**. Defined in domain, implemented in adapters.

## Application Conventions

- **One class per use case** with a single `execute()` method.
- **Constructor injection** for all dependencies (ports).
- **Return typed results**, never throw for expected business outcomes. Use discriminated unions or Result types if needed.
- **No direct I/O**. Always through ports.

## Adapter Conventions

- **Tech suffix** in class names: `StationRepositoryDrizzle`, `TelegramNotifier`.
- **Mappers** handle domain <-> persistence translation. One mapper per aggregate.
- **One file per adapter class**.

## Testing Conventions

- **Runner**: `bun test` — use `import { describe, it, expect } from "bun:test";`
- **Naming**: `describe("ClassName")` → `it("should <behavior>")`
- **Test behavior**, not implementation. Assert outputs and side effects.

### Test Types

| Type | Location | What it tests | Mocking |
|------|----------|---------------|---------|
| **Unit** | Co-located (`*.test.ts`) | Domain logic, use case orchestration, mappers | Ports (for use cases), nothing (for domain) |
| **Integration** | Co-located (`*.test.ts`) | One adapter against its real infra | Nothing — real DB/filesystem |
| **Component** | `tests/component/` | Use case + real adapters + real DB, no entry point | Nothing — real everything except entry point |
| **E2E** | `tests/e2e/` | Full flow from entry point to response | Nothing — real everything |

- **Domain tests**: Pure logic, no mocks.
- **Application tests**: Mock all ports (repos, event bus).
- **Integration tests**: Real infra, clean up in `beforeEach`/`afterEach`.
- **Component tests**: Use case with all real adapters wired together.
- **E2E tests**: Full user flow from entry point to response.
