# Архитектурен План: Архитектура и Технологичен Стек
## Документ: 01_ARCHITECTURE.md

### 1. Архитектурна Философия и Принципи

Системата **RemindCore** е проектирана като **Server-Authoritative, Edge-Secured, Offline-Tolerant** архитектура:
1. **Server-Authoritative**: Всички изчисления за дати, повторения, ескалации и състояния на напомнянията се изпълняват централизирано на домашния сървър. Клиентските устройства (Android, Web) отразяват и изпращат събития (`complete`, `snooze`, `skip`).
2. **Edge-Secured Home Server**: Домашният сървър **няма публично отворени входящи портове (Port Forwarding: OFF)** на домашния рутер. Всичкият трафик минава през криптиран изходящ тунел (Cloudflare Tunnel).
3. **Resilient Scheduling**: Дори телефонът да е изключен или в режим Doze / Deep Sleep, сървърът поддържа персистирано състояние и инкрементални стълбици на напомняне.

---

### 2. Технологичен Стек (Tech Stack)

| Слой | Технология | Обосновка |
|---|---|---|
| **Backend API** | **.NET 9 (C# ASP.NET Core Web API)** | Изключителна производителност, native AOT / минимално потребление на RAM в Docker, стриктна типизация, отличен scheduler механизъм (Quartz.NET / BackgroundService). |
| **ORM / Data Access** | **EF Core 9 + Npgsql** | Мощни миграции, поддръжка на PostgreSQL `timestamptz`, JSONB метаданни, connection pooling. |
| **База данни** | **PostgreSQL 16** | ACID надеждност, поддръжка на rich date/time интервали (`INTERVAL '2 months'`), индексиране на JSONB, нисък footprint. |
| **Scheduler & Jobs** | **Quartz.NET + PostgreSQL Job Store** | За разлика от in-memory cron, Quartz записва състоянието на тригерите в базата; ако сървърът се рестартира, планираните напомняния не се губят. |
| **Push Notifications** | **Firebase Cloud Messaging (FCM HTTP v1 API)** | Официален стандарт за надежден Android push с поддръжка на `high-priority`, `data-only` съобщения и специфични `channel_id`. |
| **Web Frontend** | **React 19 + TypeScript + Tailwind CSS** | Модерна SPA за десктоп и мобилни браузъри, лесно настройване на комплексни графици и преглед на таймлайн. |
| **Android Client** | **React Native (Expo bare workflow / CLI)** *или* **Native Kotlin** | Препоръчва се **React Native** за бърза интеграция с Web моделите или **Native Kotlin** с `FirebaseMessagingService` + `NotificationCompat` за максимална лекота и 0 фонов разход на батерия. (Виж [06_ANDROID_CLIENT.md](./06_ANDROID_CLIENT.md)). |
| **Edge & Security** | **Cloudflare Tunnel (`cloudflared`) + Zero Trust Access** | Изходящ TLS тунел, DDoS защита, WAF, опционална предварителна автентикация с Google Identity на самото Cloudflare ниво. |

---

### 3. Диаграма на Компонентите (Component Model)

```
                    ┌──────────────────────────────────────────────┐
                    │            Cloudflare Global Network         │
                    │   - SSL/TLS Termination                     │
                    │   - Zero Trust Access (Google IdP Guard)    │
                    │   - Web Application Firewall (WAF)          │
                    └──────────────────────┬───────────────────────┘
                                           │ Encrypted WireGuard/QUIC
                                           v
    ┌────────────────────────────────────────────────────────────────────────┐
    │              Домашен Сървър (Docker Compose Environment)               │
    │                                                                        │
    │  ┌─────────────────────────┐           ┌────────────────────────────┐  │
    │  │  cloudflared container  │ --------> │      nginx / reverse proxy │  │
    │  │  (Zero open ports)      │           │      (Header sanity & TLS) │  │
    │  └─────────────────────────┘           └─────────────┬──────────────┘  │
    │                                                      │                 │
    │                    ┌─────────────────────────────────┴─────────────┐   │
    │                    │                                               │   │
    │                    v                                               v   │
    │        ┌─────────────────────────┐                     ┌───────────────┴───────────────┐
    │        │  Web Management SPA     │                     │     .NET 9 ASP.NET Web API    │
    │        │  (Static React Dist)    │                     │  - REST Controllers           │
    │        └─────────────────────────┘                     │  - Google JWT Auth Handler    │
    │                                                        │  - Recurrence Engine          │
    │                                                        │  - Escalation Engine          │
    │                                                        │  - Google Calendar Sync       │
    │                                                        │  - Quartz.NET Hosted Service  │
    │                                                        └───────────────┬───────────────┘
    │                                                                        │
    │                                                                        v
    │                                                        ┌───────────────────────────────┐
    │                                                        │     PostgreSQL 16 Database    │
    │                                                        │  - reminders & rules          │
    │                                                        │  - reminder_instances (logs)  │
    │                                                        │  - escalation_policies        │
    │                                                        │  - quartz_job_store           │
    │                                                        │  - device_push_tokens         │
    │                                                        └───────────────────────────────┘
    └────────────────────────────────────────────────────────────────────────┘
```

---

### 4. Жизнен цикъл на едно напомняне (Lifecycle Flow)

1. **Създаване на правило (Web UI)**:
   - Потребителят въвежда: Заглавие "Профилактика на пералня", Период: 2 месеца, База: `FromCompletion` (плаваща от датата на изпълнение), Звук: `washer_chime`, Ескалация: `Ladder_1h_2h_24h`.
   - Запис в базата: генерира се първи инстанс с `scheduled_at = now() + 2 months`.

2. **Тригър от Quartz Scheduler**:
   - В деня и часа на събитието Scheduler-ът открива активния запис `reminder_instance` със статус `Pending`.
   - Извиква `FcmPushDispatcher`.
   - FCM изпраща high-priority push към регистрирания Android телефон.

3. **Получаване на телефона**:
   - Телефонът пуска custom звук `washer_chime.wav`.
   - В известието има два бутона: `[Готово / Mark Done]` и `[Отложи / Snooze]`.

4. **Ако потребителят не реагира (Инкрементална ескалация)**:
   - След 1 час: Втора нотификация с по-настоятелен тон.
   - След още 2 часа: Трета нотификация.
   - На следващия ден в 09:00: Дневно обобщение/напомняне за висяща задача.

5. **Потребителят натиска "Готово"**:
   - Телефонът прави фонова заявка `POST /api/reminders/{id}/complete`.
   - **Recurrence Engine** проверява настройката:
     - Ако е `FromCompletion`: следващата дата = `CompletedAt + 2 месеца`.
     - Ако беше `FromScheduledDate`: следващата дата = `ScheduledAt + 2 месеца`.
   - Изчистват се висящите ескалационни задачи за текущия инстанс.
   - Ако е включена синхронизация с Google Calendar, събитието се маркира/актуализира в календара.
