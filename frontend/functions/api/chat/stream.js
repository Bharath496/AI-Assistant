const HF_MODEL = 'Qwen/Qwen2.5-7B-Instruct'
const HF_ENDPOINT = 'https://router.huggingface.co/v1/chat/completions'

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

const normalizeMessage = (message) => {
  if (!isPlainObject(message)) return null
  const role = typeof message.role === 'string' ? message.role.trim() : ''
  const content = typeof message.content === 'string' ? message.content : ''
  if (!role || !content) return null
  return { role, content }
}

const buildMessages = (body) => {
  const messages = Array.isArray(body?.messages) ? body.messages.map(normalizeMessage).filter(Boolean) : []
  const systemPrompt = typeof body?.system_prompt === 'string' ? body.system_prompt.trim() : ''
  if (!messages.length) return null
  const aiMessages = []
  if (systemPrompt) aiMessages.push({ role: 'system', content: systemPrompt })
  aiMessages.push(...messages)
  return aiMessages
}

const getTemperature = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0.7)
const getMaxTokens = (value) => (typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1024)

// Live web search
const searchWeb = async (query) => {
  const results = []
  try {
    const wikiRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=3`,
      { headers: { 'User-Agent': 'AI-ASS/1.0 (AI assistant)' }, signal: AbortSignal.timeout(5000) },
    )
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json()
      for (const r of wikiData?.query?.search || []) {
        results.push({
          title: r.title,
          content: r.snippet?.replace(/<[^>]*>/g, '') || '',
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title)}`,
        })
      }
    }
  } catch {}

  try {
    const newsRes = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
      { headers: { 'User-Agent': 'AI-ASS/1.0 (AI assistant)' }, signal: AbortSignal.timeout(5000) },
    )
    if (newsRes.ok) {
      const xml = await newsRes.text()
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || []
      for (const item of items.slice(0, 5)) {
        const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1') || ''
        const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || ''
        if (title) results.push({ title: title.replace(/ - .*$/, ''), content: '', url: link })
      }
    }
  } catch {}

  return results
}

const buildWebContext = (results) => {
  if (!results.length) return ''
  let ctx = '\n\n--- Web Search Results (live, current) ---\n'
  for (let i = 0; i < results.length && i < 8; i++) {
    const r = results[i]
    ctx += `${i + 1}. **${r.title}**`
    if (r.content) ctx += `\n   ${r.content}`
    if (r.url) ctx += `\n   Source: ${r.url}`
    ctx += '\n\n'
  }
  ctx += '--- End of web search results ---\n\nUse ONLY the above current information to answer the user. If the web results are relevant, cite them.'
  return ctx
}

export async function onRequestPost(context) {
  let body
  try { body = await context.request.json() } catch { return new Response('Invalid JSON.', { status: 400 }) }

  const messages = buildMessages(body)
  if (!messages) return new Response('messages is required.', { status: 400 })

  const conversationId = typeof body?.conversation_id === 'string' && body.conversation_id.trim()
    ? body.conversation_id.trim() : crypto.randomUUID()

  const temperature = getTemperature(body?.temperature)
  const maxTokens = getMaxTokens(body?.max_tokens)

  // Web search
  const userText = body?.messages?.[body.messages.length - 1]?.content || ''
  if (userText) {
    try {
      const results = await searchWeb(userText)
      if (results.length) messages.push({ role: 'system', content: buildWebContext(results) })
    } catch {}
  }

  const apiKey = context?.env?.HF_API_KEY || ''
  if (!apiKey) return new Response('No LLM provider configured.', { status: 500 })

  const hfRes = await fetch(HF_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: context?.env?.HF_MODEL || HF_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  })

  if (!hfRes.ok) return new Response(`HF error: ${hfRes.status}`, { status: 500 })

  const reader = hfRes.body.getReader()
  const decoder = new TextDecoder()

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const dataStr = trimmed.slice(5).trim()
            if (dataStr === '[DONE]') break
            try {
              const chunk = JSON.parse(dataStr)
              const content = chunk?.choices?.[0]?.delta?.content || chunk?.choices?.[0]?.delta?.reasoning_content || ''
              if (content) controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ chunk: content })}\n\n`))
            } catch {}
          }
        }
      } catch (err) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ chunk: `\n\n*Stream error: ${err.message}*` })}\n\n`))
      }
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true, conversation_id: conversationId })}\n\n`))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' },
  })
}
