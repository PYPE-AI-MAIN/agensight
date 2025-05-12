# Agensight SDK Reference

This document provides a comprehensive reference for the Agensight SDK, detailing all the available modules, classes, and functions.

## Core Modules

### `agensight.tracing`

Core functionality for tracing agent interactions and LLM calls.

#### `setup_tracing(name, **options)`

Initializes the tracing infrastructure.

```python
from agensight.tracing import setup_tracing

setup_tracing("my-agent", db_path="./traces.db", sync=True)
```

**Parameters:**
- `name` (str): The name of your project/agent
- `db_path` (str, optional): Path to the SQLite database for storing traces
- `sync` (bool, optional): Whether to use synchronous tracing (default: True)

#### `get_tracer(name)`

Gets a tracer for the specified component.

```python
from agensight.tracing import get_tracer

tracer = get_tracer("my-component")
```

#### `start_span(name, **attributes)`

Creates a new span for tracing operations.

```python
from agensight.tracing import start_span

with start_span("llm-call", model="gpt-4") as span:
    # Operations within this span
    span.set_attribute("tokens", 150)
```

#### `enable_session_tracking()`

Enables tracking of user sessions across multiple traces.

#### `set_session_id(session_id)`

Sets the current session ID for grouping related traces.

### `agensight.integrations`

Integration modules for various LLM providers.

#### `instrument_openai()`

Auto-instruments all OpenAI API calls for tracing.

```python
from agensight.integrations import instrument_openai

instrument_openai()
# Now all OpenAI calls will be automatically traced
```

#### `instrument_anthropic()`

Auto-instruments all Anthropic API calls.

#### `instrument_llama_index()`

Auto-instruments LlamaIndex operations.

### `agensight.mcp`

Integration with the MCP server for advanced visualization.

#### `connect_mcp(url="http://localhost:8000")`

Connects to the MCP server for agent graph visualization.

```python
from agensight.mcp import connect_mcp

connect_mcp()
```

## CLI Commands

### `agensight view`

Opens the web interface for viewing traces.

```bash
agensight view [--port PORT]
```

### `agensight list`

Lists all recorded traces.

```bash
agensight list [--limit LIMIT]
```

### `agensight export`

Exports traces to a file.

```bash
agensight export [--format {json,csv}] [--output FILE]
```

## Advanced Configuration

### Configuration File

Agensight can be configured using a `agensight.config.json` file in the root of your project:

```json
{
  "db_path": "./data/traces.db",
  "auto_instrument": true,
  "mcp_server": "http://localhost:8000",
  "logging_level": "INFO"
}
```

## Error Handling

```python
from agensight.errors import TracingError

try:
    # Agensight operations
except TracingError as e:
    print(f"Tracing error: {e}") 