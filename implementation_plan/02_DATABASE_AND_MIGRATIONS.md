# Step 02: PostgreSQL Persistence & Migrations

## 1. Objective
Implement the relational database schema in PostgreSQL 16 according to `docs/02_DATABASE_SCHEMA.md`, setup migrations, configure connection pooling, and establish clean repository interfaces adhering to the Interface Segregation Principle (ISP).

---

## 2. Relational Schema Mapping
Implement the following core entities via Entity Framework Core Fluent API mappings (avoid data annotations on domain models):

| Domain Entity | PostgreSQL Table | Primary Key | Key Invariants & Indexes |
|---|---|---|---|
| `Reminder` | `reminders` | `UUID` | `user_id`, `title`, `is_active`, `created_at` |
| `ReminderSchedule` | `reminder_schedules` | `UUID` | 1-to-1 with reminder, `interval_type`, `calculation_base` |
| `EscalationRule` | `reminder_escalation_rules` | `UUID` | 1-to-many, `step_number` (unique per reminder), `delay_minutes` |
| `ReminderOccurrence` | `reminder_occurrences` | `UUID` | Index: `(status, scheduled_time)`, `(reminder_id, status)` |
| `NotificationLog` | `notification_logs` | `UUID` | FK to occurrence, `channel_id`, `fcm_message_id`, `sent_at` |
| `DeviceRegistration` | `device_registrations` | `UUID` | `fcm_token` (unique), `device_name`, `last_active_at` |

---

## 3. SOLID & Implementation Standards
1. **Repository Abstractions**: Create focused repository interfaces in `RemindCore.Application`:
   - `IReminderRepository`: `GetByIdAsync`, `ListActiveAsync`, `AddAsync`, `UpdateAsync`.
   - `IOccurrenceRepository`: `GetDueOccurrencesAsync`, `GetByIdAsync`, `UpdateStatusAsync`.
   Do not build bloated generic repositories that expose raw IQueryable to the presentation layer.
2. **Migrations Pipeline**: Keep EF Core migrations in `RemindCore.Infrastructure`. Maintain deterministic naming: `YYYYMMDD_InitialRemindCoreSchema.cs`.
3. **Optimistic Locking**: Include `xmin` or `version` column on `reminder_occurrences` to prevent concurrent race conditions during quick-action status updates.

---

## 4. Key Deliverables
- [ ] Implement `RemindCoreDbContext` with custom Value Conversions for Enums (stored as strings in PostgreSQL).
- [ ] Configure PostgreSQL UTC timestamp convention: `Npgsql.EnableLegacyTimestampBehavior = false`.
- [ ] Create initial EF Core migration replicating the DDL from `docs/02_DATABASE_SCHEMA.md`.
- [ ] Implement repositories in `RemindCore.Infrastructure.Persistence`.
- [ ] Configure `Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore` for PG health check.

---

## 5. Automated Tests
- **Integration Tests (Testcontainers)**:
  - `PostgreSqlPersistenceTests`: Spins up a real PostgreSQL 16 container, applies migrations, seeds a reminder with escalation rules, and verifies cascading delete behavior.
  - `OccurrenceQueryIndexTests`: Tests that querying due occurrences utilizes the composite index `(status, scheduled_time)`.
- **Verification Command**:
  ```bash
  dotnet test tests/RemindCore.IntegrationTests --filter Category=Database
  ```

---

## 6. Living Documentation Checklist
- Add `docs/architecture/DATABASE_MAP.md` (under 150 lines) mapping domain aggregate roots (`Reminder`) to physical database tables, foreign keys, and cascading deletion semantics.
