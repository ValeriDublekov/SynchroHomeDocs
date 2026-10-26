import React, { useState } from 'react';
import { ShieldCheck, Lock, Server, Cloud, Terminal, Copy, Check, AlertTriangle, ArrowRight } from 'lucide-react';

export const SecurityArchitecture: React.FC = () => {
  const [copied, setCopied] = useState<boolean>(false);

  const dockerComposeContent = `version: '3.8'

networks:
  remindcore-edge:
    driver: bridge
  remindcore-backend:
    driver: bridge
    internal: true # ИЗОЛИРАНА ВЪТРЕШНА МРЕЖА: Няма достъп от Интернет до базата!

services:
  # 1. Cloudflare Tunnel Daemon (Няма отворени портове на рутера!)
  tunnel:
    image: cloudflare/cloudflared:latest
    container_name: remindcore-tunnel
    restart: unless-stopped
    command: tunnel run
    environment:
      - TUNNEL_TOKEN=\${CLOUDFLARE_TUNNEL_TOKEN}
    networks:
      - remindcore-edge
    depends_on:
      - nginx

  # 2. Reverse Proxy & Security Headers
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

  # 3. .NET 9 ASP.NET Core Web API
  api:
    image: remindcore-api:latest
    container_name: remindcore-api
    restart: unless-stopped
    user: "1000:1000" # Non-root изпълнение за максимална сигурност
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=Host=db;Port=5432;Database=remindcore;Username=\${DB_USER};Password=\${DB_PASS}
      - Jwt__Secret=\${JWT_SECRET}
      - Google__ClientId=\${GOOGLE_CLIENT_ID}
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
      POSTGRES_USER: \${DB_USER}
      POSTGRES_PASSWORD: \${DB_PASS}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - remindcore-backend # Липсват 'ports:'! Базата е недостъпна отвън!

volumes:
  pgdata:`;

  const handleCopy = () => {
    navigator.clipboard.writeText(dockerComposeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Защита на Домашния Сървър (Defense-in-Depth)
            </h3>
            <p className="text-sm text-slate-400 mt-0.5">
              Пълна сигурност без отваряне на портове на рутера, чрез Cloudflare Tunnel, Zero Trust Access и изолиран Docker стек.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Multi-Layer Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Layer 1: Edge */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
            <Cloud className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-white text-sm">1. Cloudflare Edge</h4>
          <span className="text-[11px] font-mono text-blue-400 block mt-0.5">WAF & Zero Trust Access</span>
          <ul className="text-xs text-slate-400 space-y-1.5 mt-3">
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-400">✓</span>
              <span><strong>0 отворени порта</strong> на домашния рутер (никакъв Port Forwarding).</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-400">✓</span>
              <span><strong>Google Login бариера</strong>: достъпът до Web се разрешава само за посочения Google имейл.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-400">✓</span>
              <span>DDoS филтър и ограничение на заявките (Rate limit 60/min).</span>
            </li>
          </ul>
        </div>

        {/* Layer 2: Host & Reverse Proxy */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
            <Server className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-white text-sm">2. Домашен Сървър & API</h4>
          <span className="text-[11px] font-mono text-purple-400 block mt-0.5">Ubuntu + Docker + .NET 9</span>
          <ul className="text-xs text-slate-400 space-y-1.5 mt-3">
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-400">✓</span>
              <span><strong>Non-root контейнери</strong> (User 1000:1000). Дори при компрометиране на API няма достъп до Linux root.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-400">✓</span>
              <span><strong>JWT валидация</strong> на всяка заявка от Android телефона.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-400">✓</span>
              <span>UFW защитна стена, разрешаваща достъп само от локалната LAN за SSH.</span>
            </li>
          </ul>
        </div>

        {/* Layer 3: Database Isolation */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
            <Lock className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-white text-sm">3. PostgreSQL Изолация</h4>
          <span className="text-[11px] font-mono text-emerald-400 block mt-0.5">Internal Docker Bridge</span>
          <ul className="text-xs text-slate-400 space-y-1.5 mt-3">
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-400">✓</span>
              <span><strong>Internal network: true</strong>. Базата данни НЯМА публичен или хост порт!</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-400">✓</span>
              <span>Достъпът е възможен ЕДИНСТВЕНО от контейнера <code>remindcore-api</code>.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-400">✓</span>
              <span>Автоматичен ежедневен дъмп (pg_dump) с 14-дневна ротация.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Docker Compose File Viewer */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold text-slate-200">
              docker-compose.yml (Готов за домашния сървър)
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Копирано' : 'Копирай файла'}</span>
          </button>
        </div>
        <div className="p-4">
          <pre className="text-xs font-mono text-emerald-400 overflow-x-auto max-h-[380px] leading-relaxed">
            {dockerComposeContent}
          </pre>
        </div>
      </div>
    </div>
  );
};
