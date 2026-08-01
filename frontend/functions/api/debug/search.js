export async function onRequestGet(context) {
  const results = []

  // Test rss2json
  try {
    const rssUrl = 'https://news.google.com/rss/search?q=news+today&hl=en-US&gl=US&ceid=US:en'
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const data = await res.json()
      for (const item of (data.items || []).slice(0, 5)) {
        results.push({ source: 'rss2json', title: item.title, link: item.link })
      }
    } else {
      results.push({ source: 'rss2json', error: `HTTP ${res.status}` })
    }
  } catch (e) {
    results.push({ source: 'rss2json', error: e.message })
  }

  // Test DuckDuckGo
  try {
    const res = await fetch('https://html.duckduckgo.com/html/?q=news+today', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(6000),
    })
    if (res.ok) {
      const html = await res.text()
      const titles = html.match(/<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/g) || []
      results.push({ source: 'duckduckgo', count: titles.length, first: titles[0]?.replace(/<[^>]*>/g, '').trim() })
    } else {
      results.push({ source: 'duckduckgo', error: `HTTP ${res.status}` })
    }
  } catch (e) {
    results.push({ source: 'duckduckgo', error: e.message })
  }

  return Response.json({ results, hf_key: Boolean(context?.env?.HF_API_KEY) })
}
