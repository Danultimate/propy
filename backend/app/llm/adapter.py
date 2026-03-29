"""
Model-agnostic LLM adapter.
Switch providers by setting LLM_PROVIDER=claude|openai|gemini in .env
"""
from abc import ABC, abstractmethod
from app.config import settings


class LLMAdapter(ABC):
    @abstractmethod
    def complete(self, prompt: str) -> str:
        pass


class ClaudeAdapter(LLMAdapter):
    def complete(self, prompt: str) -> str:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text


class OpenAIAdapter(LLMAdapter):
    def complete(self, prompt: str) -> str:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4096,
        )
        return response.choices[0].message.content


class GeminiAdapter(LLMAdapter):
    def complete(self, prompt: str) -> str:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-3.1-flash-lite-preview")
        response = model.generate_content(prompt)
        return response.text


def get_llm_adapter() -> LLMAdapter:
    provider = settings.llm_provider.lower()
    if provider == "claude":
        return ClaudeAdapter()
    if provider == "openai":
        return OpenAIAdapter()
    if provider == "gemini":
        return GeminiAdapter()
    raise ValueError(f"Unsupported LLM provider: {provider}. Use 'claude', 'openai', or 'gemini'.")
