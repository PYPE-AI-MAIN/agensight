import functools
import json
from typing import Callable, Optional, Dict, Any, List

from opentelemetry import trace as ot_trace
from opentelemetry.trace.status import Status, StatusCode

from agensight.tracing import get_tracer
from agensight.tracing.session import is_session_enabled, get_session_id

def trace(name: Optional[str] = None, **default_attributes):
    """
    Lightweight span wrapper for quick instrumentation.
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            tracer_name = name or func.__module__
            tracer_instance = get_tracer(tracer_name)

            attributes = default_attributes.copy()
            if is_session_enabled():
                attributes.setdefault("session.id", get_session_id())

            with tracer_instance.start_as_current_span(
                tracer_name, attributes=attributes
            ):
                return func(*args, **kwargs)

        return wrapper
    return decorator


def _extract_usage_from_result(result: Any) -> Optional[Dict[str, int]]:
    """
    Return {total_tokens, prompt_tokens, completion_tokens} or None.
    """
    if result is None:
        return None

    if isinstance(result, dict):
        usage = result.get("usage")
        if isinstance(usage, dict):
            return usage

    usage = getattr(result, "usage", None)
    if usage is not None:
        if hasattr(usage, "to_dict"):
            return usage.to_dict()
        if isinstance(usage, dict):
            return usage
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
    result = {"prompts": [], "completions": []}
    extra = extra_attributes or {}

    def _safe_stringify(value):
        try:
            return json.dumps(value) if isinstance(value, (dict, list)) else str(value)
        except Exception:
            return str(value)

    if explicit_input is not None:
        result["prompts"].append({"role": "user", "content": _safe_stringify(explicit_input)})
    elif fallback_input:
        result["prompts"].append({"role": "user", "content": _safe_stringify(fallback_input)})

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
    input: Optional[Any] = None,
    output: Optional[Any] = None,
):
    tracer = ot_trace.get_tracer("default")

    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            span_name = name or func.__name__
            attributes = metadata.copy() if metadata else {}
            if is_session_enabled():
                attributes["session.id"] = get_session_id()

            with tracer.start_as_current_span(span_name, attributes=attributes) as span_obj:
                fallback_input = args or kwargs
                result = None

                try:
                    result = func(*args, **kwargs)
                except Exception as e:
                    io_data = normalize_input_output(
                        input, output, fallback_input, None,
                        extra_attributes=span_obj.attributes,
                    )
                    span_obj.set_attribute("gen_ai.normalized_input_output", json.dumps(io_data))
                    span_obj.set_status(Status(StatusCode.ERROR, str(e)))
                    raise

                usage = _extract_usage_from_result(result)
                if usage:
                    span_obj.set_attribute("llm.usage.total_tokens", usage.get("total_tokens"))
                    span_obj.set_attribute("gen_ai.usage.prompt_tokens", usage.get("prompt_tokens"))
                    span_obj.set_attribute("gen_ai.usage.completion_tokens", usage.get("completion_tokens"))

                io_data = normalize_input_output(
                    input, output, fallback_input, result,
                    extra_attributes=span_obj.attributes,
                )
                span_obj.set_attribute("gen_ai.normalized_input_output", json.dumps(io_data))

                return result

        return wrapper
    return decorator
