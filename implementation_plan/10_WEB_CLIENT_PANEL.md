# Step 10: Web Management Client Panel

## 1. Objective
Implement the comprehensive Web Management Dashboard using React, TypeScript, and Tailwind CSS according to `docs/07_WEB_CLIENT.md`. The web portal allows configuring reminders with visual schedule preview, tuning escalation ladders, testing audio alerts, and managing occurrences.

---

## 2. Web UI Component Architecture

```
[ App Layout & Navigation ]
         ├── [ Agenda & Due View ] ────────► Due occurrence cards with 1-click Complete/Snooze
         ├── [ Reminder Configurator ] ────► Visual Recurrence Builder (Fixed vs. Floating)
         │                                   ├── Escalation Ladder Step Manager
         │                                   └── Custom Sound Tester & Channel Selector
         ├── [ Timeline & History ] ───────► Occurrence audit trail & completion statistics
         └── [ Integrations & Settings ] ──► Calendar Feed URL Generator & Device Tokens
```

---

## 3. SOLID & Component Best Practices
1. **Single Responsibility Components**:
   - Keep components under 80 lines. Extract complex sub-elements into dedicated sub-components (e.g. `RecurrenceTypeSelector.tsx`, `EscalationStepList.tsx`, `AudioPreviewButton.tsx`).
2. **Custom Hooks for State & API**:
   - Separate UI rendering from server communication using custom hooks (`useReminders()`, `useDueOccurrences()`, `useCalendarFeed()`).
3. **Optimistic UI Updates**:
   - Marking an occurrence as completed immediately updates the local UI state while dispatching the background API request.

---

## 4. Key Deliverables
- [ ] Implement `RecurrenceConfigurator` with interactive live calculation preview (simulates next 3 occurrences).
- [ ] Implement `EscalationLadderBuilder` allowing addition/removal of snooze stages.
- [ ] Implement `AudioPreviewPlayer` using HTML5 Web Audio API for custom sound samples.
- [ ] Implement `CalendarFeedManager` with one-click copy and token regeneration.
- [ ] Connect all forms to backend REST endpoints via typed Axios/Fetch client.

---

## 5. Automated Tests
- **Unit & Component Tests (Vitest + React Testing Library)**:
  - `RecurrenceConfigurator.test.tsx`: Verifies that toggling between Fixed and Floating dynamically updates the explanation text and inputs.
  - `DueOccurrencesList.test.tsx`: Verifies that clicking [Complete] fires the mutation and displays a confirmation toast.
- **Verification Command**:
  ```bash
  npm run test
  ```

---

## 6. Living Documentation Checklist
- Add `docs/web/COMPONENT_HIERARCHY.md` (under 140 lines) documenting the frontend component tree, hook lifecycle contracts, and optimistic update rollback strategies.
