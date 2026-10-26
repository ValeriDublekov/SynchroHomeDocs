# Архитектурен План: Механизъм за Преизчисляване на Повторения
## Документ: 04_RECURRENCE_ENGINE.md

Този документ разглежда в детайли математиката, бизнес логиката и крайните случаи при изчисляване на следващите дати на напомняне.

---

### 1. Двата Режима на Преизчисляване

Потребителят има ключово изискване:
> *"Искам да мога да маркирам задачата като изпълнена, но да имам опция когато я настройвам дали периода да се преизчислява от момента в който е изпълнена (ако например съм отложил с 1 седмица, 2 месеца да се смятат от този момент а не от оригиналния) или да е фиксирано."*

#### Сравнителна таблица

| Режим (`calculation_base`) | Описание | Пример (Пералня: всеки 2 месеца) |
|---|---|---|
| **`FromScheduledDate` (Фиксиран график)** | Следващата дата се добавя към *първоначално планираната* дата, независимо кога е изпълнена. | Планирано: **1 Ноември**.<br>Реално изпълнено: **8 Ноември** (+7 дни закъснение).<br>Следваща дата: **1 Януари** (строго на 2 месеца от първоначалния график). |
| **`FromCompletion` (Плаващ график)** | Следващата дата се изчислява от *момента на маркиране като изпълнено* (или посочена дата на реално изпълнение). | Планирано: **1 Ноември**.<br>Реално изпълнено: **8 Ноември**.<br>Следваща дата: **8 Януари** (2 месеца от реалното действие). |

---

### 2. Формула и Алгоритъм (C# Service Logic)

```csharp
public class RecurrenceCalculationEngine
{
    public DateTimeOffset CalculateNextOccurrence(
        RecurrenceRule rule, 
        DateTimeOffset scheduledAt, 
        DateTimeOffset? completedAt, 
        TimeZoneInfo userTimeZone)
    {
        // 1. Избор на базова дата
        DateTimeOffset baseDateTime;
        if (rule.CalculationBase == RecurrenceCalculationBase.FromCompletion && completedAt.HasValue)
        {
            baseDateTime = completedAt.Value;
        }
        else
        {
            baseDateTime = scheduledAt;
        }

        // Конвертиране в локалното време на потребителя за коректно пресмятане на месеци и часове
        DateTime localBase = TimeZoneInfo.ConvertTime(baseDateTime, userTimeZone).DateTime;

        DateTime nextLocal;

        switch (rule.Frequency)
        {
            case RecurrenceFrequency.IntervalDays:
                // Добавяме точно X дни, запазвайки target_time
                DateTime datePlusDays = localBase.Date.AddDays(rule.IntervalValue);
                nextLocal = datePlusDays.Date + rule.TargetTime.ToTimeSpan();
                break;

            case RecurrenceFrequency.IntervalMonths:
                // Добавяме точно X месеца
                // Справяне с дни от месеца (напр. 31-во число в месец с 30 дни)
                int daysInTargetMonth = DateTime.DaysInMonth(
                    localBase.AddMonths(rule.IntervalValue).Year, 
                    localBase.AddMonths(rule.IntervalValue).Month
                );
                int dayToUse = Math.Min(localBase.Day, daysInTargetMonth);
                
                DateTime monthBase = localBase.AddMonths(rule.IntervalValue);
                nextLocal = new DateTime(monthBase.Year, monthBase.Month, dayToUse) + rule.TargetTime.ToTimeSpan();
                break;

            case RecurrenceFrequency.IntervalWeeks:
                DateTime datePlusWeeks = localBase.Date.AddDays(rule.IntervalValue * 7);
                nextLocal = datePlusWeeks.Date + rule.TargetTime.ToTimeSpan();
                break;

            default:
                throw new NotSupportedException($"Frequency {rule.Frequency} not supported.");
        }

        // Връщаме в UTC с правилния офсет според лятно/зимно часово време (DST)
        TimeSpan offset = userTimeZone.GetUtcOffset(nextLocal);
        return new DateTimeOffset(nextLocal, offset);
    }
}
```

---

### 3. Специфични сценарии и крайни случаи

#### 3.1. Сценарий: Лекарство на всеки X дни в определен час
- Потребителят въвежда:
  - `frequency`: `IntervalDays`
  - `interval_value`: `3` (на всеки 3 дни)
  - `target_time`: `08:00:00`
  - `calculation_base`: обикновено `FromScheduledDate` (за да не се разтегля курсът на лечение) или `FromCompletion` ако изпиването изисква строг 72-часов интервал.
- **Действие при закъснение**:
  - Ако лекарството е трябвало да се изпие днес в 08:00, но е маркирано в 14:00:
    - При `FromScheduledDate`: Следващата доза е след 3 дни в **08:00**.
    - При `FromCompletion`: Следващата доза е 3 дни след днешната дата в **08:00** (запазва се сутрешният час) или в 14:00 (ако потребителят изрично поиска запазване на точния час на изпълнение).

#### 3.2. Смяна на лятно и зимно часово време (Daylight Saving Time - DST)
- Всички времена в базата данни се записват в **UTC (`TIMESTAMPTZ`)**.
- Но изчислението `+ 2 месеца` се извършва в **Wall-Clock времето** на потребителя (`Europe/Sofia`):
  - Задача настроена за 10:30 през октомври (UTC+3) ще се задейства точно в 10:30 и през ноември (UTC+2), без да се измества с един час напред или назад!

#### 3.3. Какво става при пропускане (Missed / Skipped)?
- Ако потребителят натисне **"Пропусни" (Skip)**:
  - Инстанцията получава статус `Skipped`.
  - Датата за следващия цикъл се изчислява автоматично, все едно че е била планирана по стандартния фиксиран цикъл.

#### 3.4. Сценарий: Лекарства с 2–3 приема дневно (`target_times`)
- Когато правилото съдържа масив от часове (напр. `target_times = ['08:00', '14:00', '20:00']`):
  1. При маркиране на дозата в 08:00 ч. като изпълнена, Recurrence Engine преглежда списъка от часове за днешния ден.
  2. Следващата инстанция веднага се насрочва за следващия наличен час от масива (**14:00 ч.** на същия ден).
  3. Когато се изпълни последната доза за деня (20:00 ч.), следващата инстанция се превърта за първия час (**08:00 ч.**) след `interval_value` дни.
  4. Така потребителят управлява целия курс на лечение с **едно общо правило**, вместо с 3 отделни!

#### 3.5. Сценарий: Предсрочно изпълнение (Complete Early)
- Ако поддръжката на пералнята е за неделя, но потребителят я свърши в петък:
  - Потребителят натиска **"Изпълни предсрочно"** в Web или мобилния списък.
  - Текущата предстояща инстанция получава: `status = 'Completed'`, `is_early_completion = TRUE`, `completed_at = NOW()`.
  - При `calculation_base = 'FromCompletion'`, следващите 2 месеца се отброяват веднага от петък.
  - При `calculation_base = 'FromScheduledDate'`, следващите 2 месеца остават фиксирани спрямо оригиналния календарен цикъл.
  - Всички предварително подготвени аларми за неделя се отменят автоматично.
