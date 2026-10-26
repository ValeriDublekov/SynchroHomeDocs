# RemindCore: Централизирана Система за Напомняния
## Главен Архитектурен Индекс и Спецификация

Този документ служи като главен входен портал (Master Index) към цялостната техническа архитектура и спецификация за **RemindCore** — self-hosted система за управление на краткосрочни и дългосрочни интелигентни напомняния.

---

### 1. Основни компоненти на системата

```
[ Потребител (Web Браузър) ]  <-- HTTPS (Cloudflare Tunnel + Zero Trust)
         |
         v
[ Cloudflare Edge ] (WAF, SSL, Rate Limit, Google Access)
         |
         | (Encrypted tunnel - никакви отворени портове на рутера!)
         v
[ Домашен Сървър (Docker Compose Network) ]
   ├── [ Web Portal (React SPA / Nginx) ]
   ├── [ Backend API (.NET 9 ASP.NET Core Web API) ]
   │      ├── Quartz.NET Scheduler / Recurring Jobs
   │      ├── Recurrence Engine (Fixed vs Floating)
   │      ├── Escalation & Snooze Ladder Service
   │      ├── Google Calendar Sync Worker
   │      └── FCM Push Notification Dispatcher
   ├── [ PostgreSQL 16 Database ] (Hardened, internal Docker network)
   └── [ cloudflared Daemon ] (Outbound connection към Cloudflare)
         |
         | FCM (Firebase Cloud Messaging) v1 HTTP API
         v
[ Google Firebase Cloud Messaging ]
         |
         | High-Priority Push с Custom Sound & Action Buttons
         v
[ Android Устройство (React Native / Native Kotlin Client) ]
   ├── Notification Channels с персонализирани звуци (res/raw/)
   ├── Direct Quick Actions: [Маркирай Изпълнено] / [Отложи (Snooze)]
   └── Опростен преглед и контрол на активните напомняния
```

---

### 2. Структура на документацията

Цялостната спецификация е организирана в следните модулни документи:

| Документ | Съдържание |
|---|---|
| [**01_ARCHITECTURE.md**](./01_ARCHITECTURE.md) | Цялостна архитектура, технологичен стек (.NET 9, PostgreSQL, React, Android), поток на данните. |
| [**02_DATABASE_SCHEMA.md**](./02_DATABASE_SCHEMA.md) | Пълен релационен модел на базата (PostgreSQL DDL), таблици, индекси, ENUMs и миграции. |
| [**03_API_ENDPOINTS.md**](./03_API_ENDPOINTS.md) | REST API контракти на ASP.NET Core: DTOs, маршрути, грешки, пагинация, тестване. |
| [**04_RECURRENCE_ENGINE.md**](./04_RECURRENCE_ENGINE.md) | Алгоритми за преизчисляване: **Fixed Schedule** vs **Floating (Completion-Based)**, часови зони и крайни случаи. |
| [**05_PUSH_ESCALATION.md**](./05_PUSH_ESCALATION.md) | Push нотификации през FCM, стълбица на ескалация (Snooze Ladder: +1ч, +2ч, +24ч), Doze режим и събуждане. |
| [**06_ANDROID_CLIENT.md**](./06_ANDROID_CLIENT.md) | Спецификация на Android приложението: Custom Sounds, Notification Channels, Quick Action Receivers. |
| [**07_WEB_CLIENT.md**](./07_WEB_CLIENT.md) | Спецификация на Web UI панела: конфигуратор на напомняния, симулатор на графици, мобилна съвместимост. |
| [**08_GOOGLE_CALENDAR.md**](./08_GOOGLE_CALENDAR.md) | Интеграция с Google Calendar: iCal feed абонамент срещу Direct Google Calendar API v3 OAuth синхронизация. |
| [**09_SECURITY_AND_DEPLOYMENT.md**](./09_SECURITY_AND_DEPLOYMENT.md) | Защита на домашния сървър: Cloudflare Tunnel, Zero Trust Access, Docker изолация, JWT, резервни копия. |
| [**10_REQUIREMENTS_DISCUSSION.md**](./10_REQUIREMENTS_DISCUSSION.md) | Точки за дискусия, въпроси за изясняване, архитектурни компромиси и бъдещи разширения. |

---

### 3. Ключови изисквания и технически отговори

1. **Всеки X дни в даден час (напр. лекарство)**:
   - `interval_type = 'Days'`, `interval_value = X`, `target_time = '08:00:00'`.
   - Поддръжка на прецизен час съобразен с локалната часова зона на потребителя (`Europe/Sofia`).

2. **Всеки 2 месеца с избор на преизчисляване (напр. пералня)**:
   - Флаг `calculation_base = 'FromCompletion'` (плаващ график: след маркиране на изпълнение се добавят 2 месеца от момента на маркиране) или `'FromScheduledDate'` (твърд график: винаги на всеки 2 месеца спрямо първоначалната дата).

3. **Custom звуков сигнал**:
   - Android Notification Channels с асоцииран локален аудио ресурс (напр. `res/raw/reminder_medical.wav`, `res/raw/reminder_chime.wav`). Пристигащото FCM съобщение съдържа ключ `channel_id`, насочващ Android OS към съответния канал.

4. **Инкрементално повторно напомняне (Escalation / Snooze Ladder)**:
   - Конфигурируема политика на ескалация: Стъпка 1 (+60m) $\rightarrow$ Стъпка 2 (+120m) $\rightarrow$ Стъпка 3 (+24h) $\rightarrow$ до маркиране на изпълнение или ръчно заглушаване.

5. **Сигурност на домашен сървър**:
   - Zero Port-Forwarding политика чрез `cloudflared` тунел.
   - Двустепенна защита: Cloudflare Zero Trust (Google Workspace / Gmail One-Time PIN / OAuth) пред Nginx + JWT Bearer token вътрешно в .NET API.

6. **Web vs Android отговорности**:
   - **Web**: Пълно администриране, дефиниране на правила, таймлайн, статистика, експорт.
   - **Android**: Лек клиент за получаване на push, бързо маркиране от системната лента за известия, преглед на днешните/предстоящите задачи.
