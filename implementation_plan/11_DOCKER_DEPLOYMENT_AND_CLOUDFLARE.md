# Step 11: Docker Containerization & Cloudflare Deployment

## 1. Objective
Containerize the entire RemindCore ecosystem using Docker Compose, establish automated database backups, and connect the home server to Cloudflare Edge via `cloudflared` without opening any incoming ports on the home router according to `docs/09_SECURITY_AND_DEPLOYMENT.md`.

---

## 2. Production Docker Architecture

```
Internet (HTTPS)
      │
      ▼
[ Cloudflare Zero Trust Edge ]
      │ (Encrypted Outbound Tunnel)
      ▼
[ cloudflared daemon ] (Docker Container)
      │ (Internal Docker Network `remindcore-net`)
      ├──► [ Web Portal ] (Nginx Alpine + React build)
      ├──► [ Backend API ] (.NET 9 ASP.NET Core Web API)
      │         │
      │         └──► [ PostgreSQL 16 DB ] (Internal only, not exposed to host)
      │
      └──► [ Backup Cron Job ] (Nightly pg_dump with 14-day retention)
```

---

## 3. Security & Operational Standards
1. **Zero Open Ports**: Router firewall blocks all inbound traffic. All external traffic enters via `cloudflared` tunnel.
2. **Non-Root Containers**: Run .NET API under user `app` (`UID 1654`) and Nginx under `nginx`.
3. **Automated Database Backup**: Include a cron container executing `pg_dump -Fc` nightly to an encrypted local volume.

---

## 4. Key Deliverables
- [ ] Create multi-stage `Dockerfile.api` (.NET 9 SDK build -> ASP.NET Core runtime).
- [ ] Create multi-stage `Dockerfile.web` (Node build -> Nginx Alpine runtime).
- [ ] Implement production `docker-compose.yml` with health checks and restart policies.
- [ ] Provide `scripts/backup-db.sh` automated backup script.
- [ ] Provide sample `.env.example` with placeholders for DB credentials, FCM keys, and Cloudflare Tunnel tokens.

---

## 5. Verification & Smoke Test
- **Smoke Test Procedure**:
  ```bash
  # 1. Build and spin up the stack
  docker compose -f docker-compose.yml up -d --build

  # 2. Check health status
  docker compose ps
  curl -fsS http://localhost:5000/health || exit 1

  # 3. Test database backup script
  bash scripts/backup-db.sh
  ```

---

## 6. Living Documentation Checklist
- Add `docs/ops/DEPLOYMENT_AND_BACKUP_GUIDE.md` (under 140 lines) detailing disaster recovery steps, PostgreSQL restore commands, and Cloudflare Tunnel token rotation.
