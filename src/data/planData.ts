import { DocItem } from './docsData';

export const IMPLEMENTATION_PLAN_ITEMS: DocItem[] = [
  {
    id: 'PLAN_00_INDEX',
    filename: '00_INDEX_AND_GLOBAL_INSTRUCTIONS.md',
    title: 'Master Implementation Plan & Global Instructions',
    badge: 'Index',
    category: 'Architecture',
    filePath: '/implementation_plan/00_INDEX_AND_GLOBAL_INSTRUCTIONS.md',
    summary: 'Master index, SOLID architectural rules, automated testing balance (Unit vs Integration), and living documentation rules (< 200 lines).',
    content: `# RemindCore — Master Implementation Plan
## Index, Architectural Governance & Global Developer Guidelines

Welcome to the **RemindCore Implementation Plan**. This directory outlines the step-by-step technical execution strategy for building the self-hosted intelligent reminder platform based on the approved architecture specifications (\`docs/00_INDEX.md\` through \`docs/10_REQUIREMENTS_DISCUSSION.md\`).

---

### 1. Global Architectural Principles

All code across backend, web, and mobile must adhere to these non-negotiable engineering standards:

1. **SOLID Design Principles**:
   - **Single Responsibility (SRP)**: Keep classes and methods concise. Every method must do one logical thing and fit on one screen (< 25–30 lines). Classes must have a single reason to change.
   - **Open/Closed (OCP)**: Favor strategy and factory patterns (e.g., \`IRecurrenceStrategy\`, \`IEscalationAction\`) over branching \`switch\`/\`if-else\` chains.
   - **Liskov Substitution (LSP)**: Derived types or strategy implementations must honor base behavioral contracts without throwing unexpected runtime exceptions.
   - **Interface Segregation (ISP)**: Create small, role-specific interfaces (\`IDateTimeProvider\`, \`IRecurrenceCalculator\`, \`INotificationDispatcher\`) rather than monolithic service interfaces.
   - **Dependency Inversion (DIP)**: Core business rules depend purely on abstractions. External I/O (Database, Quartz, Firebase FCM, Google Calendar) implements domain ports.

2. **Strict Encapsulation & Pure Domain Logic**:
   - Domain calculation engines (\`RecurrenceCalculator\`, \`EscalationEngine\`) must be pure deterministic functions or stateless services with zero side effects and zero external dependencies.

---

### 2. Pragmatic Automated Testing Strategy

We target a **high return-on-investment (ROI)** testing ratio rather than superficial 100% line coverage:

| Target Scope | Test Type | Coverage Expectation | Primary Tooling |
|---|---|---|---|
| **Recurrence Engine** (Fixed vs. Floating, Leap years, DST shifts) | **Unit Tests** | **Extensive & Exhaustive** | xUnit, FluentAssertions |
| **Escalation & Snooze Ladder** (Next trigger math, step overflow) | **Unit Tests** | **Extensive & Exhaustive** | xUnit, FluentAssertions |
| **Domain State Transitions** (Completion, Dismissal, Expire) | **Unit Tests** | High | xUnit |
| **REST API Endpoints** (Validation, Response DTOs, HTTP Codes) | **Integration Tests** | Focused on critical flows | \`WebApplicationFactory\`, Testcontainers PG |
| **Repository & Database Queries** (Pagination, Indexes, Upserts) | **Integration Tests** | Representative queries | Testcontainers (PostgreSQL 16) |
| **FCM / External Sync Workers** (Payload formatting, HTTP contracts) | **Unit / Contract Tests** | Serialization & Error Handling | Moq / WireMock.Net |

---

### 3. Living Documentation Standard (During Implementation)

As code is written, documentation must be maintained according to strict rules:

- **No Obvious Duplication**: Never write documentation that merely restates method names or class signatures.
- **Cross-File & Architectural Traceability**: Document interactions across files (e.g., how an HTTP request in \`RemindersController\` triggers \`IEventBus\`, interacts with PostgreSQL \`reminder_occurrences\`, and updates Quartz triggers).
- **Line Budget Discipline**: Any documentation file must remain focused. If an implementation document exceeds **200 lines**, it must be split into modular sub-documents or refactored for brevity.
- **Living Metadata**: Each module maintains a 10–15 line \`MODULE_CONTEXT.md\` defining its inputs, outputs, database tables touched, and invariant rules.

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
| [**Step 08**](./08_CALENDAR_SYNC_INTEGRATION.md) | **iCal Feed & Calendar Sync** | Dynamic \`.ics\` feed with secret token, optional Google Calendar API sync |
| [**Step 09**](./09_ANDROID_APP_IMPLEMENTATION.md) | **Android Client Application** | Kotlin / Compose, Notification Channels, Quick Action Receivers, FCM |
| [**Step 10**](./10_WEB_CLIENT_PANEL.md) | **Web Management Dashboard** | React SPA, recurrence visual builder, timeline, quick action completions |
| [**Step 11**](./11_DOCKER_DEPLOYMENT_AND_CLOUDFLARE.md) | **Docker Deployment & Cloudflare Tunnel** | \`docker-compose.yml\`, \`cloudflared\` tunnel, backup script, smoke test |`
  },
  {
    id: 'PLAN_01_SETUP',
    filename: '01_PROJECT_SETUP_AND_FOUNDATIONS.md',
    title: 'Step 01: Project Setup & Clean Architecture',
    badge: 'Step 01',
    category: 'Architecture',
    filePath: '/implementation_plan/01_PROJECT_SETUP_AND_FOUNDATIONS.md',
    summary: '.NET 9 solution layout, compiler flags, domain isolation, IDateTimeProvider abstraction, and Result pattern.',
    content: `# Step 01: Project Setup & Clean Architecture Foundations

## 1. Objective
Establish the foundational solution structure for the **RemindCore** backend using .NET 9, enforcing Clean Architecture boundaries, strict compiler settings, standard dependency injection, and uniform result handling.

---

## 2. Solution Structure
Organize the solution into distinct projects following strict dependency boundaries:

\`\`\`
src/
  ├── RemindCore.Domain/          # Pure domain models, enums, value objects, exceptions (0 dependencies)
  ├── RemindCore.Application/     # Use cases, interfaces (repositories, clock, dispatchers), DTOs
  ├── RemindCore.Infrastructure/  # EF Core, PostgreSQL, Quartz.NET, Firebase FCM client, iCal generator
  └── RemindCore.Api/             # ASP.NET Core endpoints, middlewares, filters, Program.cs
tests/
  ├── RemindCore.UnitTests/       # Domain calculation & business rule tests (fast, in-memory)
  └── RemindCore.IntegrationTests/# WebApplicationFactory & database integration tests
\`\`\`

---

## 3. SOLID & Code Standards
1. **Strict Compiler Settings**: Enable \`<Nullable>enable</Nullable>\` and \`<TreatWarningsAsErrors>true</TreatWarningsAsErrors>\` in \`Directory.Build.props\`.
2. **Small Methods & Types**: Every class must address a single concern. For domain entities, encapsulate state mutations within private setters and expressive domain methods.
3. **Result Pattern**: Use a functional \`Result<T>\` / \`Result\` wrapper to avoid using exceptions for standard business branch validation.`
  },
  {
    id: 'PLAN_02_DB',
    filename: '02_DATABASE_AND_MIGRATIONS.md',
    title: 'Step 02: PostgreSQL Persistence & Migrations',
    badge: 'Step 02',
    category: 'Data & API',
    filePath: '/implementation_plan/02_DATABASE_AND_MIGRATIONS.md',
    summary: 'PostgreSQL 16 relational model, EF Core fluent mappings, indexes, repositories (ISP), and Testcontainers testing.',
    content: `# Step 02: PostgreSQL Persistence & Migrations

## 1. Objective
Implement the relational database schema in PostgreSQL 16 according to \`docs/02_DATABASE_SCHEMA.md\`, setup migrations, configure connection pooling, and establish clean repository interfaces adhering to the Interface Segregation Principle (ISP).

---

## 2. Relational Schema Mapping
Implement the following core entities via Entity Framework Core Fluent API mappings:

| Domain Entity | PostgreSQL Table | Primary Key | Key Invariants & Indexes |
|---|---|---|---|
| \`Reminder\` | \`reminders\` | \`UUID\` | \`user_id\`, \`title\`, \`is_active\`, \`created_at\` |
| \`ReminderSchedule\` | \`reminder_schedules\` | \`UUID\` | 1-to-1 with reminder, \`interval_type\`, \`calculation_base\` |
| \`EscalationRule\` | \`reminder_escalation_rules\` | \`UUID\` | 1-to-many, \`step_number\` (unique per reminder), \`delay_minutes\` |
| \`ReminderOccurrence\` | \`reminder_occurrences\` | \`UUID\` | Index: \`(status, scheduled_time)\`, \`(reminder_id, status)\` |
| \`NotificationLog\` | \`notification_logs\` | \`UUID\` | FK to occurrence, \`channel_id\`, \`fcm_message_id\`, \`sent_at\` |
| \`DeviceRegistration\` | \`device_registrations\` | \`UUID\` | \`fcm_token\` (unique), \`device_name\`, \`last_active_at\` |`
  },
  {
    id: 'PLAN_03_RECURRENCE',
    filename: '03_RECURRENCE_CALCULATIONS_ENGINE.md',
    title: 'Step 03: Recurrence Calculations Engine',
    badge: 'Step 03',
    category: 'Engines',
    filePath: '/implementation_plan/03_RECURRENCE_CALCULATIONS_ENGINE.md',
    summary: 'Pure domain calculation engine for Fixed and Floating schedules, leap year clamping, timezone shifts, and unit tests.',
    content: `# Step 03: Recurrence Calculations Engine

## 1. Objective
Implement the pure, deterministic recurrence calculation engine according to \`docs/04_RECURRENCE_ENGINE.md\`. This is the core domain calculation that powers both **Fixed Schedules** (e.g., medication every 3 days at 08:00) and **Floating Schedules** (e.g., washing machine maintenance every 2 months from actual completion).

---

## 2. SOLID Architecture & Strategy Pattern
Avoid massive \`switch\` statements by implementing the Strategy Pattern:

\`\`\`csharp
public interface IRecurrenceStrategy
{
    CalculationBase CalculationBase { get; }
    DateTimeOffset CalculateNextDue(
        RecurrenceRule rule, 
        DateTimeOffset scheduledTime, 
        DateTimeOffset? completedTime, 
        string userTimeZoneId);
}
\`\`\`

1. **\`FixedRecurrenceStrategy\`** (\`FromScheduledDate\`):
   - Computes next trigger strictly from \`scheduledTime + (interval * unit)\`.
2. **\`FloatingRecurrenceStrategy\`** (\`FromCompletion\`):
   - Computes next trigger strictly from \`(completedTime ?? scheduledTime) + (interval * unit)\`.`
  },
  {
    id: 'PLAN_04_ESCALATION',
    filename: '04_ESCALATION_AND_SNOOZE_LADDER.md',
    title: 'Step 04: Escalation & Snooze State Machine',
    badge: 'Step 04',
    category: 'Engines',
    filePath: '/implementation_plan/04_ESCALATION_AND_SNOOZE_LADDER.md',
    summary: 'Snooze progression (+1h, +2h, +24h), anti-storm protections, quiet hours postponement, and state transition logic.',
    content: `# Step 04: Escalation & Snooze State Machine

## 1. Objective
Implement the escalation ladder and snooze state machine according to \`docs/05_PUSH_ESCALATION.md\`. When a user does not mark a reminder as completed, the system progressively escalates notifications (+1h, +2h, +24h) until acknowledged, with anti-storm protections and quiet hours filtering.

---

## 2. Domain State Machine & Escalation Rules
An active \`ReminderOccurrence\` transitions through distinct states:

\`\`\`
[ Scheduled / Pending ]
         │ (Time passes past due date without completion)
         ▼
    [ Overdue ]
         │
         ├── User clicks [ Snooze (e.g., 60m) ] ───► [ Snoozed ] ──► (Re-enters Overdue at due time)
         │
         ├── No user interaction ──────────────────► [ Escalating ] (Step 1 -> Step 2 -> Step 3)
         │
         ├── User clicks [ Mark Completed ] ───────► [ Completed ] (Triggers next recurrence calculation)
         │
         └── User clicks [ Dismiss ] ──────────────► [ Dismissed ] (Terminates occurrence lifecycle)
\`\`\``
  },
  {
    id: 'PLAN_05_SCHEDULING',
    filename: '05_SCHEDULING_AND_BACKGROUND_WORKERS.md',
    title: 'Step 05: Quartz.NET Schedulers & Workers',
    badge: 'Step 05',
    category: 'Engines',
    filePath: '/implementation_plan/05_SCHEDULING_AND_BACKGROUND_WORKERS.md',
    summary: 'Quartz background jobs, occurrence generation, due detection, idempotent row-level locking, and concurrency tests.',
    content: `# Step 05: Quartz.NET Schedulers & Background Workers

## 1. Objective
Implement background scheduling and automated recurring workers using Quartz.NET in .NET 9. Workers scan for due occurrences, advance the recurrence horizon, evaluate overdue reminders for escalation, and trigger push dispatching idempotently.

---

## 2. Background Jobs Architecture
Separate concerns across three lightweight jobs:

\`\`\`
┌────────────────────────────────────────────────────────┐
│                   Quartz.NET Scheduler                 │
└────────────────────────────────────────────────────────┘
          │                    │                   │
  (Every 6 Hours)       (Every 1 Minute)    (Every 5 Minutes)
          ▼                    ▼                   ▼
┌──────────────────┐  ┌──────────────────┐ ┌──────────────────┐
│ OccurrenceGenJob │  │ DueDetectorJob   │ │ EscalationJob    │
│ Generates next   │  │ Dispatches FCM   │ │ Progresses       │
│ occurrences for  │  │ for newly due    │ │ overdue snoozes  │
│ active schedules │  │ occurrences      │ │ and escalations  │
└──────────────────┘  └──────────────────┘ └──────────────────┘
\`\`\``
  },
  {
    id: 'PLAN_06_API',
    filename: '06_CORE_REST_API_AND_SECURITY.md',
    title: 'Step 06: REST API, Zero Trust & Security',
    badge: 'Step 06',
    category: 'Data & API',
    filePath: '/implementation_plan/06_CORE_REST_API_AND_SECURITY.md',
    summary: 'ASP.NET Core REST endpoints, FluentValidation, ProblemDetails, Cloudflare Zero Trust authentication, and integration tests.',
    content: `# Step 06: REST API, Zero Trust & Security Integration

## 1. Objective
Implement the ASP.NET Core Web API endpoints defined in \`docs/03_API_ENDPOINTS.md\` with strict input validation (FluentValidation), RFC 7807 \`ProblemDetails\` error formatting, Cloudflare Zero Trust header authentication, and JWT Bearer security.

---

## 2. API Endpoints Contract Overview

| Endpoint | Method | Purpose | Key DTOs / Status |
|---|---|---|---|
| \`/api/v1/reminders\` | \`GET\` | List all reminders (paginated, filtered by active) | \`ReminderResponseDto[]\` |
| \`/api/v1/reminders\` | \`POST\` | Create new reminder + recurrence + escalation | \`CreateReminderRequest\`, \`201 Created\` |
| \`/api/v1/reminders/{id}\` | \`PUT\` | Update reminder schedule or metadata | \`UpdateReminderRequest\`, \`200 OK\` |
| \`/api/v1/occurrences/due\` | \`GET\` | Get currently due/overdue items for user | \`OccurrenceDto[]\` |
| \`/api/v1/occurrences/{id}/complete\` | \`POST\` | Quick action: mark completed & advance | \`CompleteOccurrenceRequest\`, \`200 OK\` |
| \`/api/v1/occurrences/{id}/snooze\` | \`POST\` | Quick action: snooze occurrence | \`SnoozeOccurrenceRequest\`, \`200 OK\` |
| \`/api/v1/devices/register\` | \`POST\` | Register Android FCM device token | \`RegisterDeviceRequest\`, \`204 NoContent\` |`
  },
  {
    id: 'PLAN_07_FCM',
    filename: '07_PUSH_NOTIFICATIONS_AND_FCM.md',
    title: 'Step 07: Push Notifications & FCM Dispatcher',
    badge: 'Step 07',
    category: 'Architecture',
    filePath: '/implementation_plan/07_PUSH_NOTIFICATIONS_AND_FCM.md',
    summary: 'FCM HTTP v1 client, OAuth2 token provider, Android notification channels, custom audio paths, and delivery logs.',
    content: `# Step 07: Push Notifications & FCM Dispatcher

## 1. Objective
Implement the push notification delivery pipeline using the Google Firebase Cloud Messaging (FCM) HTTP v1 API according to \`docs/05_PUSH_ESCALATION.md\`. This includes high-priority payloads, Android notification channel assignment, custom sounds, action buttons, and dead token cleanup.

---

## 2. Notification Dispatch Flow

\`\`\`
[ DueOccurrenceDispatcherJob ]
         │
         ▼
[ INotificationDispatcher ]
         │
         ├── 1. Fetches active device FCM tokens for user from \`device_registrations\`
         ├── 2. Formats FCM v1 JSON payload (priority="high", channel_id, sound)
         ├── 3. Sends batch requests via HTTP v1 to Google FCM endpoint
         └── 4. Records result in \`notification_logs\`:
                   ├── Success -> Store \`fcm_message_id\`, timestamp
                   └── Token Expired / Unregistered -> Automatically prune token from DB
\`\`\``
  },
  {
    id: 'PLAN_08_CALENDAR',
    filename: '08_CALENDAR_SYNC_INTEGRATION.md',
    title: 'Step 08: Calendar Sync & iCal Feed',
    badge: 'Step 08',
    category: 'Architecture',
    filePath: '/implementation_plan/08_CALENDAR_SYNC_INTEGRATION.md',
    summary: 'Dynamic iCal (.ics) RFC 5545 subscription feed with secret tokens, revocation, and Google Calendar API synchronization.',
    content: `# Step 08: Calendar Sync & iCal Feed Integration

## 1. Objective
Implement the calendar integration features detailed in \`docs/08_GOOGLE_CALENDAR.md\`. This includes a secure, read-only dynamic iCal (\`.ics\`) subscription feed for universal calendar sync, alongside the interface architecture for optional Google Calendar API v3 direct synchronization.

---

## 2. iCal Feed Architecture

\`\`\`
[ User Calendar Client ] (Google Calendar / Apple Calendar / Thunderbird)
          │
          │ Periodic HTTP GET /api/v1/calendar/feed/{secret_token}.ics
          ▼
[ CalendarFeedEndpoint ]
          │
          ├── 1. Validates \`secret_token\` against \`sync_tokens\` table in PostgreSQL
          ├── 2. Queries upcoming and recent occurrences (Window: -30 to +90 days)
          ├── 3. Formats RFC 5545 \`.ics\` payload via \`ICalendarFeedFormatter\`
          └── 4. Returns \`text/calendar; charset=utf-8\` with Cache-Control headers
\`\`\``
  },
  {
    id: 'PLAN_09_ANDROID',
    filename: '09_ANDROID_APP_IMPLEMENTATION.md',
    title: 'Step 09: Android Client Implementation',
    badge: 'Step 09',
    category: 'Clients',
    filePath: '/implementation_plan/09_ANDROID_APP_IMPLEMENTATION.md',
    summary: 'Kotlin + Compose mobile client, Notification Channels, custom sound WAV files, quick action BroadcastReceivers.',
    content: `# Step 09: Android Client Implementation

## 1. Objective
Implement the lightweight Android client application (Kotlin / Jetpack Compose) according to \`docs/06_ANDROID_CLIENT.md\`. The client receives FCM high-priority notifications, plays distinct custom audio alerts via Notification Channels, and provides immediate Quick Actions directly from the notification shade without requiring the app to open.

---

## 2. Android Client Component Architecture

\`\`\`
[ FCM High-Priority Message ]
          │
          ▼
[ RemindCoreFirebaseMessagingService ]
          │
          ├── 1. Reads \`channel_id\`, \`occurrence_id\`, \`title\`, \`sound\`
          ├── 2. Builds Android Notification with custom Sound Uri (\`res/raw/*\`)
          ├── 3. Attaches PendingIntents for Quick Actions:
          │        ├── [ Complete ] ──► CompleteActionReceiver
          │        └── [ Snooze 1h ] ──► SnoozeActionReceiver
          └── 4. Posts to \`NotificationManagerCompat\`
\`\`\``
  },
  {
    id: 'PLAN_10_WEB',
    filename: '10_WEB_CLIENT_PANEL.md',
    title: 'Step 10: Web Management Client Panel',
    badge: 'Step 10',
    category: 'Clients',
    filePath: '/implementation_plan/10_WEB_CLIENT_PANEL.md',
    summary: 'React SPA dashboard, interactive recurrence visualizer, escalation ladder builder, web audio tester, and agenda view.',
    content: `# Step 10: Web Management Client Panel

## 1. Objective
Implement the comprehensive Web Management Dashboard using React, TypeScript, and Tailwind CSS according to \`docs/07_WEB_CLIENT.md\`. The web portal allows configuring reminders with visual schedule preview, tuning escalation ladders, testing audio alerts, and managing occurrences.

---

## 2. Web UI Component Architecture

\`\`\`
[ App Layout & Navigation ]
         ├── [ Agenda & Due View ] ────────► Due occurrence cards with 1-click Complete/Snooze
         ├── [ Reminder Configurator ] ────► Visual Recurrence Builder (Fixed vs. Floating)
         │                                   ├── Escalation Ladder Step Manager
         │                                   └── Custom Sound Tester & Channel Selector
         ├── [ Timeline & History ] ───────► Occurrence audit trail & completion statistics
         └── [ Integrations & Settings ] ──► Calendar Feed URL Generator & Device Tokens
\`\`\``
  },
  {
    id: 'PLAN_11_DEPLOY',
    filename: '11_DOCKER_DEPLOYMENT_AND_CLOUDFLARE.md',
    title: 'Step 11: Docker Deployment & Cloudflare Tunnel',
    badge: 'Step 11',
    category: 'DevOps & Discussions',
    filePath: '/implementation_plan/11_DOCKER_DEPLOYMENT_AND_CLOUDFLARE.md',
    summary: 'Docker Compose stack (API, Web, DB, cloudflared), zero open ports policy, automated pg_dump backups, and smoke testing.',
    content: `# Step 11: Docker Containerization & Cloudflare Deployment

## 1. Objective
Containerize the entire RemindCore ecosystem using Docker Compose, establish automated database backups, and connect the home server to Cloudflare Edge via \`cloudflared\` without opening any incoming ports on the home router according to \`docs/09_SECURITY_AND_DEPLOYMENT.md\`.

---

## 2. Production Docker Architecture

\`\`\`
Internet (HTTPS)
      │
      ▼
[ Cloudflare Zero Trust Edge ]
      │ (Encrypted Outbound Tunnel)
      ▼
[ cloudflared daemon ] (Docker Container)
      │ (Internal Docker Network \`remindcore-net\`)
      ├──► [ Web Portal ] (Nginx Alpine + React build)
      ├──► [ Backend API ] (.NET 9 ASP.NET Core Web API)
      │         │
      │         └──► [ PostgreSQL 16 DB ] (Internal only, not exposed to host)
      │
      └──► [ Backup Cron Job ] (Nightly pg_dump with 14-day retention)
\`\`\``
  }
];
