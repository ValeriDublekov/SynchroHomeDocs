import React, { useState, useEffect } from 'react';
import { Bell, Volume2, CheckCircle2, Clock, Smartphone, Play, RotateCcw, AlertCircle, ShieldAlert } from 'lucide-react';

export const EscalationSimulator: React.FC = () => {
  // Escalation Steps
  const steps = [
    {
      step: 0,
      name: 'Първично известие',
      timeLabel: '09:00 (Начален час)',
      delayText: 'Точно в зададения час',
      sound: 'sound_medical_alarm (Силен алармен тон)',
      channel: 'remindcore_medical',
      title: 'Време е за лекарство (Сутрешна доза)',
      body: 'Моля вземете предписаната доза с чаша вода.',
      urgency: 'Normal'
    },
    {
      step: 1,
      name: 'Ескалация 1 (+1 час)',
      timeLabel: '10:00 (+60 минути)',
      delayText: 'След 1 час закъснение',
      sound: 'sound_medical_alarm (Двукратен звън)',
      channel: 'remindcore_medical',
      title: 'Напомняне (+1ч): Лекарството не е отбелязано',
      body: 'Все още няма отбелязване. Моля потвърдете прием.',
      urgency: 'Medium'
    },
    {
      step: 2,
      name: 'Ескалация 2 (+2 часа)',
      timeLabel: '12:00 (+2 часа след първото напомняне)',
      delayText: 'След още 2 часа (+3 часа общо)',
      sound: 'sound_urgent_buzzer (По-настоятелен сигнал)',
      channel: 'remindcore_medical',
      title: 'ВАЖНО (+3ч): Пропусната сутрешна доза',
      body: 'Внимание: Дозата закъснява с 3 часа. Вземете я веднага.',
      urgency: 'High'
    },
    {
      step: 3,
      name: 'Ескалация 3 (На следващия ден)',
      timeLabel: 'Следващия ден 09:00 (+24 часа)',
      delayText: 'Следваща сутрин',
      sound: 'sound_gentle_harp (Дневно обобщение)',
      channel: 'remindcore_daily',
      title: 'Просрочена задача от вчера',
      body: 'Имате неизпълнено напомняне от вчерашния ден.',
      urgency: 'Warning'
    }
  ];

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isSnoozed, setIsSnoozed] = useState<boolean>(false);
  const [snoozeUntil, setSnoozeUntil] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([
    '09:00:00 [Quartz] Инстанцията е активирана. Изпратен FCM High-Priority Push към Android Pixel 8.',
  ]);

  const activeStep = steps[currentStepIndex];

  // Mock sound playback using Web Audio Synth API
  const playSimulatedSound = (type: string) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type.includes('urgent')) {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.15);
      } else if (type.includes('chime')) {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.setValueAtTime(750, audioCtx.currentTime + 0.1);
      }

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);

      setAudioPlaying(true);
      setTimeout(() => setAudioPlaying(false), 450);
    } catch {
      // Audio context might be restricted before interaction
    }
  };

  // Next Escalation Step
  const triggerNextEscalation = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      setIsSnoozed(false);
      const logEntry = `${steps[nextIdx].timeLabel} [EscalationWorker] Няма отговор. Задействана Стъпка ${nextIdx} (${steps[nextIdx].name}). Push изпратен.`;
      setLogs((prev) => [logEntry, ...prev]);
      playSimulatedSound(steps[nextIdx].sound);
    }
  };

  // Complete
  const handleMarkDone = () => {
    setIsCompleted(true);
    const logEntry = `ВЕЧЕ ИЗПЪЛНЕНО [API /complete] Потребителят натисна "Маркирай Изпълнено". Всички следващи стъпки от стълбицата се анулират! Преизчислена е нова дата.`;
    setLogs((prev) => [logEntry, ...prev]);
  };

  // Snooze
  const handleSnooze = () => {
    setIsSnoozed(true);
    setSnoozeUntil('след 30 мин');
    const logEntry = `ОТЛОЖЕНО [API /snooze] Потребителят отложи напомнянето. Известието е скрито за 30 минути.`;
    setLogs((prev) => [logEntry, ...prev]);
  };

  // Reset
  const handleReset = () => {
    setCurrentStepIndex(0);
    setIsCompleted(false);
    setIsSnoozed(false);
    setSnoozeUntil(null);
    setLogs(['09:00:00 [Quartz] Инстанцията е активирана. Изпратен FCM High-Priority Push към Android Pixel 8.']);
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Bell className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-semibold text-white">
                Симулатор на Инкрементална Ескалация (Snooze Ladder)
              </h3>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Напомняне след: <strong>+1 час</strong>, втория път след <strong>още 2 часа</strong> и след това на <strong>следващия ден</strong>.
            </p>
          </div>

          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5 w-fit"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Рестарт на симулацията
          </button>
        </div>

        {/* Step Progress Line */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4">
          {steps.map((s, idx) => {
            const isPassed = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex && !isCompleted;
            const isFuture = idx > currentStepIndex || isCompleted;

            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border transition-all ${
                  isCurrent
                    ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30'
                    : isPassed
                    ? 'bg-slate-800/40 border-slate-700/50 text-slate-400'
                    : 'bg-slate-900/40 border-slate-800/60 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                    isCurrent ? 'bg-amber-500/20 text-amber-300 font-bold' : 'bg-slate-800 text-slate-400'
                  }`}>
                    Стъпка {s.step}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {s.timeLabel.split(' ')[0]}
                  </span>
                </div>
                <div className="text-sm font-medium text-slate-200 mt-1">
                  {s.name}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {s.delayText}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Stage: Android Mockup vs Server State */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Simulated Android Lock Screen Notification (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-indigo-400" />
              <span className="text-sm font-semibold text-slate-200">
                Визуализация на Android Lock Screen Notification
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              FCM Channel: <code className="text-indigo-300">{activeStep.channel}</code>
            </div>
          </div>

          {/* Android Notification Box */}
          {isCompleted ? (
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-6 text-center py-10">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-white">Задачата е маркирана като Изпълнена!</h4>
              <p className="text-sm text-slate-300 mt-1 max-w-md mx-auto">
                Нотификацията е затворена от системната лента. .NET Recurrence Engine преизчисли следващата дата, а всички бъдещи ескалации са спрени.
              </p>
              <button
                onClick={handleReset}
                className="mt-4 px-4 py-2 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                Симулирай ново събитие
              </button>
            </div>
          ) : isSnoozed ? (
            <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-6 text-center py-8">
              <Clock className="w-10 h-10 text-amber-400 mx-auto mb-2" />
              <h4 className="text-base font-semibold text-white">Отложено за {snoozeUntil}</h4>
              <p className="text-xs text-slate-400 mt-1">
                Нотификацията е скрита. Ако дотогава не бъде отбелязана като готова, ще се появи отново.
              </p>
              <button
                onClick={() => setIsSnoozed(false)}
                className="mt-3 px-3 py-1.5 text-xs rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Върни известието на екрана
              </button>
            </div>
          ) : (
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-sm">
              {/* Header inside notification */}
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-indigo-600 flex items-center justify-center text-[10px] text-white font-bold">
                    R
                  </div>
                  <span className="font-semibold text-slate-300">RemindCore</span>
                  <span>•</span>
                  <span>{activeStep.timeLabel.split(' ')[0]}</span>
                </div>
                <button
                  onClick={() => playSimulatedSound(activeStep.sound)}
                  className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors ${
                    audioPlaying
                      ? 'bg-amber-500/30 text-amber-300 border-amber-500/50'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                  title="Тествай звуковия сигнал"
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{audioPlaying ? 'Звучи...' : 'Чуй звука'}</span>
                </button>
              </div>

              {/* Title & Body */}
              <h5 className="text-sm font-bold text-white flex items-center gap-2">
                {activeStep.urgency === 'High' && <AlertCircle className="w-4 h-4 text-red-400" />}
                {activeStep.title}
              </h5>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {activeStep.body}
              </p>

              {/* Sound info */}
              <div className="mt-3 py-1.5 px-2.5 rounded bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Аудио ресурс (res/raw):</span>
                <code className="text-indigo-400 font-mono text-[10px]">{activeStep.sound}</code>
              </div>

              {/* Action Buttons (The core requirement!) */}
              <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-3">
                <button
                  onClick={handleMarkDone}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Маркирай Изпълнено
                </button>
                <button
                  onClick={handleSnooze}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 transition-all border border-slate-700 active:scale-95 cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  Отложи (+30 мин)
                </button>
              </div>
            </div>
          )}

          {/* Stepper Trigger Button for Testing */}
          {!isCompleted && currentStepIndex < steps.length - 1 && (
            <div className="mt-5 p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Потребителят не реагира на телефона?
              </span>
              <button
                onClick={triggerNextEscalation}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span>Симулирай закъснение: Ескалирай напред</span>
                <Play className="w-3 h-3 fill-current" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Live Event Logs & Server State (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Сървърен Одит Лог (.NET + FCM)
              </h4>
              <span className="text-[11px] font-mono text-slate-400">Live stream</span>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 text-xs font-mono">
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded border leading-relaxed ${
                    log.includes('ИЗПЪЛНЕНО')
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-semibold'
                      : log.includes('ВАЖНО') || log.includes('Задействана')
                      ? 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            <strong>FCM Доставка:</strong> Използва се приоритет <code>HIGH</code> за събуждане от Doze Mode на Android.
          </div>
        </div>
      </div>
    </div>
  );
};
