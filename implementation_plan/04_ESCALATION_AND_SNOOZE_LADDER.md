# Step 04: Escalation & Snooze State Machine

## 1. Objective
Implement the escalation ladder and snooze state machine according to `docs/05_PUSH_ESCALATION.md`. When a user does not mark a reminder as completed, the system progressively escalates notifications (+1h, +2h, +24h) until acknowledged, with anti-storm protections and quiet hours filtering.

---

## 2. Domain State Machine & Escalation Rules
An active `ReminderOccurrence` transitions through distinct states:

```
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
```

---

## 3. SOLID & Class Responsibilities
Keep each class under 35 lines with single responsibility:

1. **`EscalationLadderCalculator`**:
   - Pure domain calculator. Takes the list of `EscalationRule` and the `current_step_number`, returns the next step and delay in minutes.
   - Caps at `max_escalation_steps` to prevent infinite push storms.
2. **`QuietHoursPolicy`**:
   - Enforces user quiet hours (e.g. 23:00 to 07:00).
   - If a calculated escalation falls inside quiet hours, shifts the notification trigger to the end of quiet hours (e.g., 07:15 AM).
3. **`SnoozeActionHandler`**:
   - Handles manual snooze overrides (`15m`, `60m`, or custom duration). Updates `snoozed_until` on the occurrence.

---

## 4. Key Deliverables
- [ ] Implement `EscalationLadderCalculator` with pure functions.
- [ ] Implement `QuietHoursPolicy` supporting arbitrary timezone boundaries.
- [ ] Implement `OccurrenceStatus` state transitions with domain event emissions (`OccurrenceEscalatedEvent`, `OccurrenceCompletedEvent`).
- [ ] Implement unit tests validating step calculation, boundary clamping, and quiet hour postponement.

---

## 5. Automated Tests
- **Unit Tests**:
  - `EscalationLadder_StepProgression`: Verifies progression from Step 1 (+60m) $\rightarrow$ Step 2 (+120m) $\rightarrow$ Step 3 (+1440m).
  - `EscalationLadder_MaxStepsReached`: Verifies that once the ladder exhausts configured steps, no further push triggers are scheduled until manual interaction.
  - `QuietHours_NotificationPostponement`: Verifies that an escalation calculated for 02:30 AM is postponed to 07:00 AM next morning.
- **Verification Command**:
  ```bash
  dotnet test tests/RemindCore.UnitTests --filter FullyQualifiedName~EscalationTests
  ```

---

## 6. Living Documentation Checklist
- Add `docs/domain/ESCALATION_STATE_MACHINE.md` (under 130 lines) documenting state transition tables, quiet-hours formulas, and relationships to `reminder_escalation_rules` table.
