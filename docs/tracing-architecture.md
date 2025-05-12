# Tracing Architecture

This document explains how Agensight's tracing system works and how to use it effectively.

## Overview

Agensight uses OpenTelemetry-based tracing to capture detailed information about agent interactions and LLM calls. This provides deep visibility into your AI systems without requiring significant changes to your code.

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│   Agent A  │────▶│   Agent B  │────▶│   Agent C  │
└────────────┘     └────────────┘     └────────────┘
       │                 │                  │
       ▼                 ▼                  ▼
┌─────────────────────────────────────────────────┐
│                  Trace Store                     │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│              Agensight Dashboard                 │
└─────────────────────────────────────────────────┘
```

## Concepts

### Traces

A trace represents a complete workflow or transaction that may involve multiple agents and LLM calls. Each trace has a unique identifier and contains one or more spans.

### Spans

A span represents a single operation within a trace, such as an LLM API call or an agent processing step. Spans capture:

- Start and end timestamps
- Operation name
- Parent span (if any)
- Attributes (key-value pairs)
- Events
- Status

### Attributes

Attributes are key-value pairs that provide context for a span. For LLM calls, typical attributes include:

- Model name
- Prompt text
- Response text
- Token counts
- Latency

## Instrumentation

### Auto-Instrumentation

Agensight provides automatic instrumentation for popular LLM libraries:

```python
from agensight.integrations import instrument_openai

# Enable auto-instrumentation
instrument_openai()

# Now all OpenAI calls will be traced automatically
```

Supported libraries:
- OpenAI
- Anthropic
- LangChain
- LlamaIndex

### Manual Instrumentation

For custom components, you can create spans manually:

```python
from agensight.tracing import start_span

def process_data(data):
    with start_span("data-processing", input_size=len(data)) as span:
        # Process data...
        result = transform_data(data)
        span.set_attribute("output_size", len(result))
        return result
```

## Storage

Traces are stored in a SQLite database by default. The location can be configured:

```python
from agensight.tracing import setup_tracing

setup_tracing("my-app", db_path="./my-traces.db")
```

## Visualization

Agensight provides a web dashboard for visualizing traces:

```bash
agensight view
```

The dashboard allows you to:
- Browse all traces
- View detailed span information
- See agent interaction graphs
- Analyze token usage and latency
- Compare different runs

## MCP Integration

For advanced visualization, Agensight integrates with the MCP (Multi-Component Protocol) server:

```python
from agensight.mcp import connect_mcp

connect_mcp()
```

This enables real-time visualization of agent interactions and data flows.

## Sessions

To group related traces (e.g., for a single user session), use session tracking:

```python
from agensight.tracing import enable_session_tracking, set_session_id

# Enable session tracking
enable_session_tracking()

# Set the current session ID
set_session_id("user-123")

# All traces created in this context will be associated with "user-123"
```

## Performance Considerations

- Tracing adds minimal overhead to normal operations
- SQLite database scales well for development and small production loads
- For high-volume production use, consider using an external OpenTelemetry collector

## Security and Privacy

- By default, all data is stored locally
- Sensitive data in prompts or responses can be redacted:

```python
from agensight.security import configure_redaction

configure_redaction(patterns=["credit_card", "email"])
```

## Troubleshooting

Common issues and solutions:

- **Missing traces**: Ensure `setup_tracing()` is called before any agent activity
- **Incomplete spans**: Check for proper context propagation
- **High disk usage**: Configure trace retention policy
- **Slow dashboard**: Optimize queries with time range filters 