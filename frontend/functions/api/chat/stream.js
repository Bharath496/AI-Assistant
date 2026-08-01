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

export async function onRequestPost(context) {
  let body
  try {
    body = await context.request.json()
  } catch {
    return new Response('Invalid JSON body.', { status: 400 })
  }

  const messages = buildMessages(body)
  if (!messages) {
    return new Response('messages is required.', { status: 400 })
  }

  const conversationId =
    typeof body?.conversation_id === 'string' && body.conversation_id.trim()
      ? body.conversation_id.trim()
      : crypto.randomUUID()

  const temperature = getTemperature(body?.temperature)
  const maxTokens = getMaxTokens(body?.max_tokens)
  const apiKey = context?.env?.HF_API_KEY || ''

  if (!apiKey) {
    // Fallback: non-streaming response
    const hfRes = await fetch(HF_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: context?.env?.HF_MODEL || HF_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    })

    if (!hfRes.ok) {
      return new Response('No LLM provider configured.', { status: 500 })
    }

    const data = await hfRes.json()
    const response = data?.choices?.[0]?.message?.content || ''
    return new Response(
      `data: ${JSON.stringify({ chunk: response })}\ndata: ${JSON.stringify({ done: true, conversation_id: conversationId })}\n\n`,
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      },
    )
  }

  // Streaming response
  const hfRes = await fetch(HF_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: context?.env?.HF_MODEL || HF_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  })

  if (!hfRes.ok) {
    return new Response(`Hugging Face error: ${hfRes.status}`, { status: 500 })
  }

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
            if (!trimmed || !trimmed.startsWith('data:')) continue
            const dataStr = trimmed.slice(5).trim()
            if (dataStr === '[DONE]') break

            try {
              const chunk = JSON.parse(dataStr)
              const delta = chunk?.choices?.[0]?.delta || {}
              const content = delta.content || delta.reasoning_content || ''
              if (content) {
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify({ chunk: content })}\n\n`),
                )
              }
            } catch { /* skip */ }
          }
        }
      } catch (err) {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify({ chunk: `\n\n*Stream error: ${err.message}*` })}\n\n`),
        )
      }

      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify({ done: true, conversation_id: conversationId })}\n\n`),
      )
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
