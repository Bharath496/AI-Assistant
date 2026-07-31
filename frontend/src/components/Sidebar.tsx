import React from 'react'
import { Sparkles, MessageSquarePlus, Settings2, Github, Zap, BrainCircuit } from 'lucide-react'

type BackendStatus = 'checking' | 'online' | 'offline'

interface Props {
  backendStatus: BackendStatus
  messageCount: number
  onNewChat: () => void
  onToggleSettings: () => void
  runtimeLabel: string
}

const statusConfig = {
  online: { label: 'Live', dot: 'bg-emerald-400', text: 'text-emerald-300', glow: 'shadow-[0_0_12px_rgba(52,211,153,0.6)]' },
  offline: { label: 'Offline', dot: 'bg-rose-400', text: 'text-rose-300', glow: 'shadow-[0_0_12px_rgba(251,113,133,0.6)]' },
  checking: { label: 'Checking', dot: 'bg-amber-400', text: 'text-amber-300', glow: 'shadow-[0_0_12px_rgba(251,191,36,0.6)]' },
}

const Sidebar: React.FC<Props> = ({ backendStatus, messageCount, onNewChat, onToggleSettings, runtimeLabel }) => {
  const status = statusConfig[backendStatus]

  return (
    <div className="flex w-full flex-col border-b border-white/8 bg-white/[0.03] backdrop-blur-2xl md:w-72 md:border-b-0 md:border-r">
      <div className="border-b border-white/8 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-btn shadow-lg shadow-indigo-500/30">
            <Sparkles size={22} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-gradient">AI ASS</span>
            </h1>
            <p className="truncate text-[11px] text-slate-400">by BHARATH K · B.Sc AIML</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <button
          onClick={onNewChat}
          className="gradient-btn flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white"
        >
          <MessageSquarePlus size={17} />
          New Chat
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4">
        <div className="glass rounded-2xl p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
            <Zap size={13} className="text-sky-400" />
            This session
          </div>
          <p className="text-sm text-slate-300">
            {messageCount === 0 ? (
              <span className="text-slate-400">Start a conversation below.</span>
            ) : (
              `${messageCount} messages`
            )}
          </p>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
            <BrainCircuit size={13} className="text-violet-400" />
            Intelligence
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            Live web search — current news, events &amp; data, updated in real time.
          </p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="glass flex items-center justify-between rounded-xl px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className={`h-2 w-2 rounded-full ${status.dot} ${status.glow} animate-glow`} />
            <span className={`text-xs font-semibold uppercase tracking-widest ${status.text}`}>{status.label}</span>
          </div>
          <span className="text-[11px] text-slate-500">{runtimeLabel}</span>
        </div>

        <button
          onClick={onToggleSettings}
          className="flex w-full items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
        >
          <Settings2 size={16} className="text-slate-400" />
          Settings
        </button>
      </div>
    </div>
  )
}

export default Sidebar
