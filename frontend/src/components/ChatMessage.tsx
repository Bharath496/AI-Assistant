import React, { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Sparkles, Copy, Check, User, Terminal, CheckCircle2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  message: Message
}

const CodeBlock = ({ language, children }: { language: string; children: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }, [children])

  return (
    <div className="code-block group my-3 overflow-hidden rounded-xl border border-white/8">
      <div className="flex items-center justify-between border-b border-white/8 bg-white/[0.04] px-4 py-2">
        <div className="flex items-center gap-2">
          <Terminal size={13} className="text-slate-500" />
          <span className="text-[12px] font-medium text-slate-400">{language || 'code'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-500 transition hover:border-white/20 hover:text-sky-300"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: 'rgba(2, 6, 17, 0.8)',
          fontSize: '13.5px',
          lineHeight: '1.6',
          borderRadius: 0,
          border: 'none',
        }}
        showLineNumbers={children.split('\n').length > 3}
        lineNumberStyle={{ color: 'rgba(148,163,184,0.3)', fontSize: '11px', minWidth: '2.5em' }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  )
}

const ChatMessage: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }, [message.content])

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
        <div className="relative min-w-0 flex-1">
          <div className="markdown-body rounded-2xl rounded-tl-md px-4 py-3.5 glass">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  const codeString = String(children).replace(/\n$/, '')
                  if (match) {
                    return <CodeBlock language={match[1]}>{codeString}</CodeBlock>
                  }
                  if (codeString.includes('\n')) {
                    return <CodeBlock language="text">{codeString}</CodeBlock>
                  }
                  return (
                    <code className="rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[0.875em] text-sky-300" {...props}>
                      {children}
                    </code>
                  )
                },
                table({ children }) {
                  return (
                    <div className="my-3 overflow-x-auto rounded-xl border border-white/8">
                      <table className="w-full text-sm">{children}</table>
                    </div>
                  )
                },
                th({ children }) {
                  return (
                    <th className="border-b border-white/10 bg-white/[0.04] px-4 py-2.5 text-left font-semibold text-slate-200">
                      {children}
                    </th>
                  )
                },
                td({ children }) {
                  return (
                    <td className="border-b border-white/5 px-4 py-2.5 text-slate-300">{children}</td>
                  )
                },
                a({ href, children }) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 underline decoration-sky-400/30 underline-offset-2 transition-colors hover:text-sky-300 hover:decoration-sky-300/50"
                    >
                      {children}
                    </a>
                  )
                },
                blockquote({ children }) {
                  return (
                    <blockquote className="my-3 border-l-4 border-indigo-500/60 pl-4 text-slate-400">
                      {children}
                    </blockquote>
                  )
                },
                h1({ children }) {
                  return <h1 className="mb-3 mt-5 text-xl font-bold text-white">{children}</h1>
                },
                h2({ children }) {
                  return <h2 className="mb-2 mt-4 text-lg font-bold text-white">{children}</h2>
                },
                h3({ children }) {
                  return <h3 className="mb-2 mt-3 text-base font-semibold text-white">{children}</h3>
                },
                ul({ children }) {
                  return <ul className="my-2 list-disc pl-5 text-slate-200">{children}</ul>
                },
                ol({ children }) {
                  return <ol className="my-2 list-decimal pl-5 text-slate-200">{children}</ol>
                },
                li({ children }) {
                  return <li className="my-1 leading-relaxed">{children}</li>
                },
                p({ children }) {
                  return <p className="my-2 leading-relaxed text-slate-200">{children}</p>
                },
                hr() {
                  return <hr className="my-4 border-white/10" />
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
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
