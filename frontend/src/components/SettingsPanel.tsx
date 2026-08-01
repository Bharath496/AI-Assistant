import React from 'react'
import { X, Cpu, Globe, Sparkles, Shield } from 'lucide-react'

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
  { icon: Cpu, color: 'text-indigo-400', title: 'DeepSeek-R1', desc: 'Advanced reasoning model via Hugging Face' },
  { icon: Globe, color: 'text-violet-400', title: 'Live web search', desc: 'Auto-injected for current events & news' },
  { icon: Sparkles, color: 'text-emerald-400', title: 'Streaming', desc: 'Real-time token-by-token responses' },
  { icon: Shield, color: 'text-amber-400', title: 'Serverless', desc: 'Free Cloudflare Pages — no install needed' },
]

const SettingsPanel: React.FC<Props> = ({ backendStatus, onClose }) => (
  <div className="animate-fade-up w-full border-t border-white/[0.06] bg-[#09090b]/95 p-5 backdrop-blur-2xl md:w-80 md:border-l md:border-t-0">
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-[15px] font-semibold text-white">Settings</h3>
      <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-white" aria-label="Close">
        <X size={15} />
      </button>
    </div>

    <div className="mb-4 rounded-xl bg-white/[0.02] p-3.5">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Status</div>
      <p className="text-[13px] text-zinc-300">{statusText[backendStatus]}</p>
      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.04]">
        <div className={`h-full rounded-full transition-all duration-700 ${
          backendStatus === 'online' ? 'w-full bg-emerald-500' :
          backendStatus === 'offline' ? 'w-2/3 bg-red-500' : 'w-1/2 bg-amber-500'
        }`} />
      </div>
    </div>

    <div className="space-y-2">
      {features.map(({ icon: Icon, color, title, desc }) => (
        <div key={title} className="flex items-start gap-3 rounded-xl bg-white/[0.02] px-3.5 py-3">
          <Icon size={15} className={`mt-0.5 shrink-0 ${color}`} />
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
