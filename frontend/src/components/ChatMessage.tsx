import React, { useState, useCallback, Suspense, lazy } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Check, User, Terminal, CheckCircle2 } from 'lucide-react'

const LazyHighlighter = lazy(() => import('react-syntax-highlighter').then(m => ({ default: m.Prism })))
const LazyStyle = import('react-syntax-highlighter/dist/esm/styles/prism').then(m => m.nightOwl)

interface Message { role: 'user' | 'assistant'; content: string }
interface Props { message: Message }

const CodeBlock = ({ language, children }: { language: string; children: string }) => {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }, [children])

  return (
    <div className="code-block group my-3">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-3.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <Terminal size={12} className="text-zinc-500" />
          <span className="text-[11px] font-medium text-zinc-500">{language || 'text'}</span>
        </div>
        <button onClick={handleCopy} className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] text-zinc-500 transition hover:text-zinc-300" aria-label="Copy code">
          {copied ? <><CheckCircle2 size={11} className="text-emerald-400" /><span className="text-emerald-400">Copied</span></> : <><Copy size={11} /><span>Copy</span></>}
        </button>
      </div>
      <Suspense fallback={<pre className="m-0 overflow-x-auto bg-black/30 p-4 text-[13px] text-zinc-300" style={{ lineHeight: 1.6 }}><code>{children}</code></pre>}>
        <LazyCodeInner language={language} code={children} />
      </Suspense>
    </div>
  )
}

const LazyCodeInner = ({ language, code }: { language: string; code: string }) => {
  const [style, setStyle] = React.useState<any>(null)
  React.useEffect(() => { LazyStyle.then(s => setStyle(s)) }, [])
  if (!style) return <pre className="m-0 overflow-x-auto bg-black/30 p-4 text-[13px] text-zinc-300" style={{ lineHeight: 1.6 }}><code>{code}</code></pre>
  return (
    <LazyHighlighter
      language={language || 'text'}
      style={style}
      customStyle={{ margin: 0, padding: '1rem', background: 'rgba(0,0,0,0.3)', fontSize: '13px', lineHeight: '1.6', borderRadius: 0, border: 'none' }}
      showLineNumbers={code.split('\n').length > 3}
      lineNumberStyle={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px', minWidth: '2em' }}
    >{code}</LazyHighlighter>
  )
}

const ChatMessage: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(message.content); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }, [message.content])

  if (isUser) {
    return (
      <div className="animate-slide-right flex justify-end">
        <div className="flex max-w-[80%] items-end gap-2.5 md:max-w-[65%]">
          <div className="rounded-2xl rounded-br-md bg-gradient-to-br from-indigo-600 to-purple-600 px-4 py-2.5 text-[14px] leading-relaxed text-white shadow-lg shadow-indigo-500/15">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.06]">
            <User size={13} className="text-zinc-400" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-slide-left group flex justify-start">
      <div className="flex max-w-[92%] items-start gap-2.5 md:max-w-[82%]">
        <div className="gradient-btn flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-lg shadow-indigo-500/20 mt-0.5">
          <span className="text-[11px] font-bold text-white">A</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="markdown-body rounded-2xl rounded-tl-md bg-white/[0.03] border border-white/[0.04] px-4 py-3 transition-colors hover:bg-white/[0.04]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  const codeString = String(children).replace(/\n$/, '')
                  if (match) return <CodeBlock language={match[1]}>{codeString}</CodeBlock>
                  if (codeString.includes('\n')) return <CodeBlock language="text">{codeString}</CodeBlock>
                  return <code className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[0.85em] text-indigo-300" {...props}>{children}</code>
                },
                table({ children }) {
                  return <div className="my-2 overflow-x-auto rounded-xl border border-white/[0.06]"><table className="w-full text-[13px]">{children}</table></div>
                },
                th({ children }) {
                  return <th className="border-b border-white/[0.06] bg-white/[0.03] px-3 py-2 text-left font-semibold text-zinc-200">{children}</th>
                },
                td({ children }) {
                  return <td className="border-b border-white/[0.04] px-3 py-2 text-zinc-300">{children}</td>
                },
                a({ href, children }) {
                  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline decoration-indigo-400/30 underline-offset-2 transition-colors hover:text-indigo-300">{children}</a>
                },
                blockquote({ children }) {
                  return <blockquote className="my-2 border-l-3 border-indigo-500/50 pl-3 text-zinc-400 italic">{children}</blockquote>
                },
                h1({ children }) { return <h1 className="mb-2 mt-4 text-xl font-bold text-white">{children}</h1> },
                h2({ children }) { return <h2 className="mb-2 mt-3 text-lg font-bold text-white">{children}</h2> },
                h3({ children }) { return <h3 className="mb-1.5 mt-2.5 text-base font-semibold text-white">{children}</h3> },
                ul({ children }) { return <ul className="my-1.5 list-disc pl-4 text-zinc-200">{children}</ul> },
                ol({ children }) { return <ol className="my-1.5 list-decimal pl-4 text-zinc-200">{children}</ol> },
                li({ children }) { return <li className="my-0.5 leading-relaxed">{children}</li> },
                p({ children }) { return <p className="my-1.5 leading-relaxed text-zinc-200">{children}</p> },
                hr() { return <hr className="my-3 border-white/[0.06]" /> },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          <button
            onClick={handleCopy}
            className="mt-1 flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] text-zinc-600 opacity-0 transition-all duration-200 hover:text-zinc-300 group-hover:opacity-100"
            aria-label="Copy response"
          >
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatMessage
