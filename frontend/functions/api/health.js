export function onRequestGet(context) {
  const hasHF = Boolean(context?.env?.HF_API_KEY)
  return Response.json({
    status: 'ok',
    runtime: 'cloudflare-pages',
    has_hf_key: hasHF,
  })
}
