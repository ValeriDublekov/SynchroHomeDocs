# Step 07: Push Notifications & FCM Dispatcher

## 1. Objective
Implement the push notification delivery pipeline using the Google Firebase Cloud Messaging (FCM) HTTP v1 API according to `docs/05_PUSH_ESCALATION.md`. This includes high-priority payloads, Android notification channel assignment, custom sounds, action buttons, and dead token cleanup.

---

## 2. Notification Dispatch Flow

```
[ DueOccurrenceDispatcherJob ]
         │
         ▼
[ INotificationDispatcher ]
         │
         ├── 1. Fetches active device FCM tokens for user from `device_registrations`
         ├── 2. Formats FCM v1 JSON payload (priority="high", channel_id, sound)
         ├── 3. Sends batch requests via HTTP v1 to Google FCM endpoint
         └── 4. Records result in `notification_logs`:
                   ├── Success -> Store `fcm_message_id`, timestamp
                   └── Token Expired / Unregistered -> Automatically prune token from DB
```

---

## 3. SOLID & Resilience Architecture
1. **`IFcmClient` Abstraction**:
   - Decouple Google API communication behind `IFcmClient` to allow mocking in unit and integration tests without network access.
2. **Payload Builder (`FcmPayloadBuilder`)**:
   - Pure factory responsible solely for constructing the Android-compliant notification structure (Notification payload + Data payload with `occurrence_id`, `reminder_id`, and `sound`).
3. **Transient Fault Handling (Polly)**:
   - Configure exponential backoff retry for HTTP 5xx and 429 errors from FCM.

---

## 4. Key Deliverables
- [ ] Implement `GoogleServiceAccountTokenProvider` with OAuth2 Bearer token caching.
- [ ] Implement `FcmNotificationClient` targeting `https://fcm.googleapis.com/v1/projects/{projectId}/messages:send`.
- [ ] Configure Android-specific payload properties: `channel_id`, `priority: "high"`, `sound: "reminder_medical.wav"`.
- [ ] Implement automatic removal of stale tokens when FCM returns `UNREGISTERED` or `INVALID_ARGUMENT`.

---

## 5. Automated Tests
- **Unit & Contract Tests**:
  - `FcmPayloadBuilder_BuildsCorrectPayload`: Verifies serialization contains `channel_id`, action keys, and high priority flags.
  - `FcmDispatcher_RemovesDeadTokens_OnUnregisteredResponse`: Verifies that a mocked 404/Unregistered error triggers deletion from `device_registrations`.
- **Verification Command**:
  ```bash
  dotnet test tests/RemindCore.UnitTests --filter FullyQualifiedName~FcmTests
  ```

---

## 6. Living Documentation Checklist
- Add `docs/infrastructure/FCM_CONTRACTS.md` (under 120 lines) documenting JSON payload structures, Android notification channels, custom audio file mappings, and error code handling.
