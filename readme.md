# agensight

**Observability SDK for LLM workflows — trace, debug, and optimize your prompts.**

`agensight` provides monitoring and debugging tools for large language model (LLM) interactions during development. It captures structured traces, supports local inspection, and offers a plug-and-play experience with minimal configuration.

- Python SDK (JavaScript coming soon)
- Traces every LLM call with context
- Built-in local prompt playground
- Developer-first observability for OpenAI & other LLM providers

## Installation

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



## Traces Setup

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

```bash
# Clone the repository
git clone git@github.com:PYPE-AI-MAIN/agensight_mcpserver.git
cd agensight_mcp_server

# Create a virtual environment
python -m venv mcp-env
source mcp-env/bin/activate  # On Windows: mcp-env\Scripts\activate

# Install dependencies
pip install -r requirements.txt
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