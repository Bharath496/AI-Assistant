import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Sparkles, Newspaper, TrendingUp, Brain, Code2, Globe, Compass, SendHorizontal } from 'lucide-react'
import { apiRequest, getRuntimeLabel, checkBackendHealth, API_BASE_URL } from './lib/api'
import ChatMessage from './components/ChatMessage'
import ChatInput from './components/ChatInput'
import Sidebar from './components/Sidebar'
import SettingsPanel from './components/SettingsPanel'
import './styles/globals.css'

interface Message { role: 'user' | 'assistant'; content: string }
type BackendStatus = 'checking' | 'online' | 'offline'

const suggestions = [
  { icon: Newspaper, label: 'Today\'s top news', text: 'What are the biggest news headlines today?', color: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400' },
  { icon: TrendingUp, label: 'Latest AI news', text: 'What are the latest AI models and announcements this year?', color: 'from-violet-500/20 to-purple-500/20', iconColor: 'text-violet-400' },
  { icon: Brain, label: 'Explain a concept', text: 'Explain quantum computing like I am 15 years old', color: 'from-pink-500/20 to-rose-500/20', iconColor: 'text-pink-400' },
  { icon: Code2, label: 'Write code', text: 'Write a Python function to fetch and parse JSON from an API', color: 'from-emerald-500/20 to-green-500/20', iconColor: 'text-emerald-400' },
  { icon: Globe, label: 'World events', text: 'What are the current major world events and developments?', color: 'from-amber-500/20 to-orange-500/20', iconColor: 'text-amber-400' },
  { icon: Compass, label: 'Research a topic', text: 'Compare the pros and cons of renewable energy sources', color: 'from-indigo-500/20 to-blue-500/20', iconColor: 'text-indigo-400' },
]

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking')
  const [streamingMessage, setStreamingMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    checkBackendHealth().then(() => setBackendStatus('online')).catch(() => setBackendStatus('offline'))
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, streamingMessage])

  const getSystemPrompt = useCallback(() => {
    return `You are AI ASS, created by BHARATH K (B.Sc AIML student).

RULES:
1. Web search results are injected above. They contain the current date/time and real data from the internet.
2. ONLY state facts that appear in those search results. Do NOT use your training data to answer current-events questions.
3. If search results do not answer the question, say: "I searched but the current results don't contain specific information about [topic]." Then list what IS in the results.
4. NEVER fabricate model names, dates, versions, or company actions. Only repeat what the results say.
5. Be concise, warm, direct. Use markdown when helpful. For code, use proper code blocks with language tags.`
  }, [])

  const handleSendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return

    const userMessage: Message = { role: 'user', content }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setStreamingMessage('')

    try {
      const controller = new AbortController()
      abortRef.current = controller

      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, messages: [userMessage], system_prompt: getSystemPrompt() }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error('Stream failed')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''
      let newConversationId = conversationId

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.chunk) { accumulated += data.chunk; setStreamingMessage(accumulated) }
            if (data.done) newConversationId = data.conversation_id
          } catch {}
        }
      }

      if (accumulated) {
        setConversationId(newConversationId)
        setMessages([...newMessages, { role: 'assistant', content: accumulated }])
      }
      setBackendStatus('online')
    } catch {
      try {
        const response = await apiRequest('POST', '/chat', { conversation_id: conversationId, messages: [userMessage], system_prompt: getSystemPrompt() })
        if (response?.response) {
          setConversationId(response.conversation_id)
          setMessages([...newMessages, { role: 'assistant', content: response.response }])
          setBackendStatus('online')
        } else {
          throw new Error(response?.error || 'No response')
        }
      } catch {
        setBackendStatus('offline')
        setMessages([...newMessages, { role: 'assistant', content: 'Backend is not reachable. Please try again.' }])
      }
    } finally {
      setLoading(false)
      setStreamingMessage('')
      abortRef.current = null
    }
  }, [input, loading, messages, conversationId, getSystemPrompt])

  const handleClearConversation = useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
    setMessages([])
    setConversationId(null)
    setStreamingMessage('')
  }, [])

  const displayMessages = streamingMessage
    ? [...messages, { role: 'assistant' as const, content: streamingMessage }]
    : messages

  return (
    <div className="nebula-bg flex h-screen flex-col overflow-hidden text-white md:flex-row">
      <Sidebar
        backendStatus={backendStatus}
        messageCount={messages.length}
        onNewChat={handleClearConversation}
        onToggleSettings={() => setShowSettings(!showSettings)}
        runtimeLabel={getRuntimeLabel()}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto">
          {displayMessages.length === 0 ? (
            <div className="flex min-h-full items-center justify-center px-4 py-10">
              <div className="w-full max-w-xl text-center">
                {/* Animated logo */}
                <div className="mb-6 flex justify-center animate-scale-in">
                  <div className="relative">
                    <div className="gradient-btn flex h-16 w-16 items-center justify-center rounded-3xl shadow-2xl shadow-indigo-500/30">
                      <Sparkles size={28} className="text-white" />
                    </div>
                    <div className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-xl animate-pulse-glow" style={{ color: 'rgba(99,102,241,0.15)' }} />
                  </div>
                </div>

                <h1 className="animate-fade-up stagger-1 mb-2 text-4xl font-bold tracking-tight md:text-5xl">
                  <span className="text-gradient">AI ASS</span>
                </h1>
                <p className="animate-fade-up stagger-2 mx-auto mb-8 max-w-sm text-[14px] leading-relaxed text-zinc-500">
                  Created by BHARATH K. Live web search, streaming responses, and code highlighting.
                </p>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {suggestions.map(({ icon: Icon, label, text, color, iconColor }, i) => (
                    <button
                      key={text}
                      onClick={() => handleSendMessage(text)}
                      disabled={loading}
                      className={`animate-fade-up stagger-${i + 1} chip glass group flex items-center gap-3 rounded-xl px-4 py-3.5 text-left`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${color} transition-transform duration-300 group-hover:scale-110`}>
                        <Icon size={16} className={iconColor} />
                      </span>
                      <span className="text-[13px] font-medium text-zinc-300 group-hover:text-white transition-colors">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 md:py-6">
              {displayMessages.map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}
              {loading && !streamingMessage && (
                <div className="animate-fade-up flex justify-start">
                  <div className="flex items-start gap-2.5">
                    <div className="gradient-btn flex h-7 w-7 shrink-0 items-center justify-center rounded-full shadow-lg shadow-indigo-500/20">
                      <span className="text-[10px] font-bold text-white">A</span>
                    </div>
                    <div className="glass flex items-center gap-1.5 rounded-2xl rounded-tl-md px-4 py-3">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <ChatInput value={input} loading={loading} onChange={setInput} onSend={() => handleSendMessage()} />
      </div>

      {showSettings && <SettingsPanel backendStatus={backendStatus} onClose={() => setShowSettings(false)} />}
    </div>
  )
}

export default App
