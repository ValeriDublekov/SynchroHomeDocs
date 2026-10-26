# Step 08: Calendar Sync & iCal Feed Integration

## 1. Objective
Implement the calendar integration features detailed in `docs/08_GOOGLE_CALENDAR.md`. This includes a secure, read-only dynamic iCal (`.ics`) subscription feed for universal calendar sync, alongside the interface architecture for optional Google Calendar API v3 direct synchronization.

---

## 2. iCal Feed Architecture

```
[ User Calendar Client ] (Google Calendar / Apple Calendar / Thunderbird)
          │
          │ Periodic HTTP GET /api/v1/calendar/feed/{secret_token}.ics
          ▼
[ CalendarFeedEndpoint ]
          │
          ├── 1. Validates `secret_token` against `sync_tokens` table in PostgreSQL
          ├── 2. Queries upcoming and recent occurrences (Window: -30 to +90 days)
          ├── 3. Formats RFC 5545 `.ics` payload via `ICalendarFeedFormatter`
          └── 4. Returns `text/calendar; charset=utf-8` with Cache-Control headers
```

---

## 3. SOLID & Performance Design
1. **Lightweight RFC 5545 Formatter (`ICalendarFeedFormatter`)**:
   - Stream directly to HTTP response output using `Utf8JsonWriter` or `StreamWriter` to avoid large in-memory string allocations for high-frequency calendar crawlers.
2. **Security & Token Rotation**:
   - The feed URL must never expose user passwords or JWTs. The secret token is stored as a SHA-256 hash in `sync_tokens`.
   - Users can invalidate and regenerate their calendar feed URL with a single click in the Web UI.

---

## 4. Key Deliverables
- [ ] Implement `sync_tokens` repository and token generation logic (`RandomNumberGenerator`).
- [ ] Implement `ICalendarFeedFormatter` mapping `ReminderOccurrence` to `VEVENT` with `UID`, `SUMMARY`, `DTSTART`, `STATUS`, and `VALARM`.
- [ ] Implement `GET /api/v1/calendar/feed/{token}.ics` endpoint with `ETag` and `Last-Modified` support.
- [ ] Implement extensible `ICalendarSyncService` interface for optional Google Calendar API v3 two-way sync.

---

## 5. Automated Tests
- **Unit & Contract Tests**:
  - `ICalFeedFormatter_GeneratesValidRfc5545Events`: Validates UID determinism, timezone formatting, and alarm trigger tags.
  - `CalendarFeedEndpoint_InvalidToken_Returns404Or401`: Verifies that revoked or non-existent tokens are denied.
- **Verification Command**:
  ```bash
  dotnet test tests/RemindCore.UnitTests --filter FullyQualifiedName~CalendarTests
  ```

---

## 6. Living Documentation Checklist
- Add `docs/integrations/CALENDAR_SYNC_SPEC.md` (under 120 lines) documenting the RFC 5545 property mappings, cache invalidation strategies, and token revocation lifecycle.
