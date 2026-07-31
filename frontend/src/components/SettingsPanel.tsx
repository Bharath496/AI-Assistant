import React from 'react'
import { X, Cpu, Globe, Database, ShieldCheck } from 'lucide-react'

type BackendStatus = 'checking' | 'online' | 'offline'

interface Props {
  backendStatus: BackendStatus
  onClose: () => void
}

const statusText = {
  online: 'Connected to the API.',
  offline: 'Backend unavailable.',
  checking: 'Checking connection...',
}

const featureRows = [
  { icon: Cpu, color: 'text-sky-400', title: 'Model', desc: 'Hugging Face Qwen / Claude / OpenAI — provider-agnostic' },
  { icon: Globe, color: 'text-violet-400', title: 'Live knowledge', desc: 'Web search auto-injected for current events' },
  { icon: Database, color: 'text-emerald-400', title: 'Memory', desc: 'SQLite history + semantic search across chats' },
  { icon: ShieldCheck, color: 'text-amber-400', title: 'No install', desc: 'Free serverless inference — nothing to download' },
]

const SettingsPanel: React.FC<Props> = ({ backendStatus, onClose }) => (
  <div className="animate-fade-up w-full border-t border-white/8 bg-[#0a1224]/90 p-6 backdrop-blur-2xl md:w-96 md:border-l md:border-t-0">
    <div className="mb-5 flex items-center justify-between">
      <h3 className="text-base font-bold tracking-tight text-white">Settings</h3>
      <button
        onClick={onClose}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:bg-white/5 hover:text-white"
        aria-label="Close settings"
      >
        <X size={15} />
      </button>
    </div>

    <div className="glass mb-5 rounded-2xl p-4">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">Backend status</div>
      <p className="text-sm text-slate-300">{statusText[backendStatus]}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            backendStatus === 'online'
              ? 'w-full bg-gradient-to-r from-emerald-400 to-teal-400'
              : backendStatus === 'offline'
                ? 'w-2/3 bg-gradient-to-r from-rose-400 to-orange-400'
                : 'w-1/2 bg-gradient-to-r from-amber-400 to-yellow-400'
          }`}
        />
      </div>
    </div>

    <div className="space-y-3">
      {featureRows.map(({ icon: Icon, color, title, desc }) => (
        <div key={title} className="glass flex items-start gap-3 rounded-2xl p-4">
          <Icon size={17} className={`mt-0.5 shrink-0 ${color}`} />
          <div>
            <div className="text-sm font-semibold text-slate-200">{title}</div>
            <p className="text-xs leading-relaxed text-slate-400">{desc}</p>
          </div>
        </div>
      ))}
    </div>

    <p className="mt-6 text-center text-[11px] text-slate-500">
      AI ASS · created by BHARATH K · B.Sc AIML
    </p>
  </div>
)

export default SettingsPanel
