import React, { useState } from 'react';
import { Network, Send, Copy, Check, Lock, ChevronDown, ChevronRight, Terminal } from 'lucide-react';

interface ApiRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  category: 'Reminders' | 'Instances & Actions' | 'Auth' | 'Devices';
  summary: string;
  description: string;
  requestBody?: string;
  responseBody: string;
}

const API_ROUTES: ApiRoute[] = [
  {
    method: 'POST',
    path: '/api/instances/{id}/complete',
    category: 'Instances & Actions',
    summary: 'Маркира инстанцията като ИЗПЪЛНЕНА и преизчислява следваща дата',
    description: 'Основният endpoint, викан от бутона [Маркирай Изпълнено] в Android нотификацията или от Web UI.',
    requestBody: JSON.stringify({
      completedAt: "2026-11-08T14:22:00Z",
      completionNote: "Успешна профилактика с Calgon на 90 градуса",
      deviceId: "d4e5f6a7-..."
    }, null, 2),
    responseBody: JSON.stringify({
      completedInstanceId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      status: "Completed",
      completedAt: "2026-11-08T14:22:00Z",
      nextInstance: {
        id: "1c3e5a7f-9912-4aa3-8c10-0928eab71101",
        scheduledAt: "2027-01-08T10:30:00Z",
        calculatedFrom: "CompletionDate (+2 months from 2026-11-08)"
      }
    }, null, 2)
  },
  {
    method: 'POST',
    path: '/api/reminders',
    category: 'Reminders',
    summary: 'Създава ново правило за напомняне',
    description: 'Конфигурира честота, време, режим на преизчисляване (FromCompletion vs FromScheduledDate), звук и ескалация.',
    requestBody: JSON.stringify({
      title: "Профилактика на пералня",
      description: "Пускане на 90-градусова празна програма",
      category: "Home",
      soundProfileId: "appliance_service",
      escalationPolicyId: "00000000-0000-0000-0000-000000000001",
      syncWithGoogleCalendar: true,
      recurrence: {
        frequency: "IntervalMonths",
        intervalValue: 2,
        targetTime: "10:30:00",
        calculationBase: "FromCompletion",
        startDate: "2026-11-01"
      }
    }, null, 2),
    responseBody: JSON.stringify({
      id: "7fa41249-f007-44a6-95f0-6b61a9de4f2c",
      title: "Профилактика на пералня",
      isActive: true,
      nextScheduledAt: "2026-11-01T08:30:00Z",
      recurrenceSummary: "Всеки 2 месеца (преизчислявано от момента на изпълнение)"
    }, null, 2)
  },
  {
    method: 'POST',
    path: '/api/instances/{id}/snooze',
    category: 'Instances & Actions',
    summary: 'Отлагане на напомнянето (Snooze)',
    description: 'Временно спира нотификацията и насрочва повторно напомняне според стълбицата или персонализиран интервал.',
    requestBody: JSON.stringify({
      snoozeMinutes: 60,
      reason: "Зает съм в момента"
    }, null, 2),
    responseBody: JSON.stringify({
      instanceId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      status: "Snoozed",
      snoozedUntil: "2026-11-01T11:30:00Z"
    }, null, 2)
  },
  {
    method: 'POST',
    path: '/api/devices/register',
    category: 'Devices',
    summary: 'Регистрация на Android FCM Push Token',
    description: 'Изпраща се при стартиране на Android приложението за свързване на устройството с Google потребителя.',
    requestBody: JSON.stringify({
      fcmToken: "cKj83la9sLk:APA91bFvO01nI...",
      deviceName: "Google Pixel 8 Pro",
      platform: "android",
      appVersion: "1.0.4"
    }, null, 2),
    responseBody: JSON.stringify({
      deviceId: "d4e5f6a7-e8b9-4c12-9876-543210fedcba",
      status: "Registered",
      assignedChannels: ["remindcore_medical", "remindcore_appliance"]
    }, null, 2)
  },
  {
    method: 'POST',
    path: '/api/auth/google',
    category: 'Auth',
    summary: 'Google OAuth ID Token Exchange',
    description: 'Разменя Google ID токена за RemindCore Bearer JWT токен с 30-дневен срок за мобилни клиенти.',
    requestBody: JSON.stringify({
      idToken: "eyJhbGciOiJSUzI1NiIsImtpZCI..."
    }, null, 2),
    responseBody: JSON.stringify({
      token: "remindcore_bearer_jwt_token_here",
      expiresAt: "2026-11-25T10:00:00Z",
      user: {
        id: "e4b6c310-8b17-48f8-b4b3-762d3ad7a884",
        email: "v.dublekov@gmail.com",
        timezone: "Europe/Sofia"
      }
    }, null, 2)
  }
];

export const ApiExplorer: React.FC = () => {
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'request' | 'response' | 'curl'>('response');
  const [copied, setCopied] = useState<boolean>(false);

  const activeRoute = API_ROUTES[selectedRouteIndex];

  const getCurlSnippet = (route: ApiRoute) => {
    let curl = `curl -X ${route.method} https://reminders.yourdomain.com${route.path} \\\n`;
    curl += `  -H "Authorization: Bearer <JWT_TOKEN>" \\\n`;
    curl += `  -H "Content-Type: application/json"`;
    if (route.requestBody) {
      curl += ` \\\n  -d '${route.requestBody.replace(/\n/g, '')}'`;
    }
    return curl;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Network className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-white">
              .NET 9 ASP.NET Core REST API Каталог
            </h3>
            <p className="text-sm text-slate-400 mt-0.5">
              Всички endpoints са строго типизирани, защитени с Bearer JWT и готови за интеграция с Android и Web.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Endpoints List (5 cols) */}
        <div className="lg:col-span-5 space-y-2">
          {API_ROUTES.map((route, idx) => {
            const isSelected = idx === selectedRouteIndex;
            return (
              <button
                key={idx}
                onClick={() => setSelectedRouteIndex(idx)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-slate-850 border-blue-500/80 shadow-md ring-1 ring-blue-500/30'
                    : 'bg-slate-900/80 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        route.method === 'POST'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : route.method === 'GET'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {route.method}
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-200">
                      {route.path}
                    </span>
                  </div>
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="text-xs text-slate-400 mt-1.5 line-clamp-1">
                  {route.summary}
                </div>
              </button>
            );
          })}
        </div>

        {/* Route Details & Inspector (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between shadow-xl">
          <div>
            {/* Header */}
            <div className="p-4 bg-slate-850 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded ${
                    activeRoute.method === 'POST'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}
                >
                  {activeRoute.method}
                </span>
                <span className="text-sm font-mono font-bold text-white">
                  {activeRoute.path}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 font-medium">
                {activeRoute.summary}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {activeRoute.description}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex gap-2">
                {activeRoute.requestBody && (
                  <button
                    onClick={() => setActiveTab('request')}
                    className={`py-2 text-xs font-medium border-b-2 transition-colors ${
                      activeTab === 'request'
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    Request DTO
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('response')}
                  className={`py-2 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === 'response'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Response (200 OK)
                </button>
                <button
                  onClick={() => setActiveTab('curl')}
                  className={`py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1 ${
                    activeTab === 'curl'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <Terminal className="w-3 h-3" />
                  cURL
                </button>
              </div>

              <button
                onClick={() => {
                  const textToCopy =
                    activeTab === 'request'
                      ? activeRoute.requestBody || ''
                      : activeTab === 'response'
                      ? activeRoute.responseBody
                      : getCurlSnippet(activeRoute);
                  handleCopy(textToCopy);
                }}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Копирано' : 'Копирай'}</span>
              </button>
            </div>

            {/* Code Content */}
            <div className="p-4 bg-slate-950">
              <pre className="text-xs font-mono text-emerald-300 overflow-x-auto max-h-[350px] leading-relaxed">
                {activeTab === 'request' && activeRoute.requestBody}
                {activeTab === 'response' && activeRoute.responseBody}
                {activeTab === 'curl' && getCurlSnippet(activeRoute)}
              </pre>
            </div>
          </div>

          <div className="p-3 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Автентикация:</span>
            <span className="font-mono text-indigo-300">Authorization: Bearer &lt;RemindCore_JWT&gt;</span>
          </div>
        </div>
      </div>
    </div>
  );
};
