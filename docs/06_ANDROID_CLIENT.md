# Архитектурен План: Спецификация на Android Клиента
## Документ: 06_ANDROID_CLIENT.md

Този документ описва архитектурата на мобилното приложение за Android, управлението на персонализирани звуци (Custom Sounds), каналите за известия (Notification Channels) и минималистичния потребителски интерфейс.

---

### 1. Избор на Технологичен Стек за Android

Потребителско изискване:
> *"На телефона може и да е нещо по-опростено - само нотификации или просто менажиране (view + disable)... По възможност искам да получавам custom звуков сигнал"*

#### Препоръка: **Native Android (Kotlin + Jetpack Compose)** *или* **React Native с Native Module**
- **Препоръка**: **Native Kotlin** (или много лек React Native с нативен BroadcastReceiver).
- **Защо Native Kotlin за този случай?**
  1. **Минимален отпечатък в паметта**: под 15 MB APK, 0ms студен старт при получаване на Push.
  2. **100% контрол над Custom Sounds и Notification Channels**: директен достъп до `android.media.AudioAttributes` и `res/raw/`.
  3. **Бутони за действие директно от заключения екран**: `BroadcastReceiver` изпраща HTTP заявката за "Изпълнено" директно към сървъра, без изобщо да стартира UI екран!

---

### 2. Персонализирани Звукови Сигнали (Custom Sound Architecture)

В Android 8.0+ (API 26+) звукът на нотификацията **не може да се променя ad-hoc** за единично известие, ако каналът не е конфигуриран предварително с този звук. Затова RemindCore регистрира предварително дефинирани **Notification Channels** с асоциирани аудио файлове в директория `res/raw/`:

```
android-app/
  ├── app/src/main/
  │   ├── res/
  │   │   ├── raw/
  │   │   │   ├── sound_medical_alarm.ogg   <-- Силен, ясен медицински сигнал
  │   │   │   ├── sound_appliance_chime.ogg <-- Спокойна двукратна камбанка
  │   │   │   └── sound_gentle_harp.ogg     <-- Плавно събуждане
```

#### Инициализация на Каналите в Kotlin (`NotificationHelper.kt`):

```kotlin
fun createNotificationChannels(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val notificationManager = context.getSystemService(NotificationManager::class.java)

        // 1. Медицински канал (Висок приоритет + Алармен звук)
        val medicalSoundUri = Uri.parse("android.resource://${context.packageName}/raw/sound_medical_alarm")
        val audioAttributes = AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .setUsage(AudioAttributes.USAGE_ALARM)
            .build()

        val medicalChannel = NotificationChannel(
            "remindcore_medical",
            "Медицински напомняния",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Критични напомняния за лекарства и терапия"
            setSound(medicalSoundUri, audioAttributes)
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 500, 200, 500)
        }

        // 2. Канал за поддръжка и уреди
        val applianceSoundUri = Uri.parse("android.resource://${context.packageName}/raw/sound_appliance_chime")
        val applianceChannel = NotificationChannel(
            "remindcore_appliance",
            "Поддръжка на дома и уреди",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "Периодична профилактика (пералня, филтри, сервиз)"
            setSound(applianceSoundUri, audioAttributes)
        }

        notificationManager.createNotificationChannels(listOf(medicalChannel, applianceChannel))
    }
}
```

---

### 3. Обработка на Бутони без отваряне на приложението (`NotificationActionReceiver`)

Когато потребителят натисне **"Маркирай Изпълнено"** в известието:

```kotlin
class NotificationActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val instanceId = intent.getStringExtra("INSTANCE_ID") ?: return
        val notificationId = intent.getIntExtra("NOTIFICATION_ID", 0)
        val action = intent.action

        // Затваряме нотификацията веднага
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.cancel(notificationId)

        val idempotencyKey = UUID.randomUUID().toString()

        // Изпращаме фонова заявка към домашния сървър през CoroutineScope
        CoroutineScope(Dispatchers.IO).launch {
            try {
                when (action) {
                    "ACTION_COMPLETE" -> RemindCoreApiClient.markCompleted(context, instanceId, idempotencyKey)
                    "ACTION_SNOOZE_1H" -> RemindCoreApiClient.snooze(context, instanceId, preset = "PlusOneHour")
                    "ACTION_SNOOZE_SMART" -> {
                        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
                        val preset = if (hour < 17) "TonightEvening2000" else "TomorrowMorning0900"
                        RemindCoreApiClient.snooze(context, instanceId, preset = preset)
                    }
                }
            } catch (e: Exception) {
                // Ако сървърът е временно недостъпен (офлайн/метро),
                // задачата се записва с idempotencyKey в WorkManager за сигурно изпращане при поява на мрежа!
                RemindCoreSyncWorker.enqueueAction(context, action, instanceId, idempotencyKey)
            }
        }
    }
}
```

---

### 4. Потребителски Интерфейс на Android (Опростен Преглед)

Екраните са максимално изчистени:
1. **Екран "Днес и Предстоящи" (Pending List)**:
   - Списък с активните и предстоящи напомняния.
   - Еднократно докосване за маркиране като изпълнено.
   - **Бутон "Изпълни предсрочно"** за задачи, насрочени за по-късно през седмицата.
   - Суич за бързо включване/изключване (`Disable/Enable`).
2. **Екран "Всички правила" (Rules Overview)**:
   - Преглед на правилата (заглавие, цикъл, часове за прием, следваща дата).
   - Възможност за паузиране на правило.
3. **Екран "Настройки"**:
   - Google Account вход / статус (Bearer JWT).
   - Тестване на звуковите сигнали (бутон за прослушване на всеки канал).
   - Тестов Push бутон за проверка на Cloudflare тунела.
