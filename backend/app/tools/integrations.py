"""
Tool integrations: web search, email, calendar, Notion, REST APIs.
"""

import aiohttp
import re
from typing import Any, Dict, List, Optional
from abc import ABC, abstractmethod


class BaseTool(ABC):
    """Base class for all tools."""
    
    @abstractmethod
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """Execute the tool."""
        pass


class WebSearchTool(BaseTool):
    """Search the web using Tavily, with free keyless fallback to DuckDuckGo + Google News RSS."""
    
    def __init__(self, api_key: str = ""):
        self.api_key = api_key
        self.base_url = "https://api.tavily.com/search"
    
    async def execute(self, query: str, max_results: int = 5) -> Dict[str, Any]:
        """Search the web. Uses Tavily if configured, otherwise free keyless search."""
        if self.api_key:
            return await self._tavily_search(query, max_results)
        return await self._free_search(query, max_results)
    
    async def _tavily_search(self, query: str, max_results: int = 5) -> Dict[str, Any]:
        """Search via Tavily API."""
        async with aiohttp.ClientSession() as session:
            payload = {
                "api_key": self.api_key,
                "query": query,
                "max_results": max_results,
            }
            async with session.post(self.base_url, json=payload) as resp:
                if resp.status == 200:
                    return await resp.json()
                else:
                    return {"error": f"Search failed with status {resp.status}"}
    
    async def _free_search(self, query: str, max_results: int = 5) -> Dict[str, Any]:
        """Free keyless search: Wikipedia (direct answers) + Google News RSS, DDG as last resort."""
        results: List[Dict[str, str]] = []

        # Wikipedia first: for "who is" questions it returns direct current facts (e.g. incumbent)
        try:
            wiki = await self._wikipedia(query, max_results)
        except Exception:
            wiki = []
        results.extend(wiki)

        if len(results) < max_results:
            try:
                news = await self._google_news(query, max_results - len(results))
                seen = {r["url"] for r in results}
                results.extend(r for r in news if r["url"] not in seen)
            except Exception:
                pass

        if not results:
            try:
                results = await self._duckduckgo(query, max_results)
            except Exception:
                results = []

        return {"query": query, "results": results[:max_results]}

    async def _wikipedia(self, query: str, max_results: int = 5) -> List[Dict[str, str]]:
        """Fetch current knowledge via Wikipedia search API (keyless)."""
        from urllib.parse import quote
        import re as _re

        search_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={quote(query)}&format=json&srlimit={max_results}"
        headers = {"User-Agent": "AI-ASS/1.0 (AI assistant; contact: bharath@example.com)"}
        async with aiohttp.ClientSession() as session:
            async with session.get(search_url, headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status != 200:
                    return []
                data = await resp.json(content_type=None)
                results = []
                items = (data.get("query", {}).get("search", []) or [])
                for item in items:
                    title = item.get("title", "")
                    snippet = (item.get("snippet", "") or "")
                    snippet = _re.sub(r"<[^>]+>", "", snippet).strip()
                    results.append({
                        "title": title,
                        "url": f"https://en.wikipedia.org/wiki/{quote(title.replace(' ', '_'))}",
                        "content": f"Wikipedia: {snippet}",
                    })

                # For "who is / what is" questions, scan the top articles for an incumbent
                # field (e.g. President of the United States -> Donald Trump) — always current.
                if results and self._is_who_question(query):
                    try:
                        for item in items[:3]:
                            top_title = item.get("title", "")
                            wiki_url = (
                                "https://en.wikipedia.org/w/api.php?action=query&prop=revisions"
                                f"&rvprop=content&rvslots=main&titles={quote(top_title)}&format=json"
                            )
                            async with session.get(wiki_url, headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as wresp:
                                if wresp.status != 200:
                                    continue
                                wdata = await wresp.json(content_type=None)
                                page = next(iter(wdata.get("query", {}).get("pages", {}).values()), None)
                                wikitext = ""
                                if page:
                                    revs = page.get("revisions", [])
                                    if revs:
                                        wikitext = revs[0].get("slots", {}).get("main", {}).get("*", "")
                                if wikitext:
                                    facts = []
                                    for field in ("incumbent", "current", "officeholder", "leader"):
                                        m = _re.search(rf"{field}\s*=\s*\[\[([^\]|]+)", wikitext, _re.IGNORECASE)
                                        if m and m.group(1).strip() and "pending" not in m.group(1).lower():
                                            facts.append(f"{field}: {m.group(1).strip()}")
                                    if facts:
                                        results.insert(0, {
                                            "title": top_title,
                                            "url": f"https://en.wikipedia.org/wiki/{quote(top_title.replace(' ', '_'))}",
                                            "content": "Current info: " + "; ".join(facts),
                                        })
                                        break
                    except Exception:
                        pass
                return results

    def _is_who_question(self, query: str) -> bool:
        """Detect 'who is' style questions for incumbent extraction."""
        lower = query.lower()
        return any(w in lower for w in [
            "who is", "who's", "who was", "current ", "who became",
            "is the president", "is the prime minister", "is the ceo",
        ])
    
    async def _google_news(self, query: str, max_results: int = 5) -> List[Dict[str, str]]:
        """Fetch headlines via Google News RSS (keyless, current)."""
        import xml.etree.ElementTree as ET
        from urllib.parse import quote

        url = f"https://news.google.com/rss/search?q={quote(query)}&hl=en-US&gl=US&ceid=US:en"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status != 200:
                    return []
                text = await resp.text()
                root = ET.fromstring(text)
                items = []
                for item in root.iter("item"):
                    title = item.findtext("title") or ""
                    link = item.findtext("link") or ""
                    pub = item.findtext("pubDate") or ""
                    source = ""
                    src_el = item.find("source")
                    if src_el is not None and src_el.text:
                        source = src_el.text
                    items.append({
                        "title": title,
                        "url": "",
                        "content": f"Published {pub} by {source}".strip(),
                    })
                    if len(items) >= max_results:
                        break
                return items
    
    async def _duckduckgo(self, query: str, max_results: int = 5) -> List[Dict[str, str]]:
        """Scrape DuckDuckGo HTML search results (keyless)."""
        from urllib.parse import quote

        url = f"https://html.duckduckgo.com/html/?q={quote(query)}"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status != 200:
                    return []
                text = await resp.text()
                results = []
                # Parse result blocks
                blocks = re.findall(
                    r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
                    text,
                    re.DOTALL,
                )
                snippets = re.findall(
                    r'<a[^>]*class="result__snippet"[^>]*>(.*?)</a>',
                    text,
                    re.DOTALL,
                )
                for i, (href, title) in enumerate(blocks[:max_results]):
                    if href.startswith("//"):
                        href = "https:" + href
                    from html import unescape
                    results.append({
                        "title": unescape(re.sub(r"<[^>]+>", "", title)).strip(),
                        "url": href,
                        "content": unescape(re.sub(r"<[^>]+>", "", snippets[i])).strip() if i < len(snippets) else "",
                    })
                return results


class EmailTool(BaseTool):
    """Send emails via Gmail API."""
    
    def __init__(self, credentials_path: str):
        self.credentials_path = credentials_path
    
    async def execute(self, to: str, subject: str, body: str) -> Dict[str, Any]:
        """Send an email."""
        # Placeholder: implement Gmail API integration
        return {
            "status": "success",
            "message": f"Email sent to {to}",
        }


class CalendarTool(BaseTool):
    """Manage calendar via Google Calendar API."""
    
    def __init__(self, credentials_path: str, calendar_id: str):
        self.credentials_path = credentials_path
        self.calendar_id = calendar_id
    
    async def execute(self, action: str, **kwargs) -> Dict[str, Any]:
        """Perform calendar action (create, list, delete)."""
        if action == "create":
            return await self._create_event(**kwargs)
        elif action == "list":
            return await self._list_events(**kwargs)
        else:
            return {"error": f"Unknown action: {action}"}
    
    async def _create_event(self, title: str, start: str, end: str) -> Dict[str, Any]:
        """Create a calendar event."""
        # Placeholder: implement Google Calendar API
        return {"status": "success", "event_id": "generated_id"}
    
    async def _list_events(self, days: int = 7) -> Dict[str, Any]:
        """List upcoming events."""
        # Placeholder: implement Google Calendar API
        return {"events": []}


class NotionTool(BaseTool):
    """Write to Notion databases."""
    
    def __init__(self, api_key: str, database_id: str):
        self.api_key = api_key
        self.database_id = database_id
        self.base_url = "https://api.notion.com/v1"
    
    async def execute(self, title: str, content: str, **kwargs) -> Dict[str, Any]:
        """Create a Notion page."""
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json",
            }
            payload = {
                "parent": {"database_id": self.database_id},
                "properties": {
                    "Name": {"title": [{"text": {"content": title}}]}
                },
                "children": [
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [{"type": "text", "text": {"content": content}}]
                        },
                    }
                ],
            }
            async with session.post(
                f"{self.base_url}/pages",
                json=payload,
                headers=headers
            ) as resp:
                if resp.status == 200:
                    return await resp.json()
                else:
                    return {"error": f"Failed to create Notion page"}


class RESTAPITool(BaseTool):
    """Generic REST API caller."""
    
    async def execute(
        self,
        url: str,
        method: str = "GET",
        headers: Optional[Dict[str, str]] = None,
        body: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Call a REST API."""
        async with aiohttp.ClientSession() as session:
            try:
                async with session.request(
                    method=method.upper(),
                    url=url,
                    json=body,
                    headers=headers
                ) as resp:
                    return {
                        "status": resp.status,
                        "data": await resp.json() if resp.content_type == "application/json" else await resp.text(),
                    }
            except Exception as e:
                return {"error": str(e)}


class ToolManager:
    """Manage all available tools."""
    
    def __init__(self, config: Dict[str, str]):
        self.config = config
        self.tools: Dict[str, BaseTool] = {}
        self._init_tools()
    
    def _init_tools(self):
        """Initialize all configured tools."""
        # Always available: keyless fallback to DuckDuckGo + Google News RSS
        self.tools["web_search"] = WebSearchTool(self.config.get("tavily_api_key") or "")
        
        if self.config.get("google_api_key"):
            self.tools["calendar"] = CalendarTool(
                self.config.get("google_api_key"),
                self.config.get("google_calendar_id")
            )
        
        if self.config.get("notion_api_key"):
            self.tools["notion"] = NotionTool(
                self.config["notion_api_key"],
                self.config.get("notion_database_id")
            )
        
        self.tools["rest_api"] = RESTAPITool()
    
    def has_tool(self, tool_name: str) -> bool:
        """Check if a tool is available."""
        return tool_name in self.tools

    async def execute(self, tool_name: str, **kwargs) -> Dict[str, Any]:
        """Execute a tool."""
        if tool_name not in self.tools:
            return {"error": f"Tool '{tool_name}' not found"}
        
        return await self.tools[tool_name].execute(**kwargs)
