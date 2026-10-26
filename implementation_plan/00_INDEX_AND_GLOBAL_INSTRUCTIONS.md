# RemindCore — Master Implementation Plan
## Index, Architectural Governance & Global Developer Guidelines

Welcome to the **RemindCore Implementation Plan**. This directory outlines the step-by-step technical execution strategy for building the self-hosted intelligent reminder platform based on the approved architecture specifications (`docs/00_INDEX.md` through `docs/10_REQUIREMENTS_DISCUSSION.md`).

---

### 1. Global Architectural Principles

All code across backend, web, and mobile must adhere to these non-negotiable engineering standards:

1. **SOLID Design Principles**:
   - **Single Responsibility (SRP)**: Keep classes and methods concise. Every method must do one logical thing and fit on one screen (< 25–30 lines). Classes must have a single reason to change.
   - **Open/Closed (OCP)**: Favor strategy and factory patterns (e.g., `IRecurrenceStrategy`, `IEscalationAction`) over branching `switch`/`if-else` chains.
   - **Liskov Substitution (LSP)**: Derived types or strategy implementations must honor base behavioral contracts without throwing unexpected runtime exceptions.
   - **Interface Segregation (ISP)**: Create small, role-specific interfaces (`IDateTimeProvider`, `IRecurrenceCalculator`, `INotificationDispatcher`) rather than monolithic service interfaces.
   - **Dependency Inversion (DIP)**: Core business rules depend purely on abstractions. External I/O (Database, Quartz, Firebase FCM, Google Calendar) implements domain ports.

2. **Strict Encapsulation & Pure Domain Logic**:
   - Domain calculation engines (`RecurrenceCalculator`, `EscalationEngine`) must be pure deterministic functions or stateless services with zero side effects and zero external dependencies.

---

### 2. Pragmatic Automated Testing Strategy

We target a **high return-on-investment (ROI)** testing ratio rather than superficial 100% line coverage:

| Target Scope | Test Type | Coverage Expectation | Primary Tooling |
|---|---|---|---|
| **Recurrence Engine** (Fixed vs. Floating, Leap years, DST shifts) | **Unit Tests** | **Extensive & Exhaustive** | xUnit, FluentAssertions |
| **Escalation & Snooze Ladder** (Next trigger math, step overflow) | **Unit Tests** | **Extensive & Exhaustive** | xUnit, FluentAssertions |
| **Domain State Transitions** (Completion, Dismissal, Expire) | **Unit Tests** | High | xUnit |
| **REST API Endpoints** (Validation, Response DTOs, HTTP Codes) | **Integration Tests** | Focused on critical flows | `WebApplicationFactory`, Testcontainers PG |
| **Repository & Database Queries** (Pagination, Indexes, Upserts) | **Integration Tests** | Representative queries | Testcontainers (PostgreSQL 16) |
| **FCM / External Sync Workers** (Payload formatting, HTTP contracts) | **Unit / Contract Tests** | Serialization & Error Handling | Moq / WireMock.Net |

---

### 3. Living Documentation Standard (During Implementation)

As code is written, documentation must be maintained according to strict rules:

- **No Obvious Duplication**: Never write documentation that merely restates method names or class signatures.
- **Cross-File & Architectural Traceability**: Document interactions across files (e.g., how an HTTP request in `RemindersController` triggers `IEventBus`, interacts with PostgreSQL `reminder_occurrences`, and updates Quartz triggers).
- **Line Budget Discipline**: Any documentation file must remain focused. If an implementation document exceeds **200 lines**, it must be split into modular sub-documents or refactored for brevity.
- **Living Metadata**: Each module maintains a 10–15 line `MODULE_CONTEXT.md` defining its inputs, outputs, database tables touched, and invariant rules.

---

### 4. Implementation Steps Master Index

Follow each step sequentially. Every step contains its own self-contained requirements, dependencies, code contracts, tests, and verification criteria:

| Step File | Title & Scope | Primary Deliverables |
|---|---|---|
| [**Step 01**](./01_PROJECT_SETUP_AND_FOUNDATIONS.md) | **Project Setup & Clean Architecture** | .NET 9 solution, solution folders, strict compiler flags, Docker base, DI |
| [**Step 02**](./02_DATABASE_AND_MIGRATIONS.md) | **PostgreSQL Persistence & Migrations** | PostgreSQL 16 schema, DDL migrations, connection pooling, base repositories |
| [**Step 03**](./03_RECURRENCE_CALCULATIONS_ENGINE.md) | **Recurrence Calculations Engine** | Pure domain calculations (Fixed vs. Floating), timezone math, full unit tests |
| [**Step 04**](./04_ESCALATION_AND_SNOOZE_LADDER.md) | **Escalation & Snooze State Machine** | Snooze step progression (+1h, +2h, +24h), anti-storm limits, unit test matrix |
| [**Step 05**](./05_SCHEDULING_AND_BACKGROUND_WORKERS.md) | **Quartz.NET Schedulers & Workers** | Quartz.NET clustered jobs, occurrence generator, overdue monitor worker |
| [**Step 06**](./06_CORE_REST_API_AND_SECURITY.md) | **REST API, Zero Trust & Security** | ASP.NET Core endpoints, ProblemDetails, Cloudflare Zero Trust headers, tests |
| [**Step 07**](./07_PUSH_NOTIFICATIONS_AND_FCM.md) | **FCM Push Dispatcher & Custom Audio** | Firebase HTTP v1 client, notification channels, payload builder, retry queue |
| [**Step 08**](./08_CALENDAR_SYNC_INTEGRATION.md) | **iCal Feed & Calendar Sync** | Dynamic `.ics` feed with secret token, optional Google Calendar API sync |
| [**Step 09**](./09_ANDROID_APP_IMPLEMENTATION.md) | **Android Client Application** | Kotlin / Compose, Notification Channels, Quick Action Receivers, FCM |
| [**Step 10**](./10_WEB_CLIENT_PANEL.md) | **Web Management Dashboard** | React SPA, recurrence visual builder, timeline, quick action completions |
| [**Step 11**](./11_DOCKER_DEPLOYMENT_AND_CLOUDFLARE.md) | **Docker Deployment & Cloudflare Tunnel** | `docker-compose.yml`, `cloudflared` tunnel, backup script, smoke test |

---

### 5. Execution Workflow

1. Always check out a task-specific branch or implement one step completely before moving to the next.
2. Run step verification commands (unit tests + integration tests) immediately.
3. Keep code commit messages tied to the Step ID (e.g. `feat(step-03): implement floating recurrence calculations with timezone support`).
