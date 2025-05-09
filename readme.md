# Agensight

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python Version](https://img.shields.io/badge/python-3.7%2B-blue.svg)](https://www.python.org/downloads/)

Agensight is a powerful SDK for visualizing, managing, and debugging AI agents. It provides intuitive tools to monitor agent interactions, manage configurations, and improve the development workflow for AI systems.

## Features

- **Agent Visualization**: Interactive graph-based visualization of agent interactions and data flow
- **Configuration Management**: Version control for agent configurations
- **Prompt Engineering**: Edit and optimize prompts with a built-in editor
- **Web Dashboard**: Intuitive UI for monitoring and managing your agents
- **Command Line Interface**: Quickly access your agents from the terminal

## Installation

```bash
pip install agensight
```

## Quick Start

### Initialize Agensight

```python
from agensight import Agent

# Create an agent
agent = Agent("AnalysisAgent")

# Set a prompt template with variables
prompt_template = """
Analyze the following {data_type} data: {data}
"""

# Use the agent with variable substitution
prompt = agent.wrapper(
    prompt_template=prompt_template,
    values={
        "data_type": "medical",
        "data": "patient temperature: 98.6F, heart rate: 72bpm"
    }
)

# Log interactions for later analysis
output = "Analysis: Normal vital signs"
agent.log_interaction(prompt, output)
```

### Launch the Dashboard

   ```bash
# Open the web dashboard
agensight view
```

## Configuration

Agensight uses a configuration file to manage agents, connections, and settings:

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
    }
  ],
  "connections": [
    {"from": "AnalysisAgent", "to": "OutputAgent"}
  ]
}
```

## Documentation

For detailed documentation, please visit our [docs](./docs):

- [API Reference](./docs/api-reference.md)
- [Advanced Configuration](./docs/advanced-configuration.md)
- [Examples](./examples/)

## Contributing

Contributions are welcome! Please read our [contributing guidelines](./CONTRIBUTING.md) to get started.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Support

For questions, issues or feature requests, please [create an issue](https://github.com/yourusername/agensight/issues).