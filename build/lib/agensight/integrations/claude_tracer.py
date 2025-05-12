# agentsight/instrumentation/claude.py

from anthropic import Anthropic
from opentelemetry import trace
import functools

_is_patched = False
tracer = trace.get_tracer("claude")

def _wrap_messages_create(original_create):
    @functools.wraps(original_create)
    def wrapper(self, *args, **kwargs):
        model = kwargs.get("model", "claude-3")
        messages = kwargs.get("messages", [])
        max_tokens = kwargs.get("max_tokens", None)

        with tracer.start_as_current_span("claude.chat") as span:
            span.set_attribute("gen_ai.system", "Anthropic")
            span.set_attribute("gen_ai.request.model", model)

            if messages:
                prompt = messages[0]
                span.set_attribute("gen_ai.prompt.0.role", prompt.get("role"))
                span.set_attribute("gen_ai.prompt.0.content", prompt.get("content"))

            response = original_create(self, *args, **kwargs)

            usage = getattr(response, "usage", {})
            span.set_attribute("llm.usage.total_tokens", usage.get("total_tokens"))
            span.set_attribute("gen_ai.usage.prompt_tokens", usage.get("input_tokens"))
            span.set_attribute("gen_ai.usage.completion_tokens", usage.get("output_tokens"))

            if hasattr(response, "content") and response.content:
                span.set_attribute("gen_ai.completion.0.role", "assistant")
                span.set_attribute("gen_ai.completion.0.content", response.content[0].text)

            return response

    return wrapper


def instrument_anthropic():
    global _is_patched
    if _is_patched:
        return
    try:
        Anthropic.messages.create = _wrap_messages_create(Anthropic.messages.create)
        _is_patched = True
    except Exception as e:
        return
