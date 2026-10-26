import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, MessageSquare, AlertCircle, Copy, Check, ChevronRight } from 'lucide-react';

interface QuestionTopic {
  id: string;
  number: number;
  title: string;
  context: string;
  options: {
    id: string;
    label: string;
    isRecommended?: boolean;
    description: string;
    pros: string;
    cons: string;
  }[];
}

const TOPICS: QuestionTopic[] = [
  {
    id: 'cf_mode',
    number: 1,
    title: 'Cloudflare Zero Trust защита за Android Приложението',
    context: 'Искате домашният сървър да е строго защитен през Cloudflare Tunnel и ограничен само за логнати потребители.',
    options: [
      {
        id: 'dual_layer',
        label: 'Двуслоен модел (Препоръчан)',
        isRecommended: true,
        description: 'Web панелът (/) изисква Cloudflare Zero Trust вход с Google. Заявките към /api/* минават през тунела и се валидират с Google JWT Bearer Token директно в .NET 9.',
        pros: 'Android телефонът се логва нормално през Google OAuth без нужда от сложни Service Tokens в приложението.',
        cons: 'Изисква конфигурация на едно изключение (Bypass rule за /api/*) в Cloudflare Zero Trust конзолата.'
      },
      {
        id: 'full_isolation',
        label: 'Пълна Cloudflare изолация',
        description: 'Целият домейн е заключен. В Android приложението се въвеждат секретни заглавки (CF-Access-Client-Id и Secret).',
        pros: 'Абсолютна нулева видимост отвън — дори API пътищата изискват таен Cloudflare токен.',
        cons: 'Изисква ръчно въвеждане на Service Token при първоначална инсталация на Android телефона.'
      }
    ]
  },
  {
    id: 'calendar_type',
    number: 2,
    title: 'Интеграция с Google Calendar',
    context: 'Споменахте, че показването в Google Calendar е опционално.',
    options: [
      {
        id: 'api_v3',
        label: 'Директен Google Calendar API v3 (Препоръчан)',
        isRecommended: true,
        description: 'При маркиране като "Изпълнено" на телефона, събитието в календара веднага се премества, маркира като зелено [✓ Изпълнено] и се насрочва следващото.',
        pros: 'Мигновена двупосочна синхронизация в реално време, цветово кодиране.',
        cons: 'Изисква еднократно генериране на OAuth Client ID в Google Cloud Console.'
      },
      {
        id: 'ical_feed',
        label: 'Лек частен iCal / ICS Feed',
        description: 'Сървърът генерира webcal:// линк, който добавяте в Google Calendar с 1 клик.',
        pros: 'Нулева нужда от Google Cloud Console или OAuth токени за календара.',
        cons: 'Google Calendar опреснява външни iCal линкове бавно (на всеки 8-24 часа).'
      }
    ]
  },
  {
    id: 'custom_audio',
    number: 3,
    title: 'Персонализирани Звуци на Телефона (Android)',
    context: 'Искате custom звуков сигнал за различните категории (лекарства, профилактика на пералня).',
    options: [
      {
        id: 'bundled_sounds',
        label: 'Вграден пакет висококачествени звуци в APK (Препоръчан)',
        isRecommended: true,
        description: 'Вграждаме 6-8 специализирани аудио файла в res/raw/ (силен медицински звън, камбанка за уреди, плавен гонг). През Web UI избирате кой звук да се свири.',
        pros: '100% стабилност на всички Android версии (10-15), работи мигновено при заключен екран.',
        cons: 'Добавянето на изцяло нови аудио файлове изисква прекомпилация на мобилното приложение.'
      },
      {
        id: 'dynamic_upload',
        label: 'Динамично качване на .mp3 през Web',
        description: 'Качвате ваши .mp3/.wav файлове през Web UI, а Android приложението ги тегли локално в телефона и създава динамични Notification Channels.',
        pros: 'Можете да добавяте произволни ваши мелодии по всяко време.',
        cons: 'Възможни проблеми с Android 12+ Doze permissions и забавяне при синхронизация на звуковите файлове.'
      }
    ]
  },
  {
    id: 'time_preservation',
    number: 4,
    title: 'Запазване на часа при плаващ график (From Completion)',
    context: 'Ако лекарство или профилактика е настроена за 08:00 сутринта, но я маркирате като готова в 14:30 следобед.',
    options: [
      {
        id: 'preserve_target_time',
        label: 'Запазване на базов час (напр. 08:00 сутрин) (Препоръчано)',
        isRecommended: true,
        description: 'Следващият период започва от датата на изпълнение, но алармата ще звънне отново в 08:00 сутринта.',
        pros: 'Не нарушава обичайния ви дневен режим (напр. лекарствата остават сутрин).',
        cons: 'Периодът не е абсолютно математически на секундата 72 часа, а до следващата сутрин.'
      },
      {
        id: 'exact_delay',
        label: 'Строго относително (точно на секундата)',
        description: 'Следващото напомняне се изчислява точно на 72 часа след натискане на бутона (т.е. в 14:30 следобед).',
        pros: 'Математически строг интервал между дозите.',
        cons: 'С времето часът на напомняне може да се измести в неудобно време (напр. през нощта).'
      }
    ]
  },
  {
    id: 'multi_device',
    number: 5,
    title: 'Синхронизация между устройства (Телефон + Таблет)',
    context: 'Ако имате повече от едно мобилно устройство с инсталирано приложение.',
    options: [
      {
        id: 'silent_dismiss',
        label: 'Тих Push за изчистване на известията (Препоръчано)',
        isRecommended: true,
        description: 'Когато натиснете "Готово" на телефона, сървърът праща тих Push към таблета, който скрива нотификацията от неговата лента.',
        pros: 'Няма дразнещи висящи известия на другите ви екрани.',
        cons: 'Минимален допълнителен трафик през FCM.'
      },
      {
        id: 'single_device',
        label: 'Самостоятелни устройства',
        description: 'Всяко устройство управлява нотификациите си локално при отваряне на приложението.',
        pros: 'Максимално опростена логика.',
        cons: 'Ако маркирате задача на телефона, тя може да остане да свети на таблета, докато не я отворите.'
      }
    ]
  }
];

export const DiscussionTracker: React.FC = () => {
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({
    cf_mode: 'dual_layer',
    calendar_type: 'api_v3',
    custom_audio: 'bundled_sounds',
    time_preservation: 'preserve_target_time',
    multi_device: 'silent_dismiss'
  });

  const [copied, setCopied] = useState<boolean>(false);

  const handleSelect = (topicId: string, optionId: string) => {
    setSelectedChoices((prev) => ({
      ...prev,
      [topicId]: optionId
    }));
  };

  const generateSummaryText = () => {
    let summary = `## Валидирани Архитектурни Предпочитания (RemindCore)\n\n`;
    TOPICS.forEach((t) => {
      const chosenOptionId = selectedChoices[t.id];
      const opt = t.options.find((o) => o.id === chosenOptionId);
      summary += `### ${t.number}. ${t.title}\n`;
      summary += `- **Избран вариант:** ${opt?.label}\n`;
      summary += `- **Описание:** ${opt?.description}\n\n`;
    });
    return summary;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateSummaryText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <HelpCircle className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-semibold text-white">
                Въпроси за Дискусия и Архитектурни Решения
              </h3>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Прегледайте 5-те ключови решения за сигурността, аудиото, календара и часовите зони. Можете да изберете вашите предпочитания и да ги копирате.
            </p>
          </div>

          <button
            onClick={handleCopy}
            className="px-3.5 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5 w-fit shadow-md"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>Копирай избраните отговори</span>
          </button>
        </div>

        {/* Validated Feedback Summary */}
        <div className="mt-4 pt-3 bg-slate-950/60 rounded-lg p-4 border border-slate-800">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/80">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Валидирани решения от потребителя (Последно обновяване)
            </span>
            <span className="text-[11px] font-mono text-slate-400">ADR Record v1.1</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <div className="text-slate-400 text-[11px]">Cloudflare достъп</div>
              <div className="text-emerald-300 font-semibold mt-0.5">Двуслоен модел (Одобрен)</div>
              <div className="text-[11px] text-slate-400 mt-0.5">CF Zero Trust за Web + Google JWT за API</div>
            </div>

            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <div className="text-slate-400 text-[11px]">Предсрочно изпълнение</div>
              <div className="text-emerald-300 font-semibold mt-0.5">Одобрено (Complete Early)</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Флаг is_early_completion и преизчисляване</div>
            </div>

            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <div className="text-slate-400 text-[11px]">2–3 приема на ден</div>
              <div className="text-emerald-300 font-semibold mt-0.5">Одобрено (target_times[])</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Множество часове в едно общо правило</div>
            </div>

            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <div className="text-slate-400 text-[11px]">Бързо отлагане</div>
              <div className="text-emerald-300 font-semibold mt-0.5">Smart Quick Snooze (Одобрено)</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Бутони: [+1ч], [Довечера 20:00], [Утре 09:00]</div>
            </div>

            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <div className="text-slate-400 text-[11px]">История и статистика</div>
              <div className="text-emerald-300 font-semibold mt-0.5">Одобрено (Compliance Stats)</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Метрики за средно закъснение и редовност</div>
            </div>

            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <div className="text-slate-400 text-[11px]">Резервно копие</div>
              <div className="text-emerald-300 font-semibold mt-0.5">1-Click JSON Backup (Одобрено)</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Еднократен експорт и възстановяване</div>
            </div>
          </div>

          <div className="mt-3 pt-2 text-[11px] text-slate-400 flex flex-wrap gap-4 border-t border-slate-800/60">
            <span>• <strong>Тихи часове:</strong> Пропуснати (разчита се на Android DND)</span>
            <span>• <strong>Локален Wi-Fi порт:</strong> Отхвърлен (само Cloudflare тунел)</span>
            <span>• <strong>Чеклист / Брояч на консумативи:</strong> Пропуснати за v1</span>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {TOPICS.map((topic) => {
          const currentChoice = selectedChoices[topic.id];

          return (
            <div
              key={topic.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-bold flex items-center justify-center">
                      {topic.number}
                    </span>
                    <h4 className="font-semibold text-white text-base">
                      {topic.title}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 pl-8">
                    {topic.context}
                  </p>
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {topic.options.map((option) => {
                  const isSelected = currentChoice === option.id;

                  return (
                    <div
                      key={option.id}
                      onClick={() => handleSelect(topic.id, option.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-slate-850 border-indigo-500 ring-1 ring-indigo-500/40 shadow-md'
                          : 'bg-slate-950/40 border-slate-800 hover:bg-slate-850/50 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-500'
                                : 'border-slate-600 bg-transparent'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span className="font-semibold text-sm text-slate-200">
                            {option.label}
                          </span>
                        </div>
                        {option.isRecommended && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                            Препоръчан
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                        {option.description}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-1 gap-1 text-[11px]">
                        <div className="text-emerald-400 flex items-start gap-1">
                          <span className="font-bold">Плюс:</span> {option.pros}
                        </div>
                        <div className="text-amber-400/90 flex items-start gap-1">
                          <span className="font-bold">Минус:</span> {option.cons}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
