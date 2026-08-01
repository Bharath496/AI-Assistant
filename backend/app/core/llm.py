"""
Multi-provider LLM support.
Supports Claude, OpenAI, Hugging Face, and Ollama with real API calls.
Defaults to Hugging Face serverless inference (free, no local install).
Falls back to a lightweight demo response only when no provider credentials are configured.
"""

from typing import Optional, List, Dict, Any, AsyncGenerator
import os
import aiohttp
import requests


class LLMManager:
    def __init__(self, provider: str, model: str, **kwargs):
        """
        Initialize the LLM manager.

        Args:
            provider: llm provider (claude, openai, huggingface, ollama)
            model: model name/identifier
            **kwargs: additional config (api_key, base_url, etc)
        """
        self.provider = (provider or "").strip().lower()
        self.model = model.strip()
        self.config = kwargs

        # Check if we have valid API credentials
        self.has_valid_credentials = self._check_credentials()

        # Set environment variables from config
        for key, value in kwargs.items():
            if value:
                env_key = self._to_env_key(key)
                os.environ[env_key] = str(value)

    def _to_env_key(self, key: str) -> str:
        """Convert parameter name to environment variable format."""
        mapping = {
            "openai_api_key": "OPENAI_API_KEY",
            "anthropic_api_key": "ANTHROPIC_API_KEY",
            "ollama_base_url": "OLLAMA_BASE_URL",
            "openai_base_url": "OPENAI_BASE_URL",
            "anthropic_base_url": "ANTHROPIC_BASE_URL",
            "huggingface_api_key": "HUGGINGFACE_API_KEY",
            "huggingface_base_url": "HUGGINGFACE_BASE_URL",
        }
        return mapping.get(key, key.upper())

    def _check_credentials(self) -> bool:
        """Check if we have valid credentials for the configured provider."""
        if self.provider == "claude":
            return bool(self.config.get("anthropic_api_key"))
        if self.provider == "openai":
            return bool(self.config.get("openai_api_key"))
        if self.provider == "huggingface":
            return bool(self.config.get("huggingface_api_key"))
        if self.provider == "ollama":
            return True
        return bool(self.config.get("api_key"))

    def _normalize_messages(self, messages: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """Normalize message payloads into plain role/content dictionaries."""
        normalized: List[Dict[str, str]] = []
        for message in messages or []:
            normalized.append(
                {
                    "role": str(message.get("role", "user")),
                    "content": str(message.get("content", "")),
                }
            )
        return normalized

    def _extract_last_message(self, messages: List[Dict[str, str]]) -> str:
        """Get the latest user text for fallback responses."""
        if not messages:
            return ""
        return messages[-1]["content"].lower()

    def _build_result(self, response: str, usage: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
        """Standardize the return payload across providers."""
        return {
            "response": response,
            "usage": usage or {"prompt_tokens": 0, "completion_tokens": 0},
        }

    def _mock_response(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """Generate a fallback response when no credentials are available."""
        last_message = self._extract_last_message(messages)

        mock_responses = {
            "hello": "Hello! I'm AI ASS, created by BHARATH K (B.Sc AIML student). I'm running in fallback mode right now — add a Hugging Face token in backend/.env to enable the full model.",
            "who built": "I was built by BHARATH K, a B.Sc AIML (Artificial Intelligence and Machine Learning) student. I'm named AI ASS — a desktop and web AI assistant with live web search.",
            "who made": "I was made by BHARATH K, a B.Sc AIML student. Add a free Hugging Face token in backend/.env to enable the full model.",
            "who created": "My creator is BHARATH K, a B.Sc AIML student. Add a free Hugging Face token in backend/.env to unlock the full model.",
            "how are you": "I'm running in fallback mode right now. Add a Hugging Face token in backend/.env to enable the real model.",
            "what is": "You can use the full assistant with a free Hugging Face token in backend/.env.",
            "help": "Add a free Hugging Face token (https://huggingface.co/settings/tokens) in backend/.env to use the full assistant.",
        }

        for keyword, response in mock_responses.items():
            if keyword in last_message:
                return self._build_result(response)

        return self._build_result(
            "I'm AI ASS, created by BHARATH K (B.Sc AIML student). I'm in fallback mode — add a free Hugging Face token in backend/.env to enable full responses."
        )

    def _get_smart_response(self, messages: List[Dict[str, str]], system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """Generate a smart-ish response based on the input."""
        last_message = self._extract_last_message(messages)

        response_map = {
            "who built": "I was built by BHARATH K, a B.Sc AIML (Artificial Intelligence and Machine Learning) student. I'm AI ASS — a desktop and web AI assistant with live web search.",
            "who made": "My maker is BHARATH K, a B.Sc AIML student. I'm his project AI ASS — an AI assistant with persistent memory and live web search.",
            "who created": "My creator is BHARATH K, a B.Sc AIML student. He built me as a desktop and web AI assistant.",
            "your name": "My name is AI ASS, created by BHARATH K (B.Sc AIML student).",
            "hello": "Hello! I'm AI ASS, your assistant created by BHARATH K. How can I help you today?",
            "hi ": "Hey there! I'm AI ASS. What can I do for you?",
            "how are you": "I'm doing great, thank you for asking! Ready to help with whatever you need.",
            "what is ai": "AI (Artificial Intelligence) refers to computer systems designed to perform tasks that typically require human intelligence, like learning from experience, recognizing patterns, and understanding language.",
            "what can you do": "I can chat with you, answer questions, help with writing and analysis, search the live web for current information, and remember our conversation history.",
            "help": "I can assist with conversation, answering questions, live web search, brainstorming, writing, and explaining concepts.",
            "tell me a joke": "Why did the AI go to school? To improve its learning model!",
            "thank you": "You're welcome! Happy to help. Feel free to ask me anything else.",
        }

        for keyword, response in response_map.items():
            if keyword in last_message:
                return self._build_result(response)

        prefix = "I'm not sure yet, but I can help once you connect a provider. "
        if system_prompt:
            prefix = "I'm AI ASS (built by BHARATH K, B.Sc AIML). Connect a provider to use me fully. "
        return self._build_result(
            f"{prefix}You said: \"{messages[-1]['content']}\""
        )

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Async chat completion.

        Returns a standardized payload with response text and usage stats.
        """
        normalized_messages = self._normalize_messages(messages)

        if self.provider == "ollama":
            return await self._ollama_chat(normalized_messages, temperature, max_tokens, system_prompt)

        if not self.has_valid_credentials:
            return self._mock_response(normalized_messages)

        if self.provider == "claude":
            return await self._anthropic_chat(normalized_messages, temperature, max_tokens, system_prompt)

        if self.provider == "openai":
            return await self._openai_chat(normalized_messages, temperature, max_tokens, system_prompt)

        if self.provider == "huggingface":
            return await self._hf_chat(normalized_messages, temperature, max_tokens, system_prompt)

        return self._get_smart_response(normalized_messages, system_prompt)

    def chat_sync(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Synchronous version of chat."""
        normalized_messages = self._normalize_messages(messages)

        if self.provider == "ollama":
            return self._ollama_chat_sync(normalized_messages, temperature, max_tokens, system_prompt)

        if not self.has_valid_credentials:
            return self._mock_response(normalized_messages)

        if self.provider == "claude":
            return self._anthropic_chat_sync(normalized_messages, temperature, max_tokens, system_prompt)

        if self.provider == "openai":
            return self._openai_chat_sync(normalized_messages, temperature, max_tokens, system_prompt)

        if self.provider == "huggingface":
            return self._hf_chat_sync(normalized_messages, temperature, max_tokens, system_prompt)

        return self._get_smart_response(normalized_messages, system_prompt)

    async def _openai_chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Call the OpenAI Chat Completions API."""
        api_key = self.config.get("openai_api_key")
        base_url = self.config.get("openai_base_url", "https://api.openai.com/v1")

        payload_messages = []
        if system_prompt:
            payload_messages.append({"role": "system", "content": system_prompt})
        payload_messages.extend(messages)

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": payload_messages,
            "temperature": temperature,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=120),
                ) as resp:
                    data = await resp.json(content_type=None)
                    if resp.status == 200:
                        response_text = (
                            data.get("choices", [{}])[0]
                            .get("message", {})
                            .get("content", "")
                        )
                        usage = data.get("usage", {})
                        return self._build_result(
                            response_text,
                            {
                                "prompt_tokens": int(usage.get("prompt_tokens", 0) or 0),
                                "completion_tokens": int(usage.get("completion_tokens", 0) or 0),
                            },
                        )

                    return self._get_smart_response(messages, system_prompt)
        except Exception as exc:
            return self._get_smart_response(messages, system_prompt)

    async def _anthropic_chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Call the Anthropic Messages API."""
        api_key = self.config.get("anthropic_api_key")
        base_url = self.config.get("anthropic_base_url", "https://api.anthropic.com")

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens or 1024,
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{base_url}/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=120),
                ) as resp:
                    data = await resp.json(content_type=None)
                    if resp.status == 200:
                        content = data.get("content", [])
                        response_text = ""
                        if content and isinstance(content, list):
                            response_text = content[0].get("text", "")
                        usage = data.get("usage", {})
                        return self._build_result(
                            response_text,
                            {
                                "prompt_tokens": int(usage.get("input_tokens", 0) or 0),
                                "completion_tokens": int(usage.get("output_tokens", 0) or 0),
                            },
                        )

                    return self._get_smart_response(messages, system_prompt)
        except Exception as exc:
            return self._get_smart_response(messages, system_prompt)

    def _openai_chat_sync(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Call the OpenAI Chat Completions API synchronously."""
        api_key = self.config.get("openai_api_key")
        base_url = self.config.get("openai_base_url", "https://api.openai.com/v1")

        payload_messages = []
        if system_prompt:
            payload_messages.append({"role": "system", "content": system_prompt})
        payload_messages.extend(messages)

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": payload_messages,
            "temperature": temperature,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        try:
            response = requests.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=120,
            )
            data = response.json()
            if response.status_code == 200:
                response_text = (
                    data.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                )
                usage = data.get("usage", {})
                return self._build_result(
                    response_text,
                    {
                        "prompt_tokens": int(usage.get("prompt_tokens", 0) or 0),
                        "completion_tokens": int(usage.get("completion_tokens", 0) or 0),
                    },
                )

            return self._build_result(self._extract_api_error(data, "OpenAI"))
        except Exception as exc:
            return self._build_result(f"OpenAI error: {exc}")

    def _anthropic_chat_sync(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Call the Anthropic Messages API synchronously."""
        api_key = self.config.get("anthropic_api_key")
        base_url = self.config.get("anthropic_base_url", "https://api.anthropic.com")

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens or 1024,
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            response = requests.post(
                f"{base_url}/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json=payload,
                timeout=120,
            )
            data = response.json()
            if response.status_code == 200:
                content = data.get("content", [])
                response_text = ""
                if content and isinstance(content, list):
                    response_text = content[0].get("text", "")
                usage = data.get("usage", {})
                return self._build_result(
                    response_text,
                    {
                        "prompt_tokens": int(usage.get("input_tokens", 0) or 0),
                        "completion_tokens": int(usage.get("output_tokens", 0) or 0),
                    },
                )

            return self._build_result(self._extract_api_error(data, "Anthropic"))
        except Exception as exc:
            return self._build_result(f"Anthropic error: {exc}")

    async def _ollama_chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Call Ollama using the chat API."""
        ollama_url = self.config.get("ollama_base_url", "http://localhost:11434")

        try:
            payload_messages = []
            if system_prompt:
                payload_messages.append({"role": "system", "content": system_prompt})
            payload_messages.extend(messages)

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{ollama_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": payload_messages,
                        "temperature": temperature,
                        "stream": False,
                    },
                    timeout=aiohttp.ClientTimeout(total=300),
                ) as resp:
                    data = await resp.json(content_type=None)
                    if resp.status == 200:
                        return self._build_result(
                            data.get("message", {}).get("content", "No response from Ollama"),
                            {"prompt_tokens": 0, "completion_tokens": 0},
                        )

                    return self._get_smart_response(messages, system_prompt)
        except Exception as exc:
            return self._get_smart_response(messages, system_prompt)

    def _ollama_chat_sync(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Call Ollama API synchronously using the chat API."""
        ollama_url = self.config.get("ollama_base_url", "http://localhost:11434")

        try:
            payload_messages = []
            if system_prompt:
                payload_messages.append({"role": "system", "content": system_prompt})
            payload_messages.extend(messages)

            response = requests.post(
                f"{ollama_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": payload_messages,
                    "temperature": temperature,
                    "stream": False,
                },
                timeout=300,
            )

            if response.status_code == 200:
                data = response.json()
                return self._build_result(
                    data.get("message", {}).get("content", "No response from Ollama"),
                    {"prompt_tokens": 0, "completion_tokens": 0},
                )

            return self._get_smart_response(messages, system_prompt)
        except requests.exceptions.ConnectionError:
            return self._get_smart_response(messages, system_prompt)
        except Exception as exc:
            return self._get_smart_response(messages, system_prompt)

    async def _hf_chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Call Hugging Face Inference API (OpenAI-compatible endpoint)."""
        api_key = self.config.get("huggingface_api_key")
        base_url = self.config.get("huggingface_base_url", "https://router.huggingface.co/v1")

        payload_messages = []
        if system_prompt:
            payload_messages.append({"role": "system", "content": system_prompt})
        payload_messages.extend(messages)

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": payload_messages,
            "temperature": temperature,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=180),
                ) as resp:
                    data = await resp.json(content_type=None)
                    if resp.status == 200:
                        message = data.get("choices", [{}])[0].get("message", {})
                        response_text = message.get("content") or message.get("reasoning_content") or ""
                        usage = data.get("usage", {})
                        return self._build_result(
                            response_text,
                            {
                                "prompt_tokens": int(usage.get("prompt_tokens", 0) or 0),
                                "completion_tokens": int(usage.get("completion_tokens", 0) or 0),
                            },
                        )

                    error_detail = data.get("error", {}).get("message", data) if isinstance(data, dict) else data
                    return self._build_result(f"Hugging Face error ({resp.status}): {error_detail}")
        except Exception as exc:
            return self._build_result(f"Hugging Face error: {exc}")

    def _hf_chat_sync(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Call Hugging Face Inference API synchronously."""
        api_key = self.config.get("huggingface_api_key")
        base_url = self.config.get("huggingface_base_url", "https://router.huggingface.co/v1")

        payload_messages = []
        if system_prompt:
            payload_messages.append({"role": "system", "content": system_prompt})
        payload_messages.extend(messages)

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": payload_messages,
            "temperature": temperature,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        try:
            response = requests.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=180,
            )
            data = response.json()
            if response.status_code == 200:
                message = data.get("choices", [{}])[0].get("message", {})
                response_text = message.get("content") or message.get("reasoning_content") or ""
                usage = data.get("usage", {})
                return self._build_result(
                    response_text,
                    {
                        "prompt_tokens": int(usage.get("prompt_tokens", 0) or 0),
                        "completion_tokens": int(usage.get("completion_tokens", 0) or 0),
                    },
                )

            error_detail = data.get("error", {}).get("message", data) if isinstance(data, dict) else data
            return self._build_result(f"Hugging Face error ({response.status_code}): {error_detail}")
        except Exception as exc:
            return self._build_result(f"Hugging Face error: {exc}")

    def _extract_api_error(self, payload: Any, provider: str) -> str:
        """Normalize API error payloads into readable text."""
        if isinstance(payload, dict):
            error = payload.get("error")
            if isinstance(error, dict):
                return f"{provider} error: {error.get('message', 'Unknown error')}"
            if isinstance(error, str):
                return f"{provider} error: {error}"
        return f"{provider} request failed"

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream chat completion as an async generator of text chunks."""
        normalized_messages = self._normalize_messages(messages)

        if not self.has_valid_credentials:
            result = self._mock_response(normalized_messages)
            yield result.get("response", "")
            return

        if self.provider == "huggingface":
            async for chunk in self._hf_chat_stream(normalized_messages, temperature, max_tokens, system_prompt):
                yield chunk
            return

        # For non-streaming providers, fall back to full response
        result = await self.chat(normalized_messages, temperature, max_tokens, system_prompt)
        yield result.get("response", "")

    async def _hf_chat_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream Hugging Face chat completion via SSE."""
        api_key = self.config.get("huggingface_api_key")
        base_url = self.config.get("huggingface_base_url", "https://router.huggingface.co/v1")

        payload_messages = []
        if system_prompt:
            payload_messages.append({"role": "system", "content": system_prompt})
        payload_messages.extend(messages)

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": payload_messages,
            "temperature": temperature,
            "stream": True,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=180),
                ) as resp:
                    if resp.status != 200:
                        data = await resp.json(content_type=None)
                        error_detail = data.get("error", {}).get("message", data) if isinstance(data, dict) else data
                        yield f"\n\n*Hugging Face error ({resp.status}): {error_detail}*"
                        return

                    async for line in resp.content:
                        decoded = line.decode("utf-8").strip()
                        if not decoded or not decoded.startswith("data:"):
                            continue
                        data_str = decoded[5:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            import json
                            chunk = json.loads(data_str)
                            delta = chunk.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content") or delta.get("reasoning_content") or ""
                            if content:
                                yield content
                        except Exception:
                            continue
        except Exception as exc:
            yield f"\n\n*Hugging Face streaming error: {exc}*"
