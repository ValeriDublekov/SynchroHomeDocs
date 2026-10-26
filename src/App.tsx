import React, { useState } from 'react';
import {
  Layers,
  BookOpen,
  RefreshCw,
  Bell,
  Database,
  Network,
  ShieldCheck,
  HelpCircle,
  Smartphone,
  Server,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Download
} from 'lucide-react';
import { ARCHITECTURE_DOCS, DocItem } from './data/docsData';
import { RecurrenceSimulator } from './components/RecurrenceSimulator';
import { EscalationSimulator } from './components/EscalationSimulator';
import { DatabaseViewer } from './components/DatabaseViewer';
import { ApiExplorer } from './components/ApiExplorer';
import { SecurityArchitecture } from './components/SecurityArchitecture';
import { DiscussionTracker } from './components/DiscussionTracker';
import { MarkdownViewer } from './components/MarkdownViewer';

export default function App() {
  const [activeMainTab, setActiveMainTab] = useState<'simulators' | 'data' | 'docs'>('simulators');
  const [activeSimulator, setActiveSimulator] = useState<'recurrence' | 'escalation' | 'security' | 'discussion'>('recurrence');
  const [activeDataTab, setActiveDataTab] = useState<'db' | 'api'>('db');
  const [selectedDocId, setSelectedDocId] = useState<string>('00_INDEX');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const selectedDoc = ARCHITECTURE_DOCS.find((d) => d.id === selectedDocId) || ARCHITECTURE_DOCS[0];

  // Filter docs
  const filteredDocs = ARCHITECTURE_DOCS.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 font-bold text-lg">
              RC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  RemindCore Architecture & Spec Portal
                </h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Архитектурен План v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Централизирана система за напомняния • Android • Web • .NET 9 • PostgreSQL 16 • Cloudflare
              </p>
            </div>
          </div>

          {/* Quick Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-blue-400" />
              .NET 9 + Postgres
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              Android Custom Sounds
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Cloudflare Tunnel (0 Open Ports)
            </span>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6 border-t border-slate-800/80">
          <button
            onClick={() => setActiveMainTab('simulators')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeMainTab === 'simulators'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Интерактивни Симулатори</span>
          </button>

          <button
            onClick={() => setActiveMainTab('data')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeMainTab === 'data'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>База Данни & API</span>
          </button>

          <button
            onClick={() => setActiveMainTab('docs')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeMainTab === 'docs'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Архитектурни Документи ({ARCHITECTURE_DOCS.length} .md файла)</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {/* TAB 1: SIMULATORS */}
        {activeMainTab === 'simulators' && (
          <div className="space-y-6">
            {/* Sub-navigation pills */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-xl w-fit">
              <button
                onClick={() => setActiveSimulator('recurrence')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  activeSimulator === 'recurrence'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Преизчисляване (Пералня / Лекарство)</span>
              </button>
              <button
                onClick={() => setActiveSimulator('escalation')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  activeSimulator === 'escalation'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Ескалация & Push (+1ч, +2ч, +24ч)</span>
              </button>
              <button
                onClick={() => setActiveSimulator('security')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  activeSimulator === 'security'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Сигурност & Docker Стек</span>
              </button>
              <button
                onClick={() => setActiveSimulator('discussion')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  activeSimulator === 'discussion'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Дискусия по Изискванията</span>
              </button>
            </div>

            {/* Sub content */}
            {activeSimulator === 'recurrence' && <RecurrenceSimulator />}
            {activeSimulator === 'escalation' && <EscalationSimulator />}
            {activeSimulator === 'security' && <SecurityArchitecture />}
            {activeSimulator === 'discussion' && <DiscussionTracker />}
          </div>
        )}

        {/* TAB 2: DATABASE & API */}
        {activeMainTab === 'data' && (
          <div className="space-y-6">
            <div className="flex gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-xl w-fit">
              <button
                onClick={() => setActiveDataTab('db')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  activeDataTab === 'db'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>PostgreSQL 16 Схема (Таблици, Индекси, DDL)</span>
              </button>
              <button
                onClick={() => setActiveDataTab('api')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  activeDataTab === 'api'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>.NET 9 REST API Контракти & DTOs</span>
              </button>
            </div>

            {activeDataTab === 'db' && <DatabaseViewer />}
            {activeDataTab === 'api' && <ApiExplorer />}
          </div>
        )}

        {/* TAB 3: MODULAR MARKDOWN DOCUMENTS */}
        {activeMainTab === 'docs' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar with all .md files (4 cols) */}
            <div className="lg:col-span-4 space-y-3">
              {/* Search bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Търсене в документацията..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-500"
                />
              </div>

              {/* Doc List */}
              <div className="space-y-1.5 max-h-[75vh] overflow-y-auto pr-1">
                {filteredDocs.map((doc) => {
                  const isSelected = doc.id === selectedDocId;
                  return (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/30'
                          : 'bg-slate-900/60 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                          <span className="text-indigo-400">{doc.filename}</span>
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {doc.badge}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-white mt-1">
                        {doc.title}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {doc.summary}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Document Content View (8 cols) */}
            <div className="lg:col-span-8">
              <MarkdownViewer doc={selectedDoc} />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 text-xs text-slate-500 py-4 px-6 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>RemindCore Architecture Specifications • Всички файлове се намират физически в директория <code>/docs/</code></span>
          <span>Самостоятелен деплоймънт на Домашен Сървър с Docker & Cloudflare Tunnel</span>
        </div>
      </footer>
    </div>
  );
}
