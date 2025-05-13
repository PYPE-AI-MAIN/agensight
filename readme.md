# Agensight

**Open Source Exprerimentation Studio for Conversational AI Agents**
Pype AI's Agensigh is an open-source experimentation studio built specially for conversational AI agents or customer facing agents. It is similar to LangGraph but supports any agentic framework (including Autogen, LangGraph, and OpenAI Agents SDK) or modality (voicem image, text). With minimal code changes, Pype AI provides complete observability to help you trace agentic workflows for entire sessions or user conversations.

It features a plug & play playground for editing prompts and tools. It uses an MCP server that if used via cursor or whindsurf can explore your code and generate a playground synced to your code. You can do any edits to your prompts or tools in this playground. Changes made in the playground sync directly to your code, allowing you to effortlessly run, replay, and evaluate experiments.

It provides Conversational Replays that help you visit any session, replay the conversation with any multiple versions of the agents (created by editing the agents (model, prompt, rag, tools) and Evaluate to help you improve your customer interactions.

`Agensight` empowers you to quickly iterate, build evaluations, and improve agent conversations.

## gif


## Quick Start

Requires Python ≥3.10

```bash
# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install package
pip install agensight
agensight view 
```

Your dashboard will open at localhost:5001.



## Agent Observability Setup

<A line about traces and spans>
<A picture of the session view>

```python
from agensight import init, trace, span
import openai

init(name="my-llm-app")  # Optional project name

@trace("plan_generation")
def main():
    @span()
    def call_llm():
        return openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Tell me a joke"}]
        )
    response = call_llm()
    print(response.choices[0].message.content)

if __name__ == "__main__":
    main()
```


## Playground Setup

To set up the agent playground, we provide an MCP server that, when integrated with Cursor or Windsurf, visually maps your agent workflows. It explores your codebase using Cursor or Windsurf and generates an editable agent workflow configuration (JSON file). You can then visualize your agent workflows in the studio by simply running `agensight view` in your terminal.

```bash
# Clone the repository
git clone git@github.com:PYPE-AI-MAIN/agensight_mcp_server.git
cd agensight_mcp_server

# Create a virtual environment
python -m venv mcp-env
source mcp-env/bin/activate  # On Windows: mcp-env\Scripts\activate

# Install dependencies
pip install mcp-server
```

### MCP Server Configuration (for Claude/Cursor)

```json
{
  "mcpServers": {
    "sqlite-server": {
      "command": "/path/to/agensight_mcp_server/your-env/bin/python",
      "args": [
        "/path/to/agensight_mcp_server/server.py"
      ],
      "description": "tool to generate agensight config"
    }
  }
}
```

In your Cursor chatbot, enter:

```
Please analyze this codebase using the generateAgensightConfig MCP tool
```

## Configuration

### Trace Configuration

| Feature      | Default            | Customizable With  |
|--------------|--------------------|--------------------|
| Project name | `"default"`        | `init(name="...")` |
| Trace name   | Function name      | `@trace("...")`    |
| Span name    | Auto (`Agent 1`, etc.) | `@span(name="...")`|


### Playground Configuration

Agensight uses a configuration file (`agensight.config.json` by default) to define agents, their connections, and parameters.

#### Basic Structure

```json
{
  "agents": [
    {
      "name": "AnalysisAgent",
      "prompt": "You are an expert analysis agent...",
      "variables": ["input_data"],
      "modelParams": {
        "model": "gpt-4o",
        "temperature": 0.2
      }
    },
    {
      "name": "SummaryAgent",
      "prompt": "Summarize the following information...",
      "variables": ["analysis_result"],
      "modelParams": {
        "model": "gpt-3.5-turbo",
        "temperature": 0.7
      }
    }
  ],
  "connections": [
    {"from": "AnalysisAgent", "to": "SummaryAgent"}
  ]
}

```


## Features

- Auto-instrumented tracing for LLM calls
- Local development mode for offline trace inspection
- Customizable trace and span naming
- Token usage tracking
- Experimental prompt playground
- Maintain the prompt versions

## Security & Local Storage

- All data stored locally inside the SDK
- No data uploaded or tracked externally
- Prompts versions stored locally in `.agensight` file
- Recommended: Run in isolated virtual environments

## Contributing

Open source contributions are welcome. Open an issue or submit a PR via GitHub.

### Development Workflow

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install the package in development mode:
   ```bash
   pip install -e .
   ```

### Development Guidelines

- Follow PEP 8 for Python code
- Use snake_case for Python functions and variables
- Use PascalCase for component names in React/TypeScript
- Add type annotations to all Python functions
- Follow Conventional Commits for commit messages

## Roadmap

- JavaScript SDK
- Cloud viewer

## License

MIT License • © 2025 agensight contributors
