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

// Smart web search with multiple strategies
const searchWeb = async (query) => {
  const newsResults = []
  const wikiResults = []
  const lowerQuery = query.toLowerCase()

  // Strategy 1: BBC News RSS (reliable, real headlines)
  try {
    const newsRes = await fetch('https://feeds.bbci.co.uk/news/rss.xml', {
      headers: { 'User-Agent': 'AI-ASS/1.0' },
    })
    if (newsRes.ok) {
      const xml = await newsRes.text()
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || []
      for (const item of items.slice(0, 8)) {
        let title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || ''
        const cdata = title.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
        if (cdata) title = cdata[1]
        title = title.trim()
        const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || ''
        const desc = item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || ''
        let descText = desc
        const descCdata = descText.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
        if (descCdata) descText = descCdata[1]
        descText = descText.replace(/<[^>]*>/g, '').substring(0, 200).trim()
        if (title && title.length > 5) {
          newsResults.push({ title, content: descText, url: link })
        }
      }
    }
  } catch {}

  // Strategy 2: DuckDuckGo HTML search (backup)
  if (newsResults.length < 3) {
    try {
      const ddgRes = await fetch(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) },
      )
      if (ddgRes.ok) {
        const html = await ddgRes.text()
        const results = html.match(/<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/g) || []
        const snippets = html.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g) || []
        for (let i = 0; i < Math.min(results.length, 4); i++) {
          const title = results[i]?.replace(/<[^>]*>/g, '').trim() || ''
          const snippet = snippets[i]?.replace(/<[^>]*>/g, '').trim() || ''
          if (title) newsResults.push({ title, content: snippet, url: '' })
        }
      }
    } catch {}
  }

  // Strategy 3: Wikipedia page summary for specific topics
  const summaryTopics = ['president of the united states', 'prime minister of the united kingdom', 'artificial intelligence']
  for (const topic of summaryTopics) {
    if (lowerQuery.includes(topic.split(' ')[0]) || lowerQuery.includes(topic)) {
      try {
        const slug = topic.replace(/ /g, '_')
        const sumRes = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`,
          { headers: { 'User-Agent': 'AI-ASS/1.0' }, signal: AbortSignal.timeout(4000) },
        )
        if (sumRes.ok) {
          const data = await sumRes.json()
          if (data.extract) {
            wikiResults.push({ title: data.title, content: data.extract, url: data.content_urls?.desktop?.page || '' })
          }
        }
      } catch {}
    }
  }

  // Strategy 4: Wikipedia API search (backup)
  if (wikiResults.length < 2) {
    try {
      const wikiRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=2`,
        { headers: { 'User-Agent': 'AI-ASS/1.0' }, signal: AbortSignal.timeout(4000) },
      )
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json()
        for (const r of wikiData?.query?.search || []) {
          wikiResults.push({ title: r.title, content: r.snippet?.replace(/<[^>]*>/g, '') || '', url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title)}` })
        }
      }
    } catch {}
  }

  return [...newsResults, ...wikiResults]
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
  ctx += '--- End of web search results ---\n\nYou MUST answer using ONLY the above current web search results. These are live, real-time data fetched from the internet. Do NOT say you lack access to real-time information — the search results ARE your real-time data. Answer directly from the results above.'
  return ctx
}

const hfChat = async (env, messages, temperature, maxTokens) => {
  const apiKey = env?.HF_API_KEY || ''
  if (!apiKey) return { ok: false, response: '' }

  const res = await fetch(HF_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: env?.HF_MODEL || HF_MODEL, messages, temperature, max_tokens: maxTokens }),
  })

  if (!res.ok) return { ok: false, response: '' }
  const data = await res.json()
  const message = data?.choices?.[0]?.message || {}
  return {
    ok: Boolean(message.content || message.reasoning_content),
    response: message.content || message.reasoning_content || '',
    usage: data?.usage || { prompt_tokens: 0, completion_tokens: 0 },
  }
}

const workersAIFallback = async (context, messages, temperature, maxTokens) => {
  if (!context?.env?.AI?.run) return { ok: false, response: '' }
  const result = await context.env.AI.run('@cf/meta/llama-3.2-3b-instruct', { messages, temperature, max_tokens: maxTokens })
  return {
    ok: Boolean(result?.response),
    response: typeof result?.response === 'string' ? result.response : '',
    usage: isPlainObject(result?.usage) ? result.usage : { prompt_tokens: 0, completion_tokens: 0 },
  }
}

export async function onRequestPost(context) {
  let body
  try { body = await context.request.json() } catch { return Response.json({ error: 'Invalid JSON body.' }, { status: 400 }) }

  const messages = buildMessages(body)
  if (!messages) return Response.json({ error: 'messages is required.' }, { status: 400 })

  const conversationId = typeof body?.conversation_id === 'string' && body.conversation_id.trim()
    ? body.conversation_id.trim() : crypto.randomUUID()

  const temperature = getTemperature(body?.temperature)
  const maxTokens = getMaxTokens(body?.max_tokens)

  // Auto web search — inject results into the system prompt
  const userText = body?.messages?.[body.messages.length - 1]?.content || ''
  if (userText) {
    try {
      const results = await searchWeb(userText)
      if (results.length) {
        const webCtx = buildWebContext(results)
        // Find the system prompt and append web results to it
        const sysIdx = messages.findIndex(m => m.role === 'system')
        if (sysIdx >= 0) {
          messages[sysIdx].content += '\n\n' + webCtx
        } else {
          messages.unshift({ role: 'system', content: webCtx })
        }
      }
    } catch {}
  }

  const hf = await hfChat(context.env, messages, temperature, maxTokens)
  const result = hf.ok ? hf : await workersAIFallback(context, messages, temperature, maxTokens)

  if (!result.ok) return Response.json({ error: 'No LLM provider configured.' }, { status: 500 })

  return Response.json({ conversation_id: conversationId, response: result.response, usage: result.usage })
}
