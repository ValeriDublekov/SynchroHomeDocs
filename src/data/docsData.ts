export interface DocItem {
  id: string;
  filename: string;
  title: string;
  badge: string;
  category: 'Overview' | 'Architecture' | 'Data & API' | 'Engines' | 'Clients' | 'DevOps & Discussions';
  summary: string;
  filePath: string;
  content: string;
}

export const ARCHITECTURE_DOCS: DocItem[] = [
  {
    id: '00_INDEX',
    filename: '00_INDEX.md',
    title: 'Главен Архитектурен Индекс',
    badge: 'Index',
    category: 'Overview',
    filePath: '/docs/00_INDEX.md',
    summary: 'Главен портал, обзор на системата, карта на всички модули и архитектурни принципи.',
    content: `# RemindCore: Централизирана Система за Напомняния
## Главен Архитектурен Индекс и Спецификация

Този документ служи като главен входен портал (Master Index) към цялостната техническа архитектура и спецификация за **RemindCore** — self-hosted система за управление на краткосрочни и дългосрочни интелигентни напомняния.

---

### 1. Основни компоненти на системата

\`\`\`
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
\`\`\`

---

### 2. Структура на документацията

Цялостната спецификация е организирана в следните модулни документи:

- **01_ARCHITECTURE.md**: Цялостна архитектура, технологичен стек (.NET 9, PostgreSQL, React, Android), поток на данните.
- **02_DATABASE_SCHEMA.md**: Пълен релационен модел на базата (PostgreSQL DDL), таблици, индекси, ENUMs и миграции.
- **03_API_ENDPOINTS.md**: REST API контракти на ASP.NET Core: DTOs, маршрути, грешки, пагинация, тестване.
- **04_RECURRENCE_ENGINE.md**: Алгоритми за преизчисляване: Fixed Schedule vs Floating (Completion-Based), часови зони и крайни случаи.
- **05_PUSH_ESCALATION.md**: Push нотификации през FCM, стълбица на ескалация (Snooze Ladder: +1ч, +2ч, +24ч), Doze режим и събуждане.
- **06_ANDROID_CLIENT.md**: Спецификация на Android приложението: Custom Sounds, Notification Channels, Quick Action Receivers.
- **07_WEB_CLIENT.md**: Спецификация на Web UI панела: конфигуратор на напомняния, симулатор на графици, мобилна съвместимост.
- **08_GOOGLE_CALENDAR.md**: Интеграция с Google Calendar: iCal feed абонамент срещу Direct Google Calendar API v3 OAuth синхронизация.
- **09_SECURITY_AND_DEPLOYMENT.md**: Защита на домашния сървър: Cloudflare Tunnel, Zero Trust Access, Docker изолация, JWT, резервни копия.
- **10_REQUIREMENTS_DISCUSSION.md**: Точки за дискусия, въпроси за изясняване, архитектурни компромиси и бъдещи разширения.`
  },
  {
    id: '01_ARCHITECTURE',
    filename: '01_ARCHITECTURE.md',
    title: 'Архитектура и Технологичен Стек',
    badge: 'Core',
    category: 'Architecture',
    filePath: '/docs/01_ARCHITECTURE.md',
    summary: 'Server-Authoritative модел, обосновка за .NET 9, PostgreSQL, Quartz.NET, FCM, React и Android.',
    content: `# Архитектурен План: Архитектура и Технологичен Стек
## Документ: 01_ARCHITECTURE.md

### 1. Архитектурна Философия и Принципи

Системата **RemindCore** е проектирана като **Server-Authoritative, Edge-Secured, Offline-Tolerant** архитектура:
1. **Server-Authoritative**: Всички изчисления за дати, повторения, ескалации и състояния на напомнянията се изпълняват централизирано на домашния сървър. Клиентските устройства (Android, Web) отразяват и изпращат събития (complete, snooze, skip).
2. **Edge-Secured Home Server**: Домашният сървър **няма публично отворени входящи портове (Port Forwarding: OFF)** на домашния рутер. Всичкият трафик минава през криптиран изходящ тунел (Cloudflare Tunnel).
3. **Resilient Scheduling**: Дори телефонът да е изключен или в режим Doze / Deep Sleep, сървърът поддържа персистирано състояние и инкрементални стълбици на напомняне.

---

### 2. Технологичен Стек (Tech Stack)

| Слой | Технология | Обосновка |
|---|---|---|
| **Backend API** | **.NET 9 (C# ASP.NET Core Web API)** | Изключителна производителност, native AOT / минимално потребление на RAM в Docker, стриктна типизация, отличен scheduler механизъм (Quartz.NET). |
| **ORM / Data Access** | **EF Core 9 + Npgsql** | Мощни миграции, поддръжка на PostgreSQL timestamptz, JSONB метаданни, connection pooling. |
| **База данни** | **PostgreSQL 16** | ACID надеждност, поддръжка на rich date/time интервали (INTERVAL '2 months'), индексиране на JSONB, нисък footprint. |
| **Scheduler & Jobs** | **Quartz.NET + PostgreSQL Job Store** | За разлика от in-memory cron, Quartz записва състоянието на тригерите в базата; ако сървърът се рестартира, планираните напомняния не се губят. |
| **Push Notifications** | **Firebase Cloud Messaging (FCM HTTP v1 API)** | Официален стандарт за надежден Android push с поддръжка на high-priority, data-only съобщения и специфични channel_id. |
| **Web Frontend** | **React 19 + TypeScript + Tailwind CSS** | Модерна SPA за десктоп и мобилни браузъри, лесно настройване на комплексни графици и преглед на таймлайн. |
| **Android Client** | **React Native (Expo bare) или Native Kotlin** | Препоръчва се Native Kotlin с FirebaseMessagingService + NotificationCompat за максимална лекота и 0 фонов разход на батерия. |
| **Edge & Security** | **Cloudflare Tunnel (cloudflared) + Zero Trust Access** | Изходящ TLS тунел, DDoS защита, WAF, опционална предварителна автентикация с Google Identity.`
  },
  {
    id: '02_DATABASE_SCHEMA',
    filename: '02_DATABASE_SCHEMA.md',
    title: 'Схема на Базата Данни (PostgreSQL)',
    badge: 'Database',
    category: 'Data & API',
    filePath: '/docs/02_DATABASE_SCHEMA.md',
    summary: 'Релационен модел, PostgreSQL 16 DDL, ENUMs, таблици за повторения, инстанции, логове и индекси.',
    content: `# Архитектурен План: Схема на Базата Данни (PostgreSQL)
## Документ: 02_DATABASE_SCHEMA.md

Този документ описва детайлната PostgreSQL 16 релационна схема, ентити релациите, типовете данни, индексите и ограниченията за **RemindCore**.

---

### Таблици в системата:
- **users**: Google профили, email, google_sub, часова зона.
- **devices**: FCM Push токени за Android, модел на телефона, последна активност.
- **sound_profiles**: Канали за известия и асоциирани локални аудио файлове (res/raw/).
- **escalation_policies**: Стълбици на инкрементално напомняне (напр. +60м, +120м, +1440м).
- **recurrence_rules**: Конфигурация на повторението, интервал, точен час и тип (FromScheduledDate vs FromCompletion).
- **reminders**: Основни дефиниции на задачите и категориите.
- **reminder_instances**: Конкретните екземпляри на събитията със статус (Pending, Triggered, Completed, Snoozed).
- **notification_logs**: Одит на всички изпратени Push съобщения през FCM.
- **google_calendar_sync_states**: Криптирани токени за синхронизация с календара.`
  },
  {
    id: '03_API_ENDPOINTS',
    filename: '03_API_ENDPOINTS.md',
    title: 'Спецификация на REST API (.NET 9)',
    badge: 'API',
    category: 'Data & API',
    filePath: '/docs/03_API_ENDPOINTS.md',
    summary: 'REST endpoints за управление, Smart Quick Snooze, Complete Early, Compliance статистика и 1-клик Backup.',
    content: `# Архитектурен План: Спецификация на REST API (.NET 9)
## Документ: 03_API_ENDPOINTS.md

Дефиниция на всички REST API маршрути, входно-изходни DTO структури и кодове за отговор.

---

### Основни Маршрути:
- \`POST /api/auth/google\`: Размяна на Google ID Token срещу RemindCore JWT.
- \`GET /api/reminders\`: Извличане на напомняния с филтриране по статус и категория.
- \`POST /api/reminders\`: Създаване на ново напомняне + генериране на първи инстанс.
- \`POST /api/instances/{id}/complete\`: **Маркира инстанцията като ИЗПЪЛНЕНА** (с поддръжка на idempotencyKey и флаг isEarly) и задейства преизчисляване!
- \`POST /api/instances/{id}/complete-early\`: Предсрочно маркиране преди планирания час.
- \`POST /api/instances/{id}/snooze\`: **Smart Quick Snooze** с пресети (+1h, Довечера 20:00, Утре 09:00, CustomMinutes).
- \`GET /api/stats/compliance\`: Статистика на редовността, процент изпълнени навреме и средно закъснение.
- \`GET /api/backup/export\` & \`POST /api/backup/import\`: **Еднократен пълен JSON архив с 1 клик** за резервно копие и възстановяване.
- \`POST /api/devices/register\`: Регистрация / обновяване на FCM токен от Android телефона.
- \`GET /api/sounds\`: Списък с вградените аудио профили и Android канали.`
  },
  {
    id: '04_RECURRENCE_ENGINE',
    filename: '04_RECURRENCE_ENGINE.md',
    title: 'Механизъм за Преизчисляване',
    badge: 'Recurrence',
    category: 'Engines',
    filePath: '/docs/04_RECURRENCE_ENGINE.md',
    summary: 'Математика и C# логика: Фиксиран график vs Плаващ от дата на изпълнение, 2-3 приема дневно и Complete Early.',
    content: `# Архитектурен План: Механизъм за Преизчисляване на Повторения
## Документ: 04_RECURRENCE_ENGINE.md

### Ключови Режими на Преизчисляване:
1. **FromScheduledDate (Фиксиран график)**:
   - Следващата дата се добавя към *първоначално планираната дата*.
   - Пример: Профилактика планирана за 1 Ноември, направена на 8 Ноември -> следващата остава на **1 Януари**!
2. **FromCompletion (Плаващ график)**:
   - Следващата дата се изчислява от *момента на маркиране като изпълнено*.
   - Пример: Профилактика направена на 8 Ноември -> следващата става на **8 Януари** (точно 2 месеца от реалното действие).
3. **Многократен дневен прием (2-3 приема дневно)**:
   - Масив \`target_times = ['08:00', '14:00', '20:00']\` за автоматично насрочване на следващата доза през деня в рамките на едно правило.
4. **Предсрочно изпълнение (Complete Early)**:
   - Ако задачата е свършена предварително, се затваря веднага и следващата се насрочва от новия момент.`
  },
  {
    id: '05_PUSH_ESCALATION',
    filename: '05_PUSH_ESCALATION.md',
    title: 'Push Известия и Ескалация',
    badge: 'FCM & Push',
    category: 'Engines',
    filePath: '/docs/05_PUSH_ESCALATION.md',
    summary: 'FCM HTTP v1 протокол, инкрементална стълбица (+1ч, +2ч, +24ч) и Smart Quick Snooze бутони в известието.',
    content: `# Архитектурен План: Push Известия и Инкрементална Ескалация
## Документ: 05_PUSH_ESCALATION.md

### Стълбица на Ескалация и Smart Quick Snooze:
- **Етап 0**: В зададения час -> Първичен звук и известие.
- **Етап 1**: След +1 час -> Първо напомняне.
- **Етап 2**: След още +2 часа -> По-настоятелен сигнал.
- **Етап 3**: На следващия ден -> Дневно обобщение за просрочена задача.
- **Интерактивни бутони в известието**:
  - \`[✓ Готово]\`: спира бъдещите ескалации и насрочва следващия цикъл.
  - \`[+1 час]\`: бързо отлагане с 60 мин.
  - \`[Довечера / Утре]\`: контекстен бутон (до 20:00 довечера или до 09:00 утре сутрин).`
  },
  {
    id: '06_ANDROID_CLIENT',
    filename: '06_ANDROID_CLIENT.md',
    title: 'Спецификация на Android Клиента',
    badge: 'Android',
    category: 'Clients',
    filePath: '/docs/06_ANDROID_CLIENT.md',
    summary: 'Native Kotlin / React Native, Custom Sounds (res/raw/), Smart Quick Snooze, Complete Early и офлайн WorkManager.',
    content: `# Архитектурен План: Спецификация на Android Клиента
## Документ: 06_ANDROID_CLIENT.md

### Ключови архитектурни елементи:
- **Notification Channels**: Каналите \`remindcore_medical\` и \`remindcore_appliance\` се регистрират с аудио файлове от \`res/raw/\`.
- **Фонов Action Receiver**: Обработва бутоните \`[✓ Готово]\`, \`[+1ч]\`, \`[Довечера/Утре]\` директно от заключения екран.
- **WorkManager с Idempotency Key**: Ако няма интернет при натискане, задачата се опашва локално и се изпраща сигурно щом мрежата се възстанови.
- **UI Екран**: Преглед на предстоящите задачи с бутон "Изпълни предсрочно" и бързо спиране/паузиране.`
  },
  {
    id: '07_WEB_CLIENT',
    filename: '07_WEB_CLIENT.md',
    title: 'Спецификация на Web Портала',
    badge: 'Web UI',
    category: 'Clients',
    filePath: '/docs/07_WEB_CLIENT.md',
    summary: 'Конструктор на правила, табло за управление, статистика на закъсненията (Compliance) и 1-Click Backup Export.',
    content: `# Архитектурен План: Спецификация на Web Портала (React)
## Документ: 07_WEB_CLIENT.md

### Функционалности на Web интерфейса:
- **Конструктор на напомняния**: Интервали (дни, седмици, месеци), поддръжка на 2-3 приема дневно, базов алгоритъм (фиксиран vs плаващ), звук и стълбица.
- **Табло за управление**: Днешни, просрочени и предстоящи задачи с бутон "Изпълни предсрочно".
- **Compliance & History Статистика**: Процент изпълнени навреме задачи, средно закъснение в дни/часове и календарна активност.
- **1-Click Backup & Export**: Сваляне и качване на пълен JSON архив на цялата система.`
  },
  {
    id: '08_GOOGLE_CALENDAR',
    filename: '08_GOOGLE_CALENDAR.md',
    title: 'Интеграция с Google Calendar',
    badge: 'Integration',
    category: 'Architecture',
    filePath: '/docs/08_GOOGLE_CALENDAR.md',
    summary: 'Двупосочна синхронизация през Google Calendar API v3 срещу автономен iCal feed абонамент.',
    content: `# Архитектурен План: Интеграция с Google Calendar
## Документ: 08_GOOGLE_CALENDAR.md

### Сравнение на подходите:
- **Google Calendar API v3**: Моментално обновяване при маркиране като готово, оцветяване в зелено (\`[✓ Изпълнено]\`) и пренасрочване на следваща дата в реално време.
- **iCal / ICS Линк**: Лесна настройка с абонаментен линк, но с 8-24 часа забавяне от страна на Google Calendar.`
  },
  {
    id: '09_SECURITY_AND_DEPLOYMENT',
    filename: '09_SECURITY_AND_DEPLOYMENT.md',
    title: 'Сигурност и Деплоймънт',
    badge: 'DevOps & Security',
    category: 'DevOps & Discussions',
    filePath: '/docs/09_SECURITY_AND_DEPLOYMENT.md',
    summary: 'Cloudflare Tunnel (0 отворени порта на рутера), Cloudflare Zero Trust, изолирана Docker мрежа и бекъпи.',
    content: `# Архитектурен План: Сигурност и Деплоймънт на Домашен Сървър
## Документ: 09_SECURITY_AND_DEPLOYMENT.md

### Защита на домашния сървър:
- **Zero Port-Forwarding**: Всички входящи портове на домашния рутер остават затворени. Връзката е изходяща през \`cloudflared\`.
- **Изолирана база данни**: Контейнерът на PostgreSQL няма отворени портове към хоста и е достъпен САМО от .NET API контейнера.
- **Cloudflare Zero Trust**: Ограничаване на достъпа до Web панела само за вашия личен Google имейл.`
  },
  {
    id: '10_REQUIREMENTS_DISCUSSION',
    filename: '10_REQUIREMENTS_DISCUSSION.md',
    title: 'Въпроси за Дискусия и Решения',
    badge: 'Discussions',
    category: 'DevOps & Discussions',
    filePath: '/docs/10_REQUIREMENTS_DISCUSSION.md',
    summary: 'Валидирани решения: Одобрен Двуслоен Cloudflare модел, Smart Snooze, Complete Early, Compliance Stats, 1-Click Backup.',
    content: `# Въпроси за Дискусия, Архитектурни Компромиси и Решения
## Документ: 10_REQUIREMENTS_DISCUSSION.md

### Валидирани Решения (ADR Резюме):
- **Cloudflare Zero Trust**: Одобрен Двуслоен модел (Zero Trust за Web, Google JWT за API).
- **Предсрочно изпълнение**: Одобрено (бутон "Изпълни предсрочно" и флаг в инстанцията).
- **Лекарства с 2-3 приема**: Одобрено (масив target_times в правилото).
- **Smart Quick Snooze**: Одобрено (+1ч, Довечера 20:00, Утре 09:00 в известието).
- **Compliance & History**: Одобрено (метрики за средно закъснение и изпълнение).
- **1-Click Backup**: Одобрено (експорт/импорт на JSON архив).
- **Quiet Hours & Subtasks**: Пропуснати за v1 по желание на потребителя.`
  }
];
