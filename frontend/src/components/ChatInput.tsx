import React from 'react'
import { ArrowUp, Sparkles } from 'lucide-react'

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
    <div className="border-t border-white/[0.04] bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent px-4 pb-4 pt-3 md:px-5">
      <div className="mx-auto max-w-3xl">
        <div className="glass-strong rounded-2xl transition-all focus-within:border-indigo-500/30 focus-within:shadow-[0_0_40px_rgba(99,102,241,0.08)]">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className="max-h-40 min-h-[48px] w-full resize-none bg-transparent px-4 py-3.5 text-[14.5px] text-white placeholder:text-zinc-600 focus:outline-none"
            rows={1}
            disabled={loading}
          />
          <div className="flex items-center justify-between border-t border-white/[0.04] px-4 py-2">
            <span className="flex items-center gap-1.5 text-[10.5px] text-zinc-600">
              <Sparkles size={10} className="text-indigo-400" />
              Web search enabled
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] text-zinc-600">Shift+Enter for newline</span>
              <button
                onClick={onSend}
                disabled={loading || !value.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-lg gradient-btn text-white disabled:opacity-30"
                aria-label="Send"
              >
                {loading ? (
                  <div className="flex gap-1">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                ) : (
                  <ArrowUp size={16} strokeWidth={2.5} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatInput
