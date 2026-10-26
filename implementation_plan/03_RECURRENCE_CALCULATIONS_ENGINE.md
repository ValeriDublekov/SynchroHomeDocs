# Step 03: Recurrence Calculations Engine

## 1. Objective
Implement the pure, deterministic recurrence calculation engine according to `docs/04_RECURRENCE_ENGINE.md`. This is the core domain calculation that powers both **Fixed Schedules** (e.g., medication every 3 days at 08:00) and **Floating Schedules** (e.g., washing machine maintenance every 2 months from actual completion).

---

## 2. SOLID Architecture & Strategy Pattern
Avoid massive `switch` statements by implementing the Strategy Pattern:

```csharp
public interface IRecurrenceStrategy
{
    CalculationBase CalculationBase { get; }
    DateTimeOffset CalculateNextDue(
        RecurrenceRule rule, 
        DateTimeOffset scheduledTime, 
        DateTimeOffset? completedTime, 
        string userTimeZoneId);
}
```

1. **`FixedRecurrenceStrategy`** (`FromScheduledDate`):
   - Computes next trigger strictly from `scheduledTime + (interval * unit)`.
   - If computed date is in the past, advances iteratively or by modulo to ensure the next trigger is strictly in the future.
2. **`FloatingRecurrenceStrategy`** (`FromCompletion`):
   - Computes next trigger strictly from `(completedTime ?? scheduledTime) + (interval * unit)`.
   - Preserves user target time (e.g., `08:00:00`) in their configured IANA timezone (`Europe/Sofia`).
3. **`RecurrenceEngine` (Coordinator)**:
   - Resolves appropriate strategy via dictionary or factory.
   - Handles month-end clamping (e.g. Jan 31 + 1 month $\rightarrow$ Feb 28 / Feb 29 on leap years).

---

## 3. High-ROI Unit Test Suite
Because this module contains pure algorithmic business logic, unit tests must be exhaustive and cover all temporal edge cases:

| Test Case Name | Input Scenario | Expected Output | Rationale |
|---|---|---|---|
| `Fixed_IntervalDays_AdvancesCorrectly` | 3 days, scheduled 2026-10-01 08:00, completed 2026-10-02 | 2026-10-04 08:00 | Fixed schedule ignores completion time |
| `Floating_IntervalDays_CalculatesFromCompletion` | 3 days, scheduled 2026-10-01 08:00, completed 2026-10-04 14:00 | 2026-10-07 08:00 | Floating schedule adds 3 days to completion date |
| `MonthEnd_Jan31_PlusOneMonth_LeapYear` | 1 month, scheduled 2028-01-31 | 2028-02-29 08:00 | Feb has 29 days in 2028 leap year |
| `MonthEnd_Jan31_PlusOneMonth_NonLeapYear` | 1 month, scheduled 2026-01-31 | 2026-02-28 08:00 | Clamped to last valid day of month |
| `DST_AutumnShift_PreservesWallClockTime` | Daily at 08:00 across Europe/Sofia DST shift (Oct 25, 2026) | Wall clock remains 08:00 AM | UTC offset adjusts from +03:00 to +02:00 |

---

## 4. Key Deliverables
- [ ] Implement `RecurrenceRule` value object with immutability and invariant validations.
- [ ] Implement `IRecurrenceStrategy`, `FixedRecurrenceStrategy`, and `FloatingRecurrenceStrategy`.
- [ ] Implement `TimeZoneAdjuster` utility using `TimeZoneInfo.FindSystemTimeZoneById`.
- [ ] Implement comprehensive xUnit test suite (`RecurrenceEngineTests.cs`) with 20+ test scenarios.

---

## 5. Automated Tests
- **Unit Tests**:
  ```bash
  dotnet test tests/RemindCore.UnitTests --filter FullyQualifiedName~RecurrenceEngineTests
  ```

---

## 6. Living Documentation Checklist
- Add `docs/domain/RECURRENCE_MATRIX.md` (under 120 lines) documenting the algorithm decision tree, edge-case handling rules, and code references to `FixedRecurrenceStrategy.cs` and `FloatingRecurrenceStrategy.cs`.
