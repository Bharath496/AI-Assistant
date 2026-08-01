import React from 'react'
import { Plus, Settings2, Sparkles, Zap, Brain, Activity } from 'lucide-react'

type BackendStatus = 'checking' | 'online' | 'offline'

interface Props {
  backendStatus: BackendStatus
  messageCount: number
  onNewChat: () => void
  onToggleSettings: () => void
  runtimeLabel: string
}

const statusConfig: Record<BackendStatus, { color: string; ring: string; label: string }> = {
  online:  { color: 'bg-emerald-400', ring: 'ring-emerald-400/30', label: 'Live' },
  offline: { color: 'bg-red-400',     ring: 'ring-red-400/30',     label: 'Offline' },
  checking:{ color: 'bg-amber-400',   ring: 'ring-amber-400/30',   label: 'Checking' },
}

const Sidebar: React.FC<Props> = ({ backendStatus, messageCount, onNewChat, onToggleSettings, runtimeLabel }) => {
  const s = statusConfig[backendStatus]

  return (
    <aside className="animate-slide-left relative z-10 flex h-full w-full flex-col border-b border-white/[0.06] bg-black/30 backdrop-blur-xl md:w-72 md:border-b-0 md:border-r md:border-white/[0.06]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
        <div className="gradient-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-lg shadow-indigo-500/20">
          <Sparkles size={20} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] font-bold tracking-tight text-white">AI ASS</h1>
          <p className="truncate text-[11px] text-zinc-500">by BHARATH K · B.Sc AIML</p>
        </div>
      </div>

      {/* New Chat */}
      <div className="px-3 pt-3">
        <button
          onClick={onNewChat}
          className="sidebar-item flex w-full items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-[13px] font-medium text-zinc-300 hover:text-white"
        >
          <Plus size={16} className="text-indigo-400" />
          New Chat
        </button>
      </div>

      {/* Session info */}
      <div className="flex-1 space-y-2 overflow-y-auto px-3 pt-4">
        <div className="animate-fade-up stagger-1 rounded-xl bg-white/[0.02] px-3.5 py-3 border border-white/[0.04]">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <Zap size={11} className="text-indigo-400" />
            Session
          </div>
          <p className="text-[13px] text-zinc-400">
            {messageCount === 0 ? 'No messages yet' : `${messageCount} message${messageCount !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="animate-fade-up stagger-2 rounded-xl bg-white/[0.02] px-3.5 py-3 border border-white/[0.04]">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <Brain size={11} className="text-violet-400" />
            Capabilities
          </div>
          <p className="text-[13px] leading-relaxed text-zinc-400">
            Live web search, streaming, code highlighting, markdown.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="space-y-2 border-t border-white/[0.06] p-3">
        <div className="flex items-center justify-between rounded-lg px-3 py-2">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <span className={`block h-2 w-2 rounded-full ${s.color}`} />
              <span className={`status-ring absolute inset-0 h-2 w-2 rounded-full ${s.color} opacity-50`} />
            </div>
            <span className="text-[11px] font-medium text-zinc-400">{s.label}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
            <Activity size={10} />
            {runtimeLabel}
          </div>
        </div>

        <button
          onClick={onToggleSettings}
          className="sidebar-item flex w-full items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-[13px] font-medium text-zinc-400 hover:text-zinc-200"
        >
          <Settings2 size={15} />
          Settings
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
