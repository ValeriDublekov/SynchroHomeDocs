# Архитектурен План: Схема на Базата Данни (PostgreSQL)
## Документ: 02_DATABASE_SCHEMA.md

Този документ описва детайлната PostgreSQL 16 релационна схема, ентити релациите, типовете данни, индексите и ограниченията за **RemindCore**.

---

### 1. Ентити-Релационен Модел (ERD Преглед)

```
 [ users ] ──< [ devices ] (FCM Push токени за Android)
    │
    ├──< [ reminders ] ───> [ recurrence_rules ] (Fixed vs Completion-based)
    │         │       ───> [ escalation_policies ] (Стълбица на забавяне)
    │         │       ───> [ sound_profiles ] (Android Channels & Sounds)
    │         │
    │         └──< [ reminder_instances ] (Всяко конкретно изпълнение)
    │                     │
    │                     └──< [ notification_logs ] (Одит на изпратените Push)
    │
    └──< [ google_calendar_sync_states ] (OAuth токени и състояние на календара)
```

---

### 2. PostgreSQL DDL Спецификация

```sql
-- Разширения за UUID и функции за време
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Таблица: users (Google Authenticated Users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    google_sub VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(150),
    avatar_url TEXT,
    timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Sofia',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Таблица: devices (Регистрирани Android/iOS/Web Push устройства)
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fcm_token TEXT NOT NULL,
    device_name VARCHAR(100),
    platform VARCHAR(20) NOT NULL DEFAULT 'android', -- 'android', 'web'
    app_version VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_device_user_fcm UNIQUE (user_id, fcm_token)
);

-- 3. Таблица: sound_profiles (Профили за аудио и Android канали)
CREATE TABLE sound_profiles (
    id VARCHAR(50) PRIMARY KEY, -- напр. 'medical_alarm', 'chime_long', 'urgent_buzzer'
    display_name VARCHAR(100) NOT NULL,
    android_channel_id VARCHAR(100) NOT NULL,
    raw_sound_file VARCHAR(100) NOT NULL, -- име на файла в res/raw/ без разширение
    vibration_pattern_json JSONB DEFAULT '[0, 500, 200, 500]',
    is_system BOOLEAN NOT NULL DEFAULT TRUE
);

-- 4. Таблица: escalation_policies (Политики за инкрементално напомняне)
-- Формат на steps_json: [{"step": 1, "delay_minutes": 60}, {"step": 2, "delay_minutes": 120}, {"step": 3, "delay_minutes": 1440}]
CREATE TABLE escalation_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    steps_json JSONB NOT NULL,
    max_escalation_count INT NOT NULL DEFAULT 5,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Таблица: recurrence_rules (Конфигурация на повторяемостта)
CREATE TYPE recurrence_calculation_base AS ENUM (
    'FromScheduledDate',  -- Фиксирано: добавя интервал към първоначалната дата
    'FromCompletion'      -- Плаващо: добавя интервал от МОМЕНТА на реално изпълнение
);

CREATE TYPE recurrence_frequency AS ENUM (
    'Once',               -- Еднократно
    'IntervalDays',       -- Всеки X дни (напр. лекарство на 3 дни)
    'IntervalWeeks',      -- Всеки X седмици
    'IntervalMonths',     -- Всеки X месеца (напр. пералня на 2 месеца)
    'CronExpression'      -- Разширен Cron за специфични нужди
);

CREATE TABLE recurrence_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    frequency recurrence_frequency NOT NULL,
    interval_value INT NOT NULL DEFAULT 1, -- напр. 2 (за всеки 2 месеца) или 3 (за всеки 3 дни)
    target_time TIME NOT NULL DEFAULT '09:00:00', -- основен час за известие
    target_times TIME[] DEFAULT NULL, -- незадължителен списък от часове за няколко приема дневно (напр. ['08:00', '14:00', '20:00'])
    calculation_base recurrence_calculation_base NOT NULL DEFAULT 'FromScheduledDate',
    days_of_week INT[] DEFAULT NULL, -- [1,3,5] за Понеделник, Сряда, Петък
    cron_pattern VARCHAR(100) DEFAULT NULL,
    start_date DATE NOT NULL,
    end_date DATE DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Таблица: reminders (Основни дефиниции на задачите)
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'General', -- 'Health', 'Home', 'Maintenance', 'Finance'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    recurrence_rule_id UUID REFERENCES recurrence_rules(id) ON DELETE SET NULL,
    escalation_policy_id UUID REFERENCES escalation_policies(id) ON DELETE SET NULL,
    sound_profile_id VARCHAR(50) REFERENCES sound_profiles(id) DEFAULT 'medical_alarm',
    sync_with_google_calendar BOOLEAN NOT NULL DEFAULT FALSE,
    google_calendar_id VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Таблица: reminder_instances (Конкретни екземпляри на събития)
CREATE TYPE instance_status AS ENUM (
    'Pending',     -- Чака първоначален тригър
    'Triggered',   -- Вече е изпратен поне 1 push
    'Snoozed',     -- Временна пауза
    'Completed',   -- Маркирано като изпълнено от потребителя
    'Skipped',     -- Пропуснато за този цикъл
    'Cancelled'    -- Отменено
);

CREATE TABLE reminder_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL, -- Точната планирана дата и час
    status instance_status NOT NULL DEFAULT 'Pending',
    current_escalation_step INT NOT NULL DEFAULT 0,
    next_escalation_at TIMESTAMPTZ DEFAULT NULL,
    completed_at TIMESTAMPTZ DEFAULT NULL,
    completed_by_device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    is_early_completion BOOLEAN NOT NULL DEFAULT FALSE, -- Маркер за предсрочно изпълнение
    idempotency_key UUID UNIQUE DEFAULT NULL, -- Защита срещу дублиране при повторна мобилна синхронизация
    completion_note TEXT,
    google_calendar_event_id VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Таблица: notification_logs (История на изпратени нотификации)
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_instance_id UUID NOT NULL REFERENCES reminder_instances(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    escalation_step INT NOT NULL,
    fcm_message_id VARCHAR(255),
    delivery_status VARCHAR(50) NOT NULL, -- 'Success', 'Failed', 'DeviceUnregistered'
    error_message TEXT
);

-- 9. Таблица: google_calendar_sync_states (Свързване с Google Calendar)
CREATE TABLE google_calendar_sync_states (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_encrypted TEXT NOT NULL,
    calendar_id VARCHAR(255) NOT NULL DEFAULT 'primary',
    sync_token TEXT,
    last_synced_at TIMESTAMPTZ,
    is_sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

### 3. Индекси за Оптимизация на Scheduler заявките

```sql
-- Scheduler заявките питат: "Кои инстанции са за изпращане СЕГА?"
CREATE INDEX idx_instances_pending_due ON reminder_instances (scheduled_at) 
WHERE status = 'Pending';

-- Заявките за ескалация: "Кои са тригърнати и имат next_escalation_at <= NOW()?"
CREATE INDEX idx_instances_escalation ON reminder_instances (next_escalation_at) 
WHERE status IN ('Triggered', 'Snoozed') AND next_escalation_at IS NOT NULL;

-- Бързо търсене по reminder_id и статус
CREATE INDEX idx_instances_reminder_status ON reminder_instances (reminder_id, status);

-- Активни устройства по потребител
CREATE INDEX idx_devices_user_active ON devices (user_id) 
WHERE is_active = TRUE;
```

---

### 4. Seed данни (Default Sound Profiles & Escalation Ladder)

```sql
INSERT INTO sound_profiles (id, display_name, android_channel_id, raw_sound_file) VALUES
('medical_alarm', 'Медицински сигнал (Висок приоритет)', 'remindcore_medical', 'sound_medical_alarm'),
('appliance_service', 'Профилактика уреди (Камбанка)', 'remindcore_appliance', 'sound_appliance_chime'),
('daily_gentle', 'Ежедневно плавно напомняне', 'remindcore_gentle', 'sound_gentle_harp');

INSERT INTO escalation_policies (id, user_id, name, description, steps_json, is_default) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    NULL, -- Global default policy
    'Стандартна ескалация (+1ч, +2ч, +24ч)',
    'Повторно напомняне след 1 час, след още 2 часа, и на следващия ден',
    '[
        {"step": 1, "delay_minutes": 60, "label": "След 1 час"},
        {"step": 2, "delay_minutes": 120, "label": "След още 2 часа"},
        {"step": 3, "delay_minutes": 1440, "label": "На следващия ден"}
    ]'::jsonb,
    TRUE
);
```
