# Step 09: Android Client Implementation

## 1. Objective
Implement the lightweight Android client application (Kotlin / Jetpack Compose) according to `docs/06_ANDROID_CLIENT.md`. The client receives FCM high-priority notifications, plays distinct custom audio alerts via Notification Channels, and provides immediate Quick Actions directly from the notification shade without requiring the app to open.

---

## 2. Android Client Component Architecture

```
[ FCM High-Priority Message ]
          │
          ▼
[ RemindCoreFirebaseMessagingService ]
          │
          ├── 1. Reads `channel_id`, `occurrence_id`, `title`, `sound`
          ├── 2. Builds Android Notification with custom Sound Uri (`res/raw/*`)
          ├── 3. Attaches PendingIntents for Quick Actions:
          │        ├── [ Complete ] ──► CompleteActionReceiver
          │        └── [ Snooze 1h ] ──► SnoozeActionReceiver
          └── 4. Posts to `NotificationManagerCompat`
```

---

## 3. SOLID & Mobile Engineering Practices
1. **Direct Action Receivers (`BroadcastReceiver`)**:
   - `CompleteActionReceiver` and `SnoozeActionReceiver` invoke the backend API via a dedicated repository in a background thread (`WorkManager` or coroutine) and immediately dismiss or update the notification shade.
2. **Channel Registry (`NotificationChannelManager`)**:
   - Centralizes the creation of Android 8.0+ (API 26) notification channels (`channel_medical`, `channel_household`, `channel_urgent`) with their assigned `AudioAttributes` and vibration patterns on first launch.
3. **Network Resilience**:
   - If user triggers [Complete] while offline, `WorkManager` enqueues the request and syncs it when connectivity is restored.

---

## 4. Key Deliverables
- [ ] Initialize Android project with Kotlin 2.0+ and Jetpack Compose.
- [ ] Bundle custom audio wav files into `app/src/main/res/raw/`.
- [ ] Implement `NotificationChannelManager` initializing all custom sound channels.
- [ ] Implement `RemindCoreFirebaseService` extending `FirebaseMessagingService`.
- [ ] Implement `CompleteActionReceiver` and `SnoozeActionReceiver`.
- [ ] Implement a clean, single-screen Compose UI: Due Occurrences List + Server Config + Sound Tester.

---

## 5. Automated Tests
- **Unit Tests (JUnit 5 + Robolectric / MockK)**:
  - `NotificationPayloadParserTest`: Verifies data extraction from FCM remote message.
  - `ActionReceiverTest`: Verifies that clicking [Complete] dispatches the correct API request with the proper occurrence ID.
- **Verification Command**:
  ```bash
  ./gradlew testDebugUnitTest
  ```

---

## 6. Living Documentation Checklist
- Add `docs/mobile/ANDROID_NOTIFICATION_GUIDE.md` (under 130 lines) documenting channel IDs, audio resource bindings, FCM payload specifications, and background permission setup.
