import functools
import json
from typing import Callable, Optional, Dict, Any, List

from opentelemetry import trace as ot_trace
from opentelemetry.trace.status import Status, StatusCode

from agensight.tracing import get_tracer
from agensight.tracing.session import is_session_enabled, get_session_id

def trace(name: Optional[str] = None, **default_attributes):
    """Basic OpenTelemetry span decorator for general tracing."""
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            tracer_name = name or func.__module__ # Default to function's module name.
            tracer_instance = get_tracer(tracer_name)

            attributes = default_attributes.copy()
            if is_session_enabled(): # Add session ID if enabled.
                attributes.setdefault("session.id", get_session_id())

            with tracer_instance.start_as_current_span(
                tracer_name, attributes=attributes
            ):
                return func(*args, **kwargs)

        return wrapper
    return decorator


def _extract_usage_from_result(result: Any) -> Optional[Dict[str, int]]:
    """Extracts LLM token usage (total, prompt, completion) from various result structures."""
    if result is None:
        return None

    # Check dict for 'usage' key.
    if isinstance(result, dict):
        usage = result.get("usage")
        if isinstance(usage, dict):
            return usage

    # Check object for 'usage' attribute (common in SDKs).
    usage = getattr(result, "usage", None)
    if usage is not None:
        if hasattr(usage, "to_dict"): # Handles objects with a to_dict method.
            return usage.to_dict()
        if isinstance(usage, dict):
            return usage
        # Fallback for direct token attributes on usage object.
        return {
            "total_tokens": getattr(usage, "total_tokens", None),
            "prompt_tokens": getattr(usage, "prompt_tokens", None),
            "completion_tokens": getattr(usage, "completion_tokens", None),
        }
    return None


def normalize_input_output(
    explicit_input: Optional[Any],
    explicit_output: Optional[Any],
    fallback_input: Optional[Any],
    fallback_output: Optional[Any],
    extra_attributes: Optional[Dict[str, Any]] = None,
) -> Dict[str, List[Dict[str, Any]]]:
    """Normalizes LLM inputs/outputs into a structured {prompts: [], completions: []} format."""
    result = {"prompts": [], "completions": []}
    extra = extra_attributes or {}

    def _safe_stringify(value):
        """Safely stringifies a value, using JSON for dicts/lists."""
        try:
            return json.dumps(value) if isinstance(value, (dict, list)) else str(value)
        except Exception:
            return str(value)

    # Prioritize explicit, then fallback for input.
    if explicit_input is not None:
        result["prompts"].append({"role": "user", "content": _safe_stringify(explicit_input)})
    elif fallback_input:
        result["prompts"].append({"role": "user", "content": _safe_stringify(fallback_input)})

    # Prioritize explicit, then fallback for output. Include token usage if available.
    if explicit_output is not None or fallback_output is not None:
        content = explicit_output or fallback_output
        completion = {
            "role": "assistant",
            "content": _safe_stringify(content),
            "finish_reason": extra.get("gen_ai.completion.0.finish_reason"),
            "completion_tokens": extra.get("gen_ai.usage.completion_tokens"),
            "prompt_tokens": extra.get("gen_ai.usage.prompt_tokens"),
            "total_tokens": extra.get("llm.usage.total_tokens"),
        }
        result["completions"].append(completion)

    return result


def span(
    name: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    input: Optional[Any] = None, # Explicit LLM input
    output: Optional[Any] = None, # Explicit LLM output
):
    """Decorator for LLM interactions, creating a span with I/O, metadata, and token usage."""
    tracer = ot_trace.get_tracer("default")

    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            span_name = name or func.__name__
            attributes = metadata.copy() if metadata else {}
            if is_session_enabled():
                attributes["session.id"] = get_session_id()

            with tracer.start_as_current_span(span_name, attributes=attributes) as span_obj:
                fallback_input = args or kwargs # Infer input if not explicit.
                result = None

                try:
                    result = func(*args, **kwargs)
                except Exception as e:
                    # On error, record input and error status.
                    io_data = normalize_input_output(
                        input, output, fallback_input, None, # No output on error.
                        extra_attributes=span_obj.attributes,
                    )
                    span_obj.set_attribute("gen_ai.normalized_input_output", json.dumps(io_data))
                    span_obj.set_status(Status(StatusCode.ERROR, str(e)))
                    raise

                # Extract token usage if available from the result.
                usage = _extract_usage_from_result(result)
                total = usage.get("total_tokens") if usage else None
                prompt = usage.get("prompt_tokens") if usage else None
                completion = usage.get("completion_tokens") if usage else None

                # Fill missing total from prompt + completion
                if total is None and prompt is not None and completion is not None:
                    total = prompt + completion

                # Safe set (OpenTelemetry rejects None)
                if total is not None:
                    span_obj.set_attribute("llm.usage.total_tokens", int(total))
                if prompt is not None:
                    span_obj.set_attribute("gen_ai.usage.prompt_tokens", int(prompt))
                if completion is not None:
                    span_obj.set_attribute("gen_ai.usage.completion_tokens", int(completion))

                # ── final I/O blob ─
                io_data = normalize_input_output(
                    input, output, fallback_input, result,
                    extra_attributes=span_obj.attributes,
                )
                span_obj.set_attribute("gen_ai.normalized_input_output", json.dumps(io_data))

                return result

        return wrapper
    return decorator