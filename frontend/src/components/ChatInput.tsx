import React from 'react'
import { SendHorizontal, Wand2 } from 'lucide-react'

interface Props {
  value: string
  loading: boolean
  onChange: (value: string) => void
  onSend: () => void
}

const ChatInput: React.FC<Props> = ({ value, loading, onChange, onSend }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="border-t border-white/5 bg-gradient-to-t from-[#050914] via-[#050914]/90 to-transparent p-4 md:p-5">
      <div className="glass-strong mx-auto max-w-3xl rounded-2xl p-2 transition-all focus-within:border-sky-400/40 focus-within:shadow-[0_0_40px_rgba(56,189,248,0.12)]">
        <div className="flex items-end gap-2">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI ASS anything... (Enter to send)"
            className="max-h-44 min-h-[48px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] text-white placeholder:text-slate-500 focus:outline-none"
            rows={1}
            disabled={loading}
          />
          <button
            onClick={onSend}
            disabled={loading || !value.trim()}
            className="gradient-btn flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
            aria-label="Send message"
          >
            {loading ? (
              <div className="flex gap-1">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            ) : (
              <SendHorizontal size={19} />
            )}
          </button>
        </div>
        <div className="flex items-center justify-between px-3 pb-1 pt-1.5">
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Wand2 size={11} className="text-violet-400" />
            Live web search enabled
          </span>
          <span className="text-[11px] text-slate-600">Enter to send · Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  )
}

export default ChatInput
