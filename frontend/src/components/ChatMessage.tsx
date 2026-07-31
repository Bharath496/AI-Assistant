import React, { useState } from 'react'
import { Sparkles, Copy, Check, User } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  message: Message
}

const renderMarkdown = (content: string) => {
  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  let html = escapeHtml(content)

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`
  })

  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>')

  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>')

  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

  html = html.replace(/^- (.*)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>[\s\S]*?<\/li>(\s*<li>[\s\S]*?<\/li>)*)/g, '<ul>$1</ul>')

  html = html.replace(/^\d+\. (.*)$/gm, '<li>$1</li>')

  html = html.replace(/> (.*)$/gm, '<blockquote>$1</blockquote>')

  html = html.replace(/\n{2,}/g, '</p><p>')
  html = html.replace(/\n/g, '<br/>')

  return html
}

const ChatMessage: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard unavailable
    }
  }

  if (isUser) {
    return (
      <div className="animate-fade-up flex justify-end">
        <div className="flex max-w-[85%] items-end gap-2.5 md:max-w-[70%]">
          <div className="rounded-2xl rounded-br-md bg-gradient-to-br from-sky-500 to-blue-600 px-4 py-3 leading-7 text-white shadow-lg shadow-sky-500/20">
            <p className="whitespace-pre-wrap text-[15px]">{message.content}</p>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10">
            <User size={15} className="text-slate-300" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-up group flex justify-start">
      <div className="flex max-w-[95%] items-start gap-3 md:max-w-[85%]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-btn shadow-lg shadow-indigo-500/30">
          <Sparkles size={15} className="text-white" />
        </div>
        <div className="relative min-w-0">
          <div className="glass rounded-2xl rounded-tl-md px-4 py-3.5">
            <div
              className="markdown-body whitespace-pre-wrap text-[15px] text-slate-100"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
            />
          </div>
          <button
            onClick={handleCopy}
            className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-500 opacity-0 transition hover:text-sky-300 group-hover:opacity-100"
            aria-label="Copy response"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatMessage
