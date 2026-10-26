import React, { useState } from 'react';
import { Database, Table, Key, Copy, Check, Info, FileCode } from 'lucide-react';

interface SchemaTable {
  name: string;
  category: 'Core' | 'Scheduling' | 'Delivery' | 'Integration';
  description: string;
  columns: {
    name: string;
    type: string;
    nullable: boolean;
    isPk?: boolean;
    isFk?: boolean;
    ref?: string;
    description: string;
  }[];
}

const TABLES: SchemaTable[] = [
  {
    name: 'reminders',
    category: 'Core',
    description: 'Основни дефиниции на задачите и правилата за напомняне',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPk: true, description: 'Уникален идентификатор на напомнянето' },
      { name: 'user_id', type: 'UUID', nullable: false, isFk: true, ref: 'users(id)', description: 'Собственик на напомнянето' },
      { name: 'title', type: 'VARCHAR(200)', nullable: false, description: 'Заглавие (напр. Профилактика на пералня)' },
      { name: 'description', type: 'TEXT', nullable: true, description: 'Детайлни инструкции или бележки' },
      { name: 'category', type: 'VARCHAR(50)', nullable: false, description: 'Home, Health, Maintenance, Finance' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, description: 'Флаг за активност / паузиране' },
      { name: 'recurrence_rule_id', type: 'UUID', nullable: true, isFk: true, ref: 'recurrence_rules(id)', description: 'Свързано правило за повторяемост' },
      { name: 'escalation_policy_id', type: 'UUID', nullable: true, isFk: true, ref: 'escalation_policies(id)', description: 'Политика на забавяне и ескалация' },
      { name: 'sound_profile_id', type: 'VARCHAR(50)', nullable: false, isFk: true, ref: 'sound_profiles(id)', description: 'Асоцииран Android звуков канал' },
      { name: 'sync_with_google_calendar', type: 'BOOLEAN', nullable: false, description: 'Дали се експортира в Google Calendar' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, description: 'Време на създаване' }
    ]
  },
  {
    name: 'recurrence_rules',
    category: 'Scheduling',
    description: 'Параметри за повторяемост (Fixed vs Floating from completion)',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPk: true, description: 'ID на правилото' },
      { name: 'frequency', type: 'ENUM (frequency)', nullable: false, description: 'IntervalDays, IntervalMonths, Once' },
      { name: 'interval_value', type: 'INT', nullable: false, description: 'Числова стойност (напр. 2 за 2 месеца, 3 за 3 дни)' },
      { name: 'target_time', type: 'TIME', nullable: false, description: 'Точен час за звънене (напр. 10:30)' },
      { name: 'calculation_base', type: 'ENUM (calc_base)', nullable: false, description: 'FromScheduledDate ИЛИ FromCompletion' },
      { name: 'start_date', type: 'DATE', nullable: false, description: 'Начална дата на цикъла' },
      { name: 'end_date', type: 'DATE', nullable: true, description: 'Опционална крайна дата за спиране' }
    ]
  },
  {
    name: 'reminder_instances',
    category: 'Scheduling',
    description: 'Всяко конкретно изпълнение във времето, статус и одит',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPk: true, description: 'ID на конкретния екземпляр' },
      { name: 'reminder_id', type: 'UUID', nullable: false, isFk: true, ref: 'reminders(id)', description: 'Родителско напомняне' },
      { name: 'scheduled_at', type: 'TIMESTAMPTZ', nullable: false, description: 'Планирано време за старт' },
      { name: 'status', type: 'ENUM (status)', nullable: false, description: 'Pending, Triggered, Completed, Snoozed, Skipped' },
      { name: 'current_escalation_step', type: 'INT', nullable: false, description: 'Текущо стъпало от стълбицата (0, 1, 2...)' },
      { name: 'next_escalation_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Време на следващото повторно известие' },
      { name: 'completed_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Моментът, в който потребителят маркира "Готово"' },
      { name: 'completion_note', type: 'TEXT', nullable: true, description: 'Бележка въведена при изпълнение' },
      { name: 'google_calendar_event_id', type: 'VARCHAR(255)', nullable: true, description: 'ID на синхронизираното събитие в Google' }
    ]
  },
  {
    name: 'escalation_policies',
    category: 'Delivery',
    description: 'Дефиниции на интервалите за повторно напомняне (Snooze Ladder)',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPk: true, description: 'ID на политиката' },
      { name: 'name', type: 'VARCHAR(100)', nullable: false, description: 'Име (напр. Стълбица +1ч, +2ч, +24ч)' },
      { name: 'steps_json', type: 'JSONB', nullable: false, description: 'Масив със забавяния в минути: [60, 120, 1440]' },
      { name: 'max_escalation_count', type: 'INT', nullable: false, description: 'Максимален брой ескалации преди пауза' },
      { name: 'is_default', type: 'BOOLEAN', nullable: false, description: 'Дали е подразбираща се политика' }
    ]
  },
  {
    name: 'sound_profiles',
    category: 'Delivery',
    description: 'Мапинг между системните профили, звуци и Android Notification Channels',
    columns: [
      { name: 'id', type: 'VARCHAR(50)', nullable: false, isPk: true, description: 'Ключ: medical_alarm, appliance_service' },
      { name: 'display_name', type: 'VARCHAR(100)', nullable: false, description: 'Видимо име в Web интерфейса' },
      { name: 'android_channel_id', type: 'VARCHAR(100)', nullable: false, description: 'NotificationChannel ID в Android OS' },
      { name: 'raw_sound_file', type: 'VARCHAR(100)', nullable: false, description: 'Име на звука в res/raw/ без разширение' },
      { name: 'vibration_pattern_json', type: 'JSONB', nullable: true, description: 'Шаблон на вибрация в милисекунди' }
    ]
  },
  {
    name: 'devices',
    category: 'Delivery',
    description: 'Регистрирани Android телефони и FCM токени',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPk: true, description: 'ID на устройството' },
      { name: 'user_id', type: 'UUID', nullable: false, isFk: true, ref: 'users(id)', description: 'Собственик на устройството' },
      { name: 'fcm_token', type: 'TEXT', nullable: false, description: 'Firebase Cloud Messaging push token' },
      { name: 'device_name', type: 'VARCHAR(100)', nullable: true, description: 'Модел на телефона (Pixel 8, Samsung S24)' },
      { name: 'platform', type: 'VARCHAR(20)', nullable: false, description: 'android или web' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, description: 'Дали устройството получава push' },
      { name: 'last_seen_at', type: 'TIMESTAMPTZ', nullable: false, description: 'Последна комуникация' }
    ]
  },
  {
    name: 'users',
    category: 'Core',
    description: 'Потребители с Google OAuth автентикация',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPk: true, description: 'Уникален ID' },
      { name: 'email', type: 'VARCHAR(255)', nullable: false, description: 'Google имейл адрес' },
      { name: 'google_sub', type: 'VARCHAR(255)', nullable: false, description: 'Google Unique Subject ID' },
      { name: 'display_name', type: 'VARCHAR(150)', nullable: true, description: 'Име на потребителя' },
      { name: 'timezone', type: 'VARCHAR(64)', nullable: false, description: 'Часова зона (Europe/Sofia)' }
    ]
  }
];

export const DatabaseViewer: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<string>('reminders');
  const [copied, setCopied] = useState<boolean>(false);

  const activeTable = TABLES.find((t) => t.name === selectedTable) || TABLES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(`-- RemindCore Database Schema (PostgreSQL 16)
-- Вижте пълния файл в /docs/02_DATABASE_SCHEMA.md`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Database className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-semibold text-white">
                PostgreSQL 16 Схема и Индекси
              </h3>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Преглед на структурите, релациите, първичните и външни ключове за RemindCore.
            </p>
          </div>

          <a
            href="#full-ddl"
            onClick={handleCopy}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5 w-fit"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Копирай DDL Референция</span>
          </a>
        </div>

        {/* Table Selector Pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {TABLES.map((table) => (
            <button
              key={table.name}
              onClick={() => setSelectedTable(table.name)}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                selectedTable === table.name
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
              }`}
            >
              <Table className="w-3.5 h-3.5 opacity-70" />
              <span>{table.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Table Detail */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-emerald-400">{activeTable.name}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Категория: {activeTable.category}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{activeTable.description}</p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {activeTable.columns.length} колони
          </span>
        </div>

        {/* Column Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Колона</th>
                <th className="py-2.5 px-4">Тип Данни</th>
                <th className="py-2.5 px-4">Ограничения</th>
                <th className="py-2.5 px-4">Релация</th>
                <th className="py-2.5 px-4">Предназначение</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {activeTable.columns.map((col, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-slate-200 flex items-center gap-1.5">
                    {col.isPk && (
                      <span title="Primary Key">
                        <Key className="w-3 h-3 text-amber-400" />
                      </span>
                    )}
                    {col.name}
                  </td>
                  <td className="py-2.5 px-4 text-emerald-400">{col.type}</td>
                  <td className="py-2.5 px-4 text-slate-400">
                    {col.nullable ? 'NULLABLE' : <span className="text-amber-300/80 font-bold">NOT NULL</span>}
                  </td>
                  <td className="py-2.5 px-4 text-indigo-400">
                    {col.ref ? (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/30">
                        → {col.ref}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-300">{col.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Index Optimization Callout */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <Info className="w-4 h-4 text-indigo-400" />
          <span>Ключови частични индекси за Scheduler заявките (0ms забавяне):</span>
        </div>
        <pre className="font-mono text-indigo-300 bg-slate-900 p-2.5 rounded border border-slate-800 overflow-x-auto">
{`CREATE INDEX idx_instances_pending_due ON reminder_instances (scheduled_at) WHERE status = 'Pending';
CREATE INDEX idx_instances_escalation ON reminder_instances (next_escalation_at) WHERE status IN ('Triggered', 'Snoozed');`}
        </pre>
      </div>
    </div>
  );
};
