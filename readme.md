# agensight

**agensight** is an open-source Python SDK and CLI for prompt management, agent-based logging, and UI visualization of prompt/response interactions.  
It is designed for developers building LLM-powered applications who want to track, organize, and explore their prompt engineering workflow.

---

## Features

- **Agent-based prompt management**: Organize prompts and logs by agent.
- **Prompt wrapping**: Standardize and track prompt templates.
- **Logging**: Store prompt/response pairs for each agent.
- **Web UI**: Visualize agents, prompts, and logs in your browser.
- **CLI**: Launch the UI and manage your workflow from the terminal.

---

## Installation

```bash
git clone https://github.com/yourusername/agensight.git
cd agensight
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## Usage

### 1. **SDK Example**

```python
from agensight.agent import Agent

agent = Agent("my_agent")
prompt = "Tell me a joke. {tell}"
wrapped = agent.wrap_prompt(prompt)

# ...send wrapped prompt to OpenAI or another LLM...

output = "Why did the chicken cross the road? To get to the other side!"
agent.log_interaction(prompt.format(tell="john"), output)
```

### 2. **Start the Web UI**

From your project root:
```bash
python -m cli.main view
```
Then open [http://localhost:5000](http://localhost:5000) in your browser.

---


## Development & Testing

- Run tests from the project root:
  ```bash
  python -m test.test_agent
  ```
- Or with pytest:
  ```bash
  pytest
  ```

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License

[MIT](LICENSE)
