"""
Manages session tracking for Agensight.

This module provides functionalities to enable, disable, and manage session IDs
using context variables. Session IDs help in correlating traces and spans
belonging to the same user session or logical operation.
"""
import uuid
import contextvars
from .config import config

# Context variable to store the session ID, defaulting to a new UUID.
_session_id_var = contextvars.ContextVar("session_id", default=str(uuid.uuid4()))
_session_enabled = False # Global flag to indicate if session tracking is explicitly enabled.

def enable_session_tracking():
    """Enables session tracking globally."""
    global _session_enabled
    _session_enabled = True

def is_session_enabled() -> bool:
    """Checks if session tracking is enabled either globally or via config."""
    return _session_enabled or config.get("session_tracking", False)

def get_session_id() -> str:
    """Retrieves the current session ID from the context variable."""
    return _session_id_var.get()

def set_session_id(session_id: str):
    """Sets the session ID in the context variable."""
    _session_id_var.set(session_id)
