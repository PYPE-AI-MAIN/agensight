from opentelemetry import trace
from opentelemetry.trace import Tracer
from .session import is_session_enabled, get_session_id

def get_tracer(name: str) -> Tracer:
    """Gets a named tracer instance from the global trace provider."""
    return trace.get_tracer(name)

def start_span(tracer: Tracer, name: str, attributes: dict = None):
    """
    Starts a new span as the current span, automatically adding session.id if enabled.

    Args:
        tracer: The Tracer instance to use.
        name: The name for the new span.
        attributes: Optional dictionary of initial attributes for the span.

    Returns:
        The context manager for the newly created span.
    """
    attributes = attributes or {}
    if is_session_enabled():
        attributes.setdefault("session.id", get_session_id())
    return tracer.start_as_current_span(name, attributes=attributes)
