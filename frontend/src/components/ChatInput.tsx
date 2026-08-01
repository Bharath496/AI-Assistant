import React, { useRef, useEffect } from 'react'
import { ArrowUp, Sparkles } from 'lucide-react'

interface Props {
  value: string
  loading: boolean
  onChange: (value: string) => void
  onSend: () => void
}

const ChatInput: React.FC<Props> = ({ value, loading, onChange, onSend }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + 'px'
    }
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="relative z-10 border-t border-white/[0.04] bg-gradient-to-t from-[#050510] via-[#050510]/80 to-transparent px-4 pb-4 pt-3 md:px-5">
      <div className="mx-auto max-w-3xl">
        <div className="glass-strong rounded-2xl transition-all duration-300 focus-within:border-indigo-500/30 focus-within:shadow-[0_0_50px_rgba(99,102,241,0.1)]">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className="max-h-[180px] min-h-[48px] w-full resize-none bg-transparent px-4 py-3.5 text-[14.5px] text-white placeholder:text-zinc-600 focus:outline-none"
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
                className="gradient-btn flex h-8 w-8 items-center justify-center rounded-lg text-white"
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
