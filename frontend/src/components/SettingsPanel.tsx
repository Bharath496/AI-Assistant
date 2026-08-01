import React from 'react'
import { X, Cpu, Globe, Sparkles, Shield, Zap } from 'lucide-react'

type BackendStatus = 'checking' | 'online' | 'offline'

interface Props {
  backendStatus: BackendStatus
  onClose: () => void
}

const statusText: Record<BackendStatus, string> = {
  online: 'Connected to the API.',
  offline: 'Backend unavailable.',
  checking: 'Checking connection...',
}

const features = [
  { icon: Cpu, color: 'from-indigo-500/20 to-violet-500/20', iconColor: 'text-indigo-400', title: 'DeepSeek-R1', desc: 'Advanced reasoning model via Hugging Face' },
  { icon: Globe, color: 'from-violet-500/20 to-purple-500/20', iconColor: 'text-violet-400', title: 'Live web search', desc: 'Auto-injected for current events & news' },
  { icon: Sparkles, color: 'from-emerald-500/20 to-green-500/20', iconColor: 'text-emerald-400', title: 'Streaming', desc: 'Real-time token-by-token responses' },
  { icon: Shield, color: 'from-amber-500/20 to-orange-500/20', iconColor: 'text-amber-400', title: 'Serverless', desc: 'Free Cloudflare Pages — no install needed' },
]

const SettingsPanel: React.FC<Props> = ({ backendStatus, onClose }) => (
  <div className="animate-slide-in-right relative z-20 w-full border-t border-white/[0.06] bg-[#050510]/95 p-5 backdrop-blur-2xl md:w-80 md:border-l md:border-t-0">
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-[15px] font-semibold text-white">Settings</h3>
      <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white" aria-label="Close">
        <X size={15} />
      </button>
    </div>

    <div className="mb-4 rounded-xl bg-white/[0.02] border border-white/[0.04] p-3.5">
      <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        <Zap size={11} className="text-indigo-400" />
        Status
      </div>
      <p className="text-[13px] text-zinc-300">{statusText[backendStatus]}</p>
      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.04]">
        <div className={`h-full rounded-full transition-all duration-700 ${
          backendStatus === 'online' ? 'w-full bg-gradient-to-r from-emerald-500 to-teal-400' :
          backendStatus === 'offline' ? 'w-2/3 bg-gradient-to-r from-red-500 to-orange-400' :
          'w-1/2 bg-gradient-to-r from-amber-500 to-yellow-400'
        }`} />
      </div>
    </div>

    <div className="space-y-2">
      {features.map(({ icon: Icon, color, iconColor, title, desc }, i) => (
        <div key={title} className={`animate-fade-up stagger-${i + 1} flex items-start gap-3 rounded-xl bg-white/[0.02] border border-white/[0.04] px-3.5 py-3 transition-colors hover:bg-white/[0.04]`}>
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${color}`}>
            <Icon size={14} className={iconColor} />
          </span>
          <div>
            <div className="text-[13px] font-medium text-zinc-200">{title}</div>
            <p className="text-[12px] text-zinc-500">{desc}</p>
          </div>
        </div>
      ))}
    </div>

    <p className="mt-5 text-center text-[10.5px] text-zinc-600">
      AI ASS · BHARATH K
    </p>
  </div>
)

export default SettingsPanel
