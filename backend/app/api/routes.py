"""
FastAPI routes for the AI assistant backend.
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
import json

router = APIRouter()

# Import managers
from app.config import Settings, get_settings
from app.core.llm import LLMManager
from app.memory.store import MemoryStore
from app.tools.integrations import ToolManager


# Pydantic models
class Message(BaseModel):
    role: str  # user, assistant
    content: str


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    messages: List[Message]
    system_prompt: Optional[str] = None
    temperature: float = 0.7
    max_tokens: Optional[int] = None


class ChatResponse(BaseModel):
    conversation_id: str
    response: str
    usage: Dict[str, int]


class ToolRequest(BaseModel):
    tool_name: str
    kwargs: Dict[str, Any]


class FactRequest(BaseModel):
    key: str
    value: Any


# Lazy singleton instances
_llm_manager: Optional[LLMManager] = None
_tool_manager: Optional[ToolManager] = None
memory_store = MemoryStore()


def get_llm_manager(settings: Settings = Depends(get_settings)) -> LLMManager:
    """Get LLM manager singleton."""
    global _llm_manager
    if _llm_manager is None:
        _llm_manager = LLMManager(
            provider=settings.llm_provider,
            model=settings.llm_model,
            openai_api_key=settings.openai_api_key,
            openai_base_url=settings.openai_base_url,
            anthropic_api_key=settings.anthropic_api_key,
            anthropic_base_url=settings.anthropic_base_url,
            ollama_base_url=settings.ollama_base_url,
            huggingface_api_key=settings.huggingface_api_key,
            huggingface_model=settings.huggingface_model,
            huggingface_base_url=settings.huggingface_base_url,
        )
    return _llm_manager


def get_tool_manager(settings: Settings = Depends(get_settings)) -> ToolManager:
    """Get tool manager singleton."""
    global _tool_manager
    if _tool_manager is None:
        _tool_manager = ToolManager({
            "tavily_api_key": settings.tavily_api_key,
            "google_api_key": settings.google_api_key,
            "google_calendar_id": settings.google_calendar_id,
            "notion_api_key": settings.notion_api_key,
            "notion_database_id": settings.notion_database_id,
        })
    return _tool_manager


# Routes
@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    llm: LLMManager = Depends(get_llm_manager),
    tool_manager: ToolManager = Depends(get_tool_manager),
):
    """
    Send a message and get a response. Auto-injects web search results for current-events queries.
    """
    if not request.conversation_id:
        request.conversation_id = str(uuid.uuid4())
    
    # Get conversation history
    history = memory_store.get_conversation_history(request.conversation_id)
    
    # Combine with new messages
    messages = history + [
        {"role": msg.role, "content": msg.content}
        for msg in request.messages
    ]
    
    user_text = request.messages[-1].content if request.messages else ""
    
    # Auto web search for current-information queries
    search_result = None
    if user_text and tool_manager.has_tool("web_search"):
        try:
            search_result = await tool_manager.execute("web_search", query=user_text, max_results=3)
        except Exception:
            pass

    web_context = ""
    if search_result and "results" in search_result and search_result["results"]:
        web_context = "\n\n--- Web Search Results (live, current) ---\n"
        for i, r in enumerate(search_result["results"][:3], 1):
            title = r.get("title", "")
            snippet = r.get("content", r.get("snippet", ""))
            url = r.get("url", "")
            web_context += f"{i}. **{title}**\n   {snippet}"
            if url:
                web_context += f"\n   Source: {url}"
            web_context += "\n\n"
        web_context += "--- End of web search results ---\n\nUse the above current information to answer the user. If the web results are relevant, cite them. If not, answer from your own knowledge."

        messages.append({"role": "system", "content": web_context})
    
    # Get response from LLM
    result = await llm.chat(
        messages=messages,
        system_prompt=request.system_prompt,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
    )
    
    # Fallback-mode rescue: if no provider is connected (mock/fallback response detected)
    # and we have live web results, return those instead of a canned fallback reply.
    response_text = result.get("response", "")
    fallback_markers = [
        "fallback mode",
        "Connect a provider",
        "I'm not sure yet",
        "You said:",
        "connect a provider",
    ]
    is_fallback = any(marker in response_text for marker in fallback_markers)
    if is_fallback and web_context:
        import re as _re
        # Cut everything from the final instruction line, then strip the section markers
        clean_results = web_context.split("Use the above current information")[0]
        clean_results = _re.sub(r"^\s*---\s*(Web Search Results \(live, current\)|End of web search results)\s*---\s*$", "", clean_results, flags=_re.MULTILINE).strip()
        clean_results = _re.sub(r"\n\s*\n\s*\n+", "\n\n", clean_results)
        # Shorten long redirect URLs so they display as plain links
        clean_results = _re.sub(r"(https?://news\.google\.com/rss/articles/[^\s]+)", "news.google.com", clean_results)
        response_text = (
            "I'm running without a connected model right now (add your HUGGINGFACE_API_KEY in backend/.env for full AI answers), "
            "but here are **live results for your question**:\n\n"
            + clean_results
            + "\n\n*(Tip: set your HUGGINGFACE_API_KEY in backend/.env to get real AI answers alongside live search.)*"
        )
    
    # Store messages
    for msg in request.messages:
        memory_store.add_message(request.conversation_id, msg.role, msg.content)
    memory_store.add_message(request.conversation_id, "assistant", response_text)

    return ChatResponse(
        conversation_id=request.conversation_id,
        response=response_text,
        usage=result.get("usage", {"prompt_tokens": 0, "completion_tokens": 0}),
    )


@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    llm: LLMManager = Depends(get_llm_manager),
    tool_manager: ToolManager = Depends(get_tool_manager),
):
    """Stream chat response via Server-Sent Events."""
    if not request.conversation_id:
        request.conversation_id = str(uuid.uuid4())

    history = memory_store.get_conversation_history(request.conversation_id)
    messages = history + [
        {"role": msg.role, "content": msg.content}
        for msg in request.messages
    ]

    user_text = request.messages[-1].content if request.messages else ""

    # Auto web search
    web_context = ""
    if user_text and tool_manager.has_tool("web_search"):
        try:
            search_result = await tool_manager.execute("web_search", query=user_text, max_results=3)
            if search_result and "results" in search_result and search_result["results"]:
                web_context = "\n\n--- Web Search Results (live, current) ---\n"
                for i, r in enumerate(search_result["results"][:3], 1):
                    title = r.get("title", "")
                    snippet = r.get("content", r.get("snippet", ""))
                    url = r.get("url", "")
                    web_context += f"{i}. **{title}**\n   {snippet}"
                    if url:
                        web_context += f"\n   Source: {url}"
                    web_context += "\n\n"
                web_context += "--- End of web search results ---\n\nUse the above current information to answer the user."
                messages.append({"role": "system", "content": web_context})
        except Exception:
            pass

    conversation_id = request.conversation_id
    full_response = []

    async def event_generator():
        async for chunk in llm.chat_stream(
            messages=messages,
            system_prompt=request.system_prompt,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        ):
            full_response.append(chunk)
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"

        # Store the complete response
        response_text = "".join(full_response)
        for msg in request.messages:
            memory_store.add_message(conversation_id, msg.role, msg.content)
        memory_store.add_message(conversation_id, "assistant", response_text)

        yield f"data: {json.dumps({'done': True, 'conversation_id': conversation_id})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get conversation history."""
    history = memory_store.get_conversation_history(conversation_id, limit=100)
    return {"conversation_id": conversation_id, "messages": history}


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation."""
    memory_store.clear_conversation(conversation_id)
    return {"status": "deleted"}


@router.post("/facts")
async def set_fact(request: FactRequest):
    """Store a user fact."""
    memory_store.set_fact(request.key, request.value)
    return {"status": "success", "key": request.key}


@router.get("/facts/{key}")
async def get_fact(key: str):
    """Retrieve a user fact."""
    value = memory_store.get_fact(key)
    if value is None:
        raise HTTPException(status_code=404, detail="Fact not found")
    return {"key": key, "value": value}


@router.get("/facts")
async def get_all_facts():
    """Get all user facts."""
    facts = memory_store.get_all_facts()
    return {"facts": facts}


@router.post("/tools/execute")
async def execute_tool(
    request: ToolRequest,
    tool_manager: ToolManager = Depends(get_tool_manager),
):
    """Execute a tool."""
    result = await tool_manager.execute(request.tool_name, **request.kwargs)
    return result


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@router.post("/search")
async def search_web(
    request: ToolRequest,
    tool_manager: ToolManager = Depends(get_tool_manager),
):
    """Search the web for current information."""
    if not tool_manager.has_tool("web_search"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Web search not configured - set TAVILY_API_KEY")
    result = await tool_manager.execute("web_search", **request.kwargs)
    return result


@router.post("/semantic-search")
async def semantic_search_endpoint(payload: dict):
    """Search past conversations semantically."""
    query = payload.get("query", "")
    if not query:
        raise HTTPException(status_code=400, detail="query is required")
    results = memory_store.semantic_search(query, top_k=payload.get("top_k", 5))
    return {"results": results}
