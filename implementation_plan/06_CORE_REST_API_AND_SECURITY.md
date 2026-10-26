# Step 06: REST API, Zero Trust & Security Integration

## 1. Objective
Implement the ASP.NET Core Web API endpoints defined in `docs/03_API_ENDPOINTS.md` with strict input validation (FluentValidation), RFC 7807 `ProblemDetails` error formatting, Cloudflare Zero Trust header authentication, and JWT Bearer security.

---

## 2. API Endpoints Contract Overview

| Endpoint | Method | Purpose | Key DTOs / Status |
|---|---|---|---|
| `/api/v1/reminders` | `GET` | List all reminders (paginated, filtered by active) | `ReminderResponseDto[]` |
| `/api/v1/reminders` | `POST` | Create new reminder + recurrence + escalation | `CreateReminderRequest`, `201 Created` |
| `/api/v1/reminders/{id}` | `PUT` | Update reminder schedule or metadata | `UpdateReminderRequest`, `200 OK` |
| `/api/v1/occurrences/due` | `GET` | Get currently due/overdue items for user | `OccurrenceDto[]` |
| `/api/v1/occurrences/{id}/complete` | `POST` | Quick action: mark completed & advance | `CompleteOccurrenceRequest`, `200 OK` |
| `/api/v1/occurrences/{id}/snooze` | `POST` | Quick action: snooze occurrence | `SnoozeOccurrenceRequest`, `200 OK` |
| `/api/v1/devices/register` | `POST` | Register Android FCM device token | `RegisterDeviceRequest`, `204 NoContent` |

---

## 3. SOLID & API Design Standards
1. **Vertical Slice / Clean Controllers**: Keep controllers ultra-thin (maximum 4–6 lines per action). Delegate processing to Command/Query Handlers (MediatR or lightweight typed service handlers).
2. **Input Validation**: Use FluentValidation validators (`CreateReminderRequestValidator`) injected automatically. Never write manual `if (string.IsNullOrEmpty(...))` in controllers.
3. **Dual Authentication Pipeline**:
   - **Cloudflare Zero Trust**: Middleware inspects `Cf-Access-Authenticated-User-Email` and `Cf-Access-Jwt-Assertion` headers (validated against Cloudflare public keys).
   - **JWT Bearer / API Keys**: Allows Android native client and background webhooks to authenticate securely via tokens.

---

## 4. Key Deliverables
- [ ] Implement API Controllers or Minimal API Endpoints in `RemindCore.Api`.
- [ ] Configure `ProblemDetails` exception handler with proper HTTP status code mapping (400, 404, 409, 422, 500).
- [ ] Implement `CloudflareAccessAuthenticationHandler` and JWT authentication.
- [ ] Implement `FluentValidation` rules for all create/update requests.

---

## 5. Automated Tests
- **Integration Tests (`WebApplicationFactory<Program>`)**:
  - `CreateReminder_ValidPayload_Returns201AndOccurrence`: End-to-end integration test creating a reminder and checking database occurrence creation.
  - `CompleteOccurrence_AdvancesFloatingRecurrence`: Completes an occurrence and verifies the next occurrence due date updates according to completion time.
  - `UnauthorizedRequest_MissingHeadersOrJwt_Returns401`: Verifies that requests without Zero Trust or JWT headers are rejected.
- **Verification Command**:
  ```bash
  dotnet test tests/RemindCore.IntegrationTests --filter Category=Api
  ```

---

## 6. Living Documentation Checklist
- Add `docs/api/SECURITY_AUTH_FLOW.md` (under 140 lines) documenting how Cloudflare Zero Trust headers and JWT tokens are mapped to the application `ClaimsPrincipal`.
