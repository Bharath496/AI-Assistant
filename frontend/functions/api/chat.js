const HF_MODEL = 'Qwen/Qwen2.5-7B-Instruct'
const HF_ENDPOINT = 'https://router.huggingface.co/v1/chat/completions'

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

const normalizeMessage = (message) => {
  if (!isPlainObject(message)) {
    return null
  }

  const role = typeof message.role === 'string' ? message.role.trim() : ''
  const content = typeof message.content === 'string' ? message.content : ''

  if (!role || !content) {
    return null
  }

  return { role, content }
}

const buildMessages = (body) => {
  const messages = Array.isArray(body?.messages) ? body.messages.map(normalizeMessage).filter(Boolean) : []
  const systemPrompt = typeof body?.system_prompt === 'string' ? body.system_prompt.trim() : ''

  if (!messages.length) {
    return null
  }

  const aiMessages = []

  if (systemPrompt) {
    aiMessages.push({ role: 'system', content: systemPrompt })
  }

  aiMessages.push(...messages)
  return aiMessages
}

const getTemperature = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  return 0.7
}

const getMaxTokens = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.floor(value))
  }
  return 512
}

const hfChat = async (env, messages, temperature, maxTokens) => {
  const apiKey = env?.HF_API_KEY || ''
  if (!apiKey) {
    return { ok: false, response: '' }
  }

  const res = await fetch(HF_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env?.HF_MODEL || HF_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!res.ok) {
    return { ok: false, response: '' }
  }

  const data = await res.json()
  const message = data?.choices?.[0]?.message || {}
  const response = message.content || message.reasoning_content || ''

  return {
    ok: Boolean(response),
    response,
    usage: data?.usage || { prompt_tokens: 0, completion_tokens: 0 },
  }
}

const workersAIFallback = async (context, messages, temperature, maxTokens) => {
  if (!context?.env?.AI?.run) {
    return { ok: false, response: '' }
  }

  const result = await context.env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
    messages,
    temperature,
    max_tokens: maxTokens,
  })

  return {
    ok: Boolean(result?.response),
    response: typeof result?.response === 'string' ? result.response : '',
    usage: isPlainObject(result?.usage) ? result.usage : { prompt_tokens: 0, completion_tokens: 0 },
  }
}

export async function onRequestPost(context) {
  let body
  try {
    body = await context.request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const messages = buildMessages(body)
  if (!messages) {
    return Response.json({ error: 'messages is required.' }, { status: 400 })
  }

  const conversationId =
    typeof body?.conversation_id === 'string' && body.conversation_id.trim()
      ? body.conversation_id.trim()
      : crypto.randomUUID()

  const temperature = getTemperature(body?.temperature)
  const maxTokens = getMaxTokens(body?.max_tokens)

  // Prefer Hugging Face (free serverless inference), fall back to Workers AI
  const hf = await hfChat(context.env, messages, temperature, maxTokens)
  const result = hf.ok ? hf : await workersAIFallback(context, messages, temperature, maxTokens)

  if (!result.ok) {
    return Response.json(
      { error: 'No LLM provider configured. Set HF_API_KEY secret (or the AI binding) for this Pages project.' },
      { status: 500 },
    )
  }

  return Response.json({
    conversation_id: conversationId,
    response: result.response,
    usage: result.usage,
  })
}
