# Архитектурен План: Сигурност и Деплоймънт на Домашен Сървър
## Документ: 09_SECURITY_AND_DEPLOYMENT.md

Този документ съдържа пълната стратегия за сигурност, мрежова изолация и Docker Compose конфигурация за домашния сървър.

---

### 1. Архитектура на Защитата (Defense-in-Depth)

```
[ Интернет / Мобилна мрежа ]
           │
           v
[ Cloudflare Edge ] 
   ├── 1. WAF & Bot Management: Филтриране на зловреден трафик
   ├── 2. Geo-Restriction: Разрешен трафик само от България/ЕС (по избор)
   ├── 3. Cloudflare Zero Trust (Access):
   │      - За Web UI: изисква Google Login или One-Time PIN преди въобще да стигне до сървъра!
   │      - За Android API: Cloudflare Service Token или директен JWT Pass-through
   └── 4. Rate Limiting: Максимум 60 заявки/мин на IP
           │
           │ (Криптиран изходящ тунел през порт 443 / QUIC)
           v
[ Домашен Рутер ]  ===> ВСИЧКИ ВХОДЯЩИ ПОРТОВЕ СА ЗАТВОРЕНИ (Port Forwarding: OFF)
           │
           v
[ Домашен Сървър (Ubuntu / Debian / Alpine Linux) ]
   ├── UFW Firewall: Разрешен само LAN трафик за поддръжка
   └── Docker Compose Isolated Stack:
         ├── cloudflared (свързва тунела към вътрешния nginx)
         ├── nginx (SSL termination, Security Headers, Static files)
         ├── remindcore-api (.NET 9 в non-root контейнер)
         └── postgres-db (ИЗОЛИРАН: няма публикуван порт към хост мрежата!)
```

---

### 2. Пълен `docker-compose.yml`

```yaml
version: '3.8'

networks:
  remindcore-edge:
    driver: bridge
  remindcore-backend:
    driver: bridge
    internal: true # НАПЪЛНО ИЗОЛИРАНА МРЕЖА: няма достъп до Интернет за базата данни!

services:
  # 1. Cloudflare Tunnel Daemon
  tunnel:
    image: cloudflare/cloudflared:latest
    container_name: remindcore-tunnel
    restart: unless-stopped
    command: tunnel run
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    networks:
      - remindcore-edge
    depends_on:
      - nginx

  # 2. Reverse Proxy (Nginx)
  nginx:
    image: nginx:alpine
    container_name: remindcore-nginx
    restart: unless-stopped
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./web-dist:/usr/share/nginx/html:ro
    networks:
      - remindcore-edge
    depends_on:
      - api

  # 3. .NET 9 Web API
  api:
    image: remindcore-api:latest
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: remindcore-api
    restart: unless-stopped
    user: "1000:1000" # Non-root изпълнение за максимална сигурност
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=Host=db;Port=5432;Database=remindcore;Username=${DB_USER};Password=${DB_PASS};SslMode=Prefer
      - Jwt__Secret=${JWT_SECRET}
      - Google__ClientId=${GOOGLE_CLIENT_ID}
      - Firebase__CredentialsPath=/app/secrets/firebase-admin.json
      - AllowedHosts=*
    volumes:
      - ./secrets:/app/secrets:ro
    networks:
      - remindcore-edge
      - remindcore-backend
    depends_on:
      - db

  # 4. PostgreSQL 16 База Данни
  db:
    image: postgres:16-alpine
    container_name: remindcore-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: remindcore
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init-db:/docker-entrypoint-initdb.d:ro
    networks:
      - remindcore-backend
    # ЗАБЕЛЕЖКА: Липсва директива "ports:"! Базата е достъпна само за API контейнера!

volumes:
  pgdata:
```

---

### 3. Настройка на Cloudflare Tunnel & Zero Trust Access

#### 3.1. Конфигурация на тунела (`config.yml` в Cloudflare Zero Trust Dashboard)
- **Public Hostname**: `reminders.yourdomain.com`
- **Service**: `HTTP -> http://nginx:80`

#### 3.2. Политика за Достъп (Cloudflare Access Policy)
- **Application Name**: `RemindCore Web & API`
- **Session Duration**: 1 month (за да не се логва постоянно на личния компютър).
- **Rule**:
  - `Include`: `Emails` -> `v.dublekov@gmail.com` (вашият личен Google имейл).
  - Всички останали заявки се отрязват директно на ниво Cloudflare Edge с HTTP 403, преди да са стигнали домашния ви интернет!

#### 3.3. Достъп за Android приложението
За Android се препоръчва един от двата подхода:
1. **Cloudflare Service Token**: В Android приложението се добавят две HTTP заглавки:
   - `CF-Access-Client-Id: xxx.access`
   - `CF-Access-Client-Secret: yyy.secret`
   Това позволява на телефона да мине безпроблемно през Cloudflare Access бариерата и да направи стандартен Google OAuth логин.
2. **Директен Bypass Path за `/api/` с валидация на Google JWT**: Cloudflare Access пази само Web UI кореновия адрес `/`, а `/api/*` валидира криптографски Google JWT токена в .NET backend-а.

---

### 4. Автоматични Резервни Копия (Backup Strategy)

Лесен cron скрипт на домашния сървър (`/etc/cron.daily/remindcore-backup.sh`):

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/remindcore"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Извличане на дъмп директно от работещия контейнер
docker exec -t remindcore-db pg_dump -U remindcore_user remindcore | gzip > "$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Запазване само на последните 14 дни
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +14 -delete
```
