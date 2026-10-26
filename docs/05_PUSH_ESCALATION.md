# Архитектурен План: Push Известия и Инкрементална Ескалация
## Документ: 05_PUSH_ESCALATION.md

Този документ специфицира архитектурата за доставка на Push известия през Firebase Cloud Messaging (FCM) и алгоритъма за инкрементално повторно напомняне (Snooze & Escalation Ladder).

---

### 1. Изискването за Инкрементална Ескалация

Потребителско изискване:
> *"Ще искам да получавам push notifications, с повторно напомняне след някакво инкрементално време. Например първия път след 1 час, втория път след още 2 часа и след това на следващия ден"*

#### Структура на Стълбицата (Escalation Ladder)

| Етап | Време на задействане | Тон / Сигнал | Потребителски текст |
|---|---|---|---|
| **0. Първичен тригър** | В зададения час (напр. 09:00) | Избраният звук за категорията | *"Време е за: Профилактика на пералня"* |
| **1. Първа ескалация** | +1 час (10:00) | Лек звънец | *"Напомняне (+1ч): Профилактика на пералня все още не е отбелязана"* |
| **2. Втора ескалация** | +2 часа след предходната (12:00) | По-настоятелен сигнал | *"Важно (+3ч общо): Не забравяйте профилактиката на пералня"* |
| **3. Трета ескалация** | На следващия ден в 09:00 | Обобщаващ тон | *"Просрочена задача: Профилактика на пералня от вчера"* |

Ако потребителят в който и да е момент натисне **"Маркирай Изпълнено"**, следващите ескалации незабавно се анулират.

---

### 2. Архитектура на FCM HTTP v1 съобщенията

За да се гарантира прецизно събуждане на Android устройството дори в **Doze Mode (Deep Sleep)**, сървърът изпраща съобщение с директива `priority: high` и комбиниран `data` payload:

#### Примерна заявка от .NET Backend към FCM HTTP v1:

```json
{
  "message": {
    "token": "DEVICE_FCM_TOKEN",
    "android": {
      "priority": "HIGH",
      "notification": {
        "title": "Време е за лекарство (Сутрешна доза)",
        "body": "Натиснете за детайли или маркирайте като прието",
        "channel_id": "remindcore_medical",
        "sound": "sound_medical_alarm",
        "click_action": "OPEN_REMINDER_INSTANCE",
        "notification_count": 1
      }
    },
    "data": {
      "instance_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "reminder_id": "7fa41249-f007-44a6-95f0-6b61a9de4f2c",
      "escalation_step": "0",
      "sound_profile": "medical_alarm",
      "action_payload": "NEED_CONFIRMATION"
    }
  }
}
```

---

### 3. Интерактивни Бутони в Android лентата (Notification Action Buttons & Smart Quick Snooze)

Нотификацията в Android предоставя преки екшън бутони директно в системната лента:

1. **[✓ Изпълнено] (`ACTION_COMPLETE`)**:
   - Изпраща фонова заявка към `POST /api/instances/{id}/complete` с локален `idempotencyKey`.
   - Затваря нотификацията от екрана и спира бъдещите ескалации.
   - Сървърът записва `completed_at` и планира следващата дата.

2. **[+1 час] (`ACTION_SNOOZE_1H`)**:
   - Изпраща `POST /api/instances/{id}/snooze` с `preset: "PlusOneHour"`.
   - Скрива нотификацията и я реактивира след точно 60 минути.

3. **[Довечера / Утре] (`ACTION_SNOOZE_SMART`)**:
   - Динамичен контекстен бутон:
     - Ако текущият час е преди 17:00 ч. $\rightarrow$ бутонът е **[Довечера 20:00]** (`preset: "TonightEvening2000"`).
     - Ако текущият час е след 17:00 ч. $\rightarrow$ бутонът е **[Утре сутрин 09:00]** (`preset: "TomorrowMorning0900"`).
   - Премахва нуждата от отваряне на приложението за ръчно въвеждане на час!

---

### 4. Background Job в .NET: `EscalationWorker`

В ASP.NET Core се регистрира фонов сървис (Quartz.NET или `BackgroundService`), който проверява всяка минута:

```sql
SELECT id, reminder_id, current_escalation_step, scheduled_at 
FROM reminder_instances
WHERE status IN ('Pending', 'Triggered') 
  AND next_escalation_at <= CURRENT_TIMESTAMP
FOR UPDATE SKIP LOCKED;
```

Когато открие инстанция за ескалация:
1. Инкрементира `current_escalation_step`.
2. Изчислява следващия `next_escalation_at` от масива `escalation_policies.steps_json`.
3. Извиква `FcmDispatcher.SendPushNotificationAsync(...)`.
4. Ако са изчерпани всички стъпки от стълбицата, маркира инстанцията с флаг за максимална ескалация (за да не спами безкрайно).
