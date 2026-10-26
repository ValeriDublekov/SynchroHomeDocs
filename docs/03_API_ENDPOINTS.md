# Архитектурен План: Спецификация на REST API (.NET 9)
## Документ: 03_API_ENDPOINTS.md

Този документ дефинира всички REST API маршрути, входно-изходни DTO структури, кодове за грешки и авторизационни заглавки за **RemindCore Web API** (.NET 9).

---

### 1. Автентикация и Сигурност на Заявките

Всички защитени endpoints изискват HTTP заглавка:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```
Токенът съдържа:
- `sub`: `users.id` (UUID)
- `email`: потребителски имейл
- `exp`: валидност (по подразбиране 30 дни за мобилни устройства с рефреш механизъм).

---

### 2. Пълен списък на Endpoints

#### 2.1. Автентикация и Профил (`/api/auth`)

| Метод | Път | Описание | Достъп |
|---|---|---|---|
| `POST` | `/api/auth/google` | Размяна на Google ID Token срещу RemindCore JWT | Публичен |
| `GET` | `/api/auth/me` | Данни за логнатия потребител и часова зона | Authenticated |
| `PUT` | `/api/auth/timezone` | Промяна на потребителската часова зона (напр. 'Europe/Sofia') | Authenticated |

##### Пример: `POST /api/auth/google`
**Request Body**:
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI..."
}
```
**Response (200 OK)**:
```json
{
  "token": "remindcore_jwt_token_here",
  "expiresAt": "2026-11-25T10:00:00Z",
  "user": {
    "id": "e4b6c310-8b17-48f8-b4b3-762d3ad7a884",
    "email": "user@example.com",
    "displayName": "Иван Иванов",
    "timezone": "Europe/Sofia"
  }
}
```

---

#### 2.2. Управление на Напомняния (`/api/reminders`)

| Метод | Път | Описание |
|---|---|---|
| `GET` | `/api/reminders` | Списък с активни и архивирани напомняния (филтри по категория, статус) |
| `POST` | `/api/reminders` | Създаване на ново напомняне + генериране на първи инстанс |
| `GET` | `/api/reminders/{id}` | Детайли за конкретно напомняне и предстоящи инстанции |
| `PUT` | `/api/reminders/{id}` | Редактиране на параметри (заглавие, звук, правило) |
| `DELETE` | `/api/reminders/{id}` | Изтриване или меко архивиране |
| `PATCH` | `/api/reminders/{id}/toggle` | Бързо активиране / деактивиране (`isActive: true/false`) |

##### Пример: `POST /api/reminders`
**Request Body**:
```json
{
  "title": "Профилактика на пералня (Calgon / Почистване на филтър)",
  "description": "Пускане на 90-градусова празна програма с препарат за котлен камък.",
  "category": "Home",
  "soundProfileId": "appliance_service",
  "escalationPolicyId": "00000000-0000-0000-0000-000000000001",
  "syncWithGoogleCalendar": true,
  "recurrence": {
    "frequency": "IntervalMonths",
    "intervalValue": 2,
    "targetTime": "10:30:00",
    "calculationBase": "FromCompletion",
    "startDate": "2026-11-01"
  }
}
```

**Response (201 Created)**:
```json
{
  "id": "7fa41249-f007-44a6-95f0-6b61a9de4f2c",
  "title": "Профилактика на пералня (Calgon / Почистване на филтър)",
  "isActive": true,
  "nextScheduledAt": "2026-11-01T08:30:00Z", // съобразено с UTC
  "recurrenceSummary": "Всеки 2 месеца (преизчислявано от момента на изпълнение)"
}
```

---

#### 2.3. Инстанции и Изпълнение (`/api/instances`)

Това са основните endpoints, викани директно от Android push действията или Web списъка:

| Метод | Път | Описание |
|---|---|---|
| `POST` | `/api/instances/{id}/complete` | **Маркира инстанцията като ИЗПЪЛНЕНА** (поддържа `idempotencyKey` и флаг `isEarly: true` при предсрочно изпълнение). Автоматично насрочва следващата дата! |
| `POST` | `/api/instances/{id}/complete-early` | **Предсрочно изпълнение**: Маркира предстоящата инстанция преди настъпване на крайния час и преизчислява следващия цикъл. |
| `POST` | `/api/instances/{id}/snooze` | **Интелигентно бързо отлагане (Smart Quick Snooze)** с предварително дефинирани пресети (`PlusOneHour`, `TonightEvening2000`, `TomorrowMorning0900` или `CustomMinutes`). |
| `POST` | `/api/instances/{id}/skip` | Пропускане на текущия цикъл без изпълнение |
| `GET` | `/api/instances/pending` | Всички текущо висящи / активни напомняния (за Android UI и дневен преглед) |
| `GET` | `/api/instances/timeline` | Таймлайн на задачи за месеца / седмицата |

##### Пример: `POST /api/instances/{id}/complete`
**Request Body**:
```json
{
  "completedAt": "2026-11-08T14:22:00Z",
  "completionNote": "Изчистен и дренажният филтър",
  "deviceId": "d4e5f6a7-...",
  "idempotencyKey": "a2b4c6e8-1111-2222-3333-444455556666",
  "isEarly": false
}
```

##### Пример: `POST /api/instances/{id}/snooze` (Smart Quick Snooze)
**Request Body**:
```json
{
  "preset": "TonightEvening2000", // "PlusOneHour" (+60m), "TonightEvening2000" (до 20:00), "TomorrowMorning0900" (до 09:00), "CustomMinutes"
  "customMinutes": null,
  "deviceId": "d4e5f6a7-..."
}
```

**Response (200 OK)**:
```json
{
  "instanceId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "status": "Snoozed",
  "snoozedUntil": "2026-11-08T18:00:00Z",
  "appliedPreset": "TonightEvening2000"
}
```

---

#### 2.4. Регистрация на Android Устройства (`/api/devices`)

| Метод | Път | Описание |
|---|---|---|
| `POST` | `/api/devices/register` | Регистрация / обновяване на FCM Push токен |
| `POST` | `/api/devices/unregister` | Деактивиране на устройство (Logout от телефона) |

##### Пример: `POST /api/devices/register`
```json
{
  "fcmToken": "cKj83la9sLk:APA91bFv...",
  "deviceName": "Google Pixel 8 Pro",
  "platform": "android",
  "appVersion": "1.0.4"
}
```

---

#### 2.5. Конфигурационни ресурси (`/api/metadata`)

| Метод | Път | Описание |
|---|---|---|
| `GET` | `/api/sounds` | Списък с наличните вградени звуци и Android канали |
| `GET` | `/api/policies/escalation` | Списък с дефинираните стълбици за ескалация |
| `POST` | `/api/policies/escalation` | Създаване на потребителска стълбица (напр. +15м, +45м, +3ч) |

---

#### 2.6. История и Статистика на Изпълнението (`/api/stats`)

| Метод | Път | Описание |
|---|---|---|
| `GET` | `/api/stats/compliance` | Общ процент на изпълнение навреме (% adherence), средно закъснение в дни/часове, най-редовни и най-отлагани задачи |
| `GET` | `/api/reminders/{id}/stats` | Индивидуална хронология на изпълненията: брой закъснения, използвани ескалации, предсрочни маркирания |

##### Пример: `GET /api/stats/compliance`
**Response (200 OK)**:
```json
{
  "totalRemindersTracked": 14,
  "overallAdherenceRatePercent": 92.4,
  "averageDelayMinutes": 115,
  "earlyCompletionCount": 6,
  "monthlyHeatmap": [
    { "date": "2026-10-01", "completed": 3, "snoozed": 1, "delayed": 0 }
  ]
}
```

---

#### 2.7. Резервно Копие и Експорт (`/api/backup`)

| Метод | Път | Описание |
|---|---|---|
| `GET` | `/api/backup/export` | **Еднократен архив с 1 клик**: Генерира и сваля пълен JSON архив с всички правила за напомняния, настройки и история |
| `POST` | `/api/backup/import` | Възстановяване на базата от предварително свален JSON архив |
