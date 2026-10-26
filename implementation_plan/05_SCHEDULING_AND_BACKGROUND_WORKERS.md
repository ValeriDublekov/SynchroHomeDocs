# Step 05: Quartz.NET Schedulers & Background Workers

## 1. Objective
Implement background scheduling and automated recurring workers using Quartz.NET in .NET 9. Workers scan for due occurrences, advance the recurrence horizon, evaluate overdue reminders for escalation, and trigger push dispatching idempotently.

---

## 2. Background Jobs Architecture
Separate concerns across three lightweight jobs:

```
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
```

---

## 3. SOLID & Resilience Patterns
1. **Idempotency with Database Locking**:
   - Use `SELECT ... FOR UPDATE SKIP LOCKED` or an atomic conditional update (`UPDATE reminder_occurrences SET status = 'Triggered' WHERE id = @id AND status = 'Pending'`) to guarantee that clustered or concurrent worker instances never double-dispatch a notification.
2. **Lean Job Classes**:
   - Quartz Job classes (`IJob`) must only contain 10–15 lines of code: resolve the domain service from DI, invoke `service.ExecuteAsync(cancellationToken)`, and report execution metrics.
3. **Graceful Shutdown**:
   - Support `CancellationToken` in all database queries and worker loops.

---

## 4. Key Deliverables
- [ ] Configure Quartz.NET with `Microsoft.Extensions.Hosting` integration and PostgreSQL persistent job store (or configured in-memory with DB lease locks).
- [ ] Implement `OccurrenceGeneratorWorker`: creates initial occurrence if none exists, advances next occurrence when current is completed.
- [ ] Implement `DueOccurrenceDispatcherJob`: polls for `status IN ('Pending', 'Snoozed') AND scheduled_time <= NOW()` and publishes to `INotificationDispatcher`.
- [ ] Implement `EscalationLadderJob`: evaluates overdue items against `reminder_escalation_rules`.

---

## 5. Automated Tests
- **Integration Tests (Quartz & DB)**:
  - `OccurrenceGenerator_GeneratesUpcomingOccurrences`: Verifies that an active recurring reminder without upcoming occurrences has a new occurrence created.
  - `ConcurrentWorkers_NeverDoubleDispatch`: Simulates 2 concurrent worker calls on the same due occurrence; verifies only 1 push event is queued.
- **Verification Command**:
  ```bash
  dotnet test tests/RemindCore.IntegrationTests --filter Category=Scheduler
  ```

---

## 6. Living Documentation Checklist
- Add `docs/architecture/BACKGROUND_JOBS.md` (under 120 lines) documenting job frequencies, database query predicates, retry backoff behaviors, and concurrency locking mechanisms.
