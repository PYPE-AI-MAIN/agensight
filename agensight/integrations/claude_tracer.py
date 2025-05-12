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

from anthropic import Anthropic
from opentelemetry import trace
import functools

_is_patched = False # Flag to prevent double patching.
tracer = trace.get_tracer("claude") # OTel tracer specific to Claude instrumentation.

def _wrap_messages_create(original_create):
    """Wraps the original Anthropic messages.create method to add tracing."""
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

            # Extract usage data from the response object.
            usage = getattr(response, "usage", {}) # Safely get usage, default to empty dict.
            span.set_attribute("llm.usage.total_tokens", usage.get("total_tokens")) # General LLM usage
            span.set_attribute("gen_ai.usage.prompt_tokens", usage.get("input_tokens")) # Map Anthropic input_tokens
            span.set_attribute("gen_ai.usage.completion_tokens", usage.get("output_tokens")) # Map Anthropic output_tokens

            # Extract the completion content from the response.
            if hasattr(response, "content") and response.content:
                # Assuming the first content block is the main assistant reply.
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
        # Replace the original method with the wrapped version.
        Anthropic.messages.create = _wrap_messages_create(Anthropic.messages.create)
        _is_patched = True
    except Exception as e:
        return
