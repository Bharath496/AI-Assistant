import React, { useEffect, useRef, useState } from 'react'
import { Sparkles, TrendingUp, Newspaper, Brain, Code2 } from 'lucide-react'
import { apiRequest, getRuntimeLabel, checkBackendHealth } from './lib/api'
import ChatMessage from './components/ChatMessage'
import ChatInput from './components/ChatInput'
import Sidebar from './components/Sidebar'
import SettingsPanel from './components/SettingsPanel'
import './styles/globals.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type BackendStatus = 'checking' | 'online' | 'offline'

const suggestions = [
  { icon: Newspaper, label: 'What happened in the world today?', text: 'What are the biggest news headlines today?' },
  { icon: TrendingUp, label: 'Latest AI news & models', text: 'What are the latest AI models and announcements this year?' },
  { icon: Brain, label: 'Explain something complex', text: 'Explain quantum computing like I am 15 years old' },
  { icon: Code2, label: 'Write code', text: 'Write a Python function to fetch and parse JSON from an API' },
]

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const probe = async () => {
      try {
        await checkBackendHealth()
        setBackendStatus('online')
      } catch {
        setBackendStatus('offline')
      }
    }
    probe()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const getSystemPrompt = () => {
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    const timeStr = now.toLocaleTimeString('en-US')
    return `You are AI ASS, created by BHARATH K (B.Sc AIML student). Today is ${dateStr}, current time is ${timeStr}.

CRITICAL: Your training data is outdated (before 2024). You MUST NOT answer from memory about: current events, news, politics, presidents, leaders, elections, prices, sports scores, weather, technology releases, or any time-sensitive facts. For ALL such questions, use ONLY the Web Search Results section in the conversation — it contains LIVE, CURRENT data. Answer from those results and cite them. If no web results are present for a time-sensitive question, say "Let me search for the latest information" rather than guessing.

Be warm, intelligent, and direct. Be concise and avoid filler. Use markdown when helpful. If unsure, say so. Push back politely if something is wrong or risky.`
  }

  const handleSendMessage = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return

    const userMessage: Message = { role: 'user', content }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const response = await apiRequest('POST', '/chat', {
        conversation_id: conversationId,
        messages: [userMessage],
        system_prompt: getSystemPrompt(),
      })

      if (response?.response) {
        setConversationId(response.conversation_id)
        setMessages([...newMessages, { role: 'assistant', content: response.response }])
        setBackendStatus('online')
      } else {
        throw new Error(response?.error || 'No response returned')
      }
    } catch (error) {
      console.error('Error:', error)
      setBackendStatus('offline')
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'The backend is not reachable. Check the hosted deployment or your network connection.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleClearConversation = () => {
    setMessages([])
    setConversationId(null)
  }

  return (
    <div className="nebula-bg flex min-h-screen flex-col overflow-hidden text-white md:flex-row">
      <Sidebar
        backendStatus={backendStatus}
        messageCount={messages.length}
        onNewChat={handleClearConversation}
        onToggleSettings={() => setShowSettings(!showSettings)}
        runtimeLabel={getRuntimeLabel()}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex min-h-full items-center justify-center px-4 py-10">
              <div className="animate-fade-up w-full max-w-2xl text-center">
                <div className="mb-6 flex justify-center">
                  <div className="gradient-btn flex h-16 w-16 items-center justify-center rounded-3xl shadow-2xl shadow-indigo-500/40">
                    <Sparkles size={30} className="text-white" />
                  </div>
                </div>
                <h2 className="mb-2 text-4xl font-bold tracking-tight md:text-5xl">
                  <span className="text-gradient">AI ASS</span>
                </h2>
                <p className="mx-auto mb-9 max-w-lg leading-relaxed text-slate-400">
                  Created by BHARATH K · B.Sc AIML. Live web search — always current, always updated.
                  Ask about today&apos;s news, code, ideas, or anything.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {suggestions.map(({ icon: Icon, label, text }) => (
                    <button
                      key={text}
                      onClick={() => handleSendMessage(text)}
                      disabled={loading}
                      className="chip glass flex items-center gap-3 rounded-2xl p-4 text-left"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-violet-500/20">
                        <Icon size={16} className="text-sky-300" />
                      </span>
                      <span className="text-[13px] font-medium text-slate-200">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:py-8">
              {messages.map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}

              {loading && (
                <div className="animate-fade-up flex justify-start">
                  <div className="flex items-start gap-3">
                    <div className="gradient-btn flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-lg shadow-indigo-500/30">
                      <Sparkles size={15} className="text-white" />
                    </div>
                    <div className="glass flex items-center gap-1.5 rounded-2xl rounded-tl-md px-5 py-4">
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

      {showSettings && (
        <SettingsPanel backendStatus={backendStatus} onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}

export default App
