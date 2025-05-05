# Agensight

Agensight is a Python SDK and CLI tool that helps you log, track, and visualize your OpenAI agent interactions.  
It is designed for developers building LLM-powered applications who want to keep a record of prompts, completions, and agent behavior for debugging, analytics, or demonstration.

## Features

- **Easy Logging:** Log every prompt and response from your agent with a single line of code.
- **Web Dashboard:** Instantly view and explore your agent’s history in your browser.
- **CLI Tool:** Launch the dashboard and manage your logs from the command line.
- **Seamless Integration:** Works with OpenAI’s API and your own agent logic.

## Example Usage

```python
import openai
from agensight.agent import Agent

client = openai.OpenAI()  # Set your API key in env or pass it here

agent = Agent("new_agent")

prompt_template = "Tell me {tell} and say {say}"
values = {"tell": "hello", "say": "world"}

result = agent.wrapper(prompt_template, values)

response = openai.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": result}]
)

output = response.choices[0].message.content

agent.log_interaction(result, output)
```

## Getting Started

1. **Install:**
   ```bash
   pip install agensight
   ```

2. **Log interactions in your code** (see example above).

3. **View your project:**
   ```bash
   agensight view
   ```
   This will open a web dashboard to explore your agent’s activity.

## License

MIT