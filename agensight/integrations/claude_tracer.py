# agensight/integrations/claude_tracer.py

# This module provides automatic tracing for the Anthropic Python client (anthropic).
# It works by modifying the `Anthropic.messages.create` method *after* the library
# has been loaded. Specifically, it replaces the original method with a custom
# "wrapper" function.
# 
# This wrapper function does the following:
# 1. Starts an OpenTelemetry span before the actual API call.
# 2. Records details like the model, prompt, and usage info as span attributes.
# 3. Calls the original `Anthropic.messages.create` method to get the response.
# 4. Records completion details from the response.
# 5. Ends the span and returns the response.
# 
# This allows Agensight to capture details about Claude API calls without needing
# to change the Anthropic library's code directly or requiring manual tracing
# every time you call the Anthropic client.

from anthropic._types import NOT_GIVEN
from anthropic import Anthropic
from anthropic.resources.messages import Messages
from opentelemetry import trace
import functools

_is_patched = False # Flag to prevent double patching.
tracer = trace.get_tracer("claude") # OTel tracer specific to Claude instrumentation.

def _wrap_create(original_create):
    @functools.wraps(original_create)
    def wrapper(self, *args, **kwargs):
        """The wrapper function that executes around the original method."""
        # Extract basic request parameters.
        model = kwargs.get("model", "claude-3") # Default model if not specified.
        messages = kwargs.get("messages", [])
        max_tokens = kwargs.get("max_tokens", None)

        # Start a new span for the Claude chat operation.
        with tracer.start_as_current_span("claude.chat") as span:
            # Set common GenAI attributes.
            span.set_attribute("gen_ai.system", "Anthropic")
            span.set_attribute("gen_ai.request.model", model)

            # Capture the first prompt message (assuming it's the main user input).
            if messages:
                prompt = messages[0]
                span.set_attribute("gen_ai.prompt.0.role", prompt.get("role"))
                span.set_attribute("gen_ai.prompt.0.content", prompt.get("content"))

            # Call the original Anthropic messages.create method.
            response = original_create(self, *args, **kwargs)

            usage = getattr(response, "usage", None)
            if usage:
                total_tokens = getattr(usage, "total_tokens", None)
                prompt_tokens = getattr(usage, "input_tokens", None)
                completion_tokens = getattr(usage, "output_tokens", None)

                if total_tokens is not None:
                    span.set_attribute("llm.usage.total_tokens", total_tokens)
                if prompt_tokens is not None:
                    span.set_attribute("gen_ai.usage.prompt_tokens", prompt_tokens)
                if completion_tokens is not None:
                    span.set_attribute("gen_ai.usage.completion_tokens", completion_tokens)



            # Claude 3 structure: response.content = [ContentBlock]
            if hasattr(response, "content") and isinstance(response.content, list) and response.content:
                span.set_attribute("gen_ai.completion.0.role", "assistant")
                span.set_attribute("gen_ai.completion.0.content", response.content[0].text)

            # Return the original response object.
            return response

    return wrapper


def instrument_anthropic():
    """Applies the modification to Anthropic.messages.create if not already done."""
    global _is_patched
    if _is_patched:
        return
    try:
        Messages.create = _wrap_create(Messages.create)
        _is_patched = True
    except Exception:
        pass