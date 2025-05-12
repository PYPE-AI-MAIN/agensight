# Agensight

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python Version](https://img.shields.io/badge/python-3.7%2B-blue.svg)](https://www.python.org/downloads/)

**Observability SDK for LLM workflows — trace, debug, and optimize your agent interactions.**

## 🚀 Get Started

Install Agensight in your agent project:

```bash
pip install agensight
```

## 🧩 Quick Integration

```python
# In your agent file
from agensight.tracing import setup_tracing, get_tracer
from agensight.integrations import instrument_openai

# Setup tracing
setup_tracing("my-agent-project")
instrument_openai()  # Auto-instrument OpenAI calls

# Your existing agent code...
```

## 🔍 View Your Traces

Once your agent is running, view the traces:

```bash
agensight view
```

This opens a web interface where you can:
- Visualize agent interactions as a graph
- Inspect prompts and responses
- Debug token usage
- Compare different runs

## 🧠 Agent Graph Visualization

Fetch prompts and create agent graphs using our MCP server:

```bash
# Install the MCP server from 
https://github.com/PYPE-AI-MAIN/agensight_mcp_server
```

## 📚 Documentation

For detailed documentation, please see the [docs folder](./docs):

- [SDK Reference](./docs/sdk-reference.md)
- [Agent Configuration](./docs/agent-configuration.md)
- [Tracing Architecture](./docs/tracing-architecture.md)
- [Examples](./examples/)

## 🤝 Support

For questions, issues or feature requests, please [create an issue](https://github.com/PYPE-AI-MAIN/agensight/issues).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.