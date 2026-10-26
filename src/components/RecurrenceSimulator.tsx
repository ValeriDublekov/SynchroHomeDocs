import React, { useState } from 'react';
import { Calendar, Clock, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';

export const RecurrenceSimulator: React.FC = () => {
  // Preset scenarios
  const [frequency, setFrequency] = useState<'IntervalDays' | 'IntervalMonths'>('IntervalMonths');
  const [intervalValue, setIntervalValue] = useState<number>(2);
  const [targetTime, setTargetTime] = useState<string>('10:30');
  const [calcBase, setCalcBase] = useState<'FromScheduledDate' | 'FromCompletion'>('FromCompletion');
  
  // Simulation dates
  const [scheduledDate, setScheduledDate] = useState<string>('2026-11-01');
  const [delayDays, setDelayDays] = useState<number>(7); // delayed by 7 days (1 week late)
  const [timePreserveMode, setTimePreserveMode] = useState<'PreserveTargetTime' | 'ExactCompletionTime'>('PreserveTargetTime');

  // Compute completion date
  const scheduledObj = new Date(`${scheduledDate}T${targetTime}:00`);
  const completedObj = new Date(scheduledObj.getTime() + delayDays * 24 * 60 * 60 * 1000);
  
  // Format Date Helper
  const formatDate = (d: Date) => {
    return d.toLocaleDateString('bg-BG', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Helper to add interval
  const calculateOccurrences = (baseType: 'FromScheduledDate' | 'FromCompletion', count: number = 4) => {
    const results: { step: number; scheduled: Date; note: string }[] = [];
    
    // First step
    results.push({
      step: 1,
      scheduled: scheduledObj,
      note: 'Първоначално планирано събитие'
    });

    let currentBase = baseType === 'FromCompletion' ? new Date(completedObj) : new Date(scheduledObj);

    for (let i = 2; i <= count; i++) {
      const nextDate = new Date(currentBase);
      if (frequency === 'IntervalDays') {
        nextDate.setDate(nextDate.getDate() + intervalValue);
      } else if (frequency === 'IntervalMonths') {
        nextDate.setMonth(nextDate.getMonth() + intervalValue);
      }

      if (timePreserveMode === 'PreserveTargetTime') {
        const [hours, minutes] = targetTime.split(':').map(Number);
        nextDate.setHours(hours, minutes, 0, 0);
      }

      results.push({
        step: i,
        scheduled: nextDate,
        note: i === 2 
          ? (baseType === 'FromCompletion' 
              ? `Изчислено от датата на изпълнение (${formatDate(completedObj)}) + ${intervalValue} ${frequency === 'IntervalDays' ? 'дни' : 'месеца'}`
              : `Изчислено от първоначалния график (${formatDate(scheduledObj)}) + ${intervalValue} ${frequency === 'IntervalDays' ? 'дни' : 'месеца'}`)
          : `Следващ цикъл (+${intervalValue} ${frequency === 'IntervalDays' ? 'дни' : 'месеца'})`
      });

      currentBase = nextDate;
    }

    return results;
  };

  const fixedResults = calculateOccurrences('FromScheduledDate');
  const floatingResults = calculateOccurrences('FromCompletion');

  return (
    <div className="space-y-6">
      {/* Header & Preset Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <RefreshCw className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-semibold text-white">
                Интерактивен Симулатор на Преизчисляването
              </h3>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Тествайте на живо двата алгоритъма: <strong>Фиксиран график</strong> срещу <strong>Плаващ график от момента на изпълнение</strong>.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setFrequency('IntervalMonths');
                setIntervalValue(2);
                setScheduledDate('2026-11-01');
                setDelayDays(7);
                setCalcBase('FromCompletion');
                setTargetTime('10:30');
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/50 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Пример: Пералня (2 месеца)
            </button>
            <button
              onClick={() => {
                setFrequency('IntervalDays');
                setIntervalValue(3);
                setScheduledDate('2026-11-01');
                setDelayDays(1);
                setCalcBase('FromScheduledDate');
                setTargetTime('08:00');
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/50 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Пример: Лекарство (3 дни)
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Честота на напомняне
            </label>
            <div className="flex gap-2">
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="IntervalMonths">Месеци</option>
                <option value="IntervalDays">Дни</option>
              </select>
              <input
                type="number"
                min="1"
                max="365"
                value={intervalValue}
                onChange={(e) => setIntervalValue(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 text-center focus:ring-indigo-500 focus:border-indigo-500 font-mono"
              />
            </div>
            <span className="text-xs text-slate-500 mt-1 block">
              Всеки {intervalValue} {frequency === 'IntervalMonths' ? 'месеца' : 'дни'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Планирана дата и час
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <input
                type="time"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                className="w-28 bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 font-mono text-center focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <span className="text-xs text-slate-500 mt-1 block">
              Базов час за звънене
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Закъснение при изпълнението
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="30"
                value={delayDays}
                onChange={(e) => setDelayDays(parseInt(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <span className="px-2.5 py-1 text-xs font-mono font-medium rounded bg-slate-800 border border-slate-700 text-amber-300 min-w-16 text-center">
                +{delayDays} {delayDays === 1 ? 'ден' : 'дни'}
              </span>
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              Изпълнено на: <strong>{formatDate(completedObj)}</strong>
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Режим на преизчисляване
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-800 border border-slate-700 rounded-lg">
              <button
                onClick={() => setCalcBase('FromCompletion')}
                className={`text-xs py-1.5 px-2 rounded font-medium transition-colors ${
                  calcBase === 'FromCompletion'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Плаващ (от изпълнение)
              </button>
              <button
                onClick={() => setCalcBase('FromScheduledDate')}
                className={`text-xs py-1.5 px-2 rounded font-medium transition-colors ${
                  calcBase === 'FromScheduledDate'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Фиксиран график
              </button>
            </div>
            <span className="text-xs text-slate-500 mt-1 block">
              {calcBase === 'FromCompletion' ? 'Смята от момента на маркиране' : 'Смята строго от оригиналната дата'}
            </span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Floating (From Completion) Card */}
        <div className={`border rounded-xl p-5 transition-all ${
          calcBase === 'FromCompletion'
            ? 'bg-slate-900/90 border-indigo-500 ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-500/5'
            : 'bg-slate-900/50 border-slate-800 opacity-80'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
              <h4 className="font-semibold text-white text-base">
                Вариант 1: Плаващ график (FromCompletion)
              </h4>
            </div>
            {calcBase === 'FromCompletion' && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30">
                Активен избор
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-2 mb-4 leading-relaxed">
            Ако потребителят отложи профилактиката с {delayDays} дни, следващият 2-месечен период започва <strong>ОТ ДАТАТА НА ИЗПЪЛНЕНИЕ</strong>.
          </p>

          <div className="space-y-3">
            {floatingResults.map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-sm flex items-start justify-between gap-3 ${
                  idx === 0
                    ? 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                    : idx === 1
                    ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
                    : 'bg-slate-800/30 border-slate-800 text-slate-400'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Цикъл #{item.step}
                    </span>
                    <span className="font-semibold text-slate-100">
                      {formatDate(item.scheduled)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {item.note}
                  </p>
                </div>
                {idx === 0 && (
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                    Маркирано +{delayDays}д
                  </span>
                )}
                {idx === 1 && (
                  <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 whitespace-nowrap font-semibold">
                    Нова дата (+2м)
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
            <strong>Резултат:</strong> Следващата профилактика ще бъде точно на{' '}
            <span className="font-bold underline text-white">{formatDate(floatingResults[1].scheduled)}</span>{' '}
            (не на 1 януари, а на {floatingResults[1].scheduled.getDate()}-то число).
          </div>
        </div>

        {/* Fixed Schedule Card */}
        <div className={`border rounded-xl p-5 transition-all ${
          calcBase === 'FromScheduledDate'
            ? 'bg-slate-900/90 border-indigo-500 ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-500/5'
            : 'bg-slate-900/50 border-slate-800 opacity-80'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <h4 className="font-semibold text-white text-base">
                Вариант 2: Фиксиран график (FromScheduledDate)
              </h4>
            </div>
            {calcBase === 'FromScheduledDate' && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30">
                Активен избор
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-2 mb-4 leading-relaxed">
            Дори потребителят да отложи задачата с {delayDays} дни, следващата дата остава твърдо закотвена към <strong>ОРИГИНАЛНИЯ ГРАФИК</strong>.
          </p>

          <div className="space-y-3">
            {fixedResults.map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-sm flex items-start justify-between gap-3 ${
                  idx === 0
                    ? 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                    : idx === 1
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    : 'bg-slate-800/30 border-slate-800 text-slate-400'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Цикъл #{item.step}
                    </span>
                    <span className="font-semibold text-slate-100">
                      {formatDate(item.scheduled)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {item.note}
                  </p>
                </div>
                {idx === 0 && (
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                    Закъснение +{delayDays}д
                  </span>
                )}
                {idx === 1 && (
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap font-semibold">
                    Твърдо по план
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            <strong>Резултат:</strong> Следващата дата си остава точно на{' '}
            <span className="font-bold underline text-white">{formatDate(fixedResults[1].scheduled)}</span>{' '}
            (независимо от закъснението, периодът между двете реални действия се скъсява).
          </div>
        </div>
      </div>

      {/* C# Code Generator Output */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Генериран .NET 9 Service Call за този случай
          </span>
          <span className="text-xs text-indigo-400 font-mono">RemindCore.Domain.RecurrenceRule</span>
        </div>
        <pre className="text-xs font-mono text-emerald-400 bg-slate-900 p-3 rounded-lg overflow-x-auto border border-slate-800/80 leading-relaxed">
{`var rule = new RecurrenceRule {
    Frequency = RecurrenceFrequency.${frequency},
    IntervalValue = ${intervalValue},
    TargetTime = TimeOnly.Parse("${targetTime}"),
    CalculationBase = RecurrenceCalculationBase.${calcBase},
    StartDate = DateOnly.Parse("${scheduledDate}")
};

// Изчисляване при маркиране "Изпълнено" на ${formatDate(completedObj)}
var nextDate = recurrenceEngine.CalculateNextOccurrence(
    rule,
    scheduledAt: DateTimeOffset.Parse("${scheduledDate}T${targetTime}:00+02:00"),
    completedAt: DateTimeOffset.Parse("${completedObj.toISOString()}"),
    userTimeZone: TimeZoneInfo.FindSystemIdByTimeZoneId("Europe/Sofia")
);
// Резултат: ${calcBase === 'FromCompletion' ? formatDate(floatingResults[1].scheduled) : formatDate(fixedResults[1].scheduled)}`}
        </pre>
      </div>
    </div>
  );
};
