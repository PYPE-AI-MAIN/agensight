# agensight/main.py

# This module defines the `Agent` class, a core component of Agensight
# responsible for managing agent-specific configurations and interactions.

# Key functionalities include:
# - Initializing an agent with a unique name and setting up dedicated
#   directories for logging (`log/<agent_name>/agent.log`) and storing
#   prompt templates (`log/<agent_name>/prompt.json`).
#
# - The `wrapper` method handles the formatting of prompt templates. It manages
#   a set of stored prompt templates for the agent, allowing one to be marked
#   as "current". It uses the current template by default or sets a new one if
#   provided. It then formats the template using provided values.
#
# - The `log_interaction` method appends prompt-output pairs with timestamps
#   to the agent's log file.
#
# - The `get_prompts` method retrieves all stored prompt templates for the agent.

import os
import json
from string import Formatter
import datetime

class Agent:
    """Manages agent-specific prompt configurations and interaction logging."""
    def __init__(self, name: str):
        """Initializes agent, sets up log/prompt directories."""
        self.name = name
        self.log_dir = os.path.join(os.getcwd(), "log", self.name)
        os.makedirs(self.log_dir, exist_ok=True)
        self.log_file = os.path.join(self.log_dir, "agent.log")
        self.prompt_file = os.path.join(self.log_dir, "prompt.json")

    def wrapper(self, prompt_template: str = None, values: dict = None) -> str:
        """Formats a prompt template with given values, managing current prompt state."""
        if os.path.exists(self.prompt_file):
            with open(self.prompt_file) as f:
                data = json.load(f)
        else:
            data = {"agent": self.name, "prompts": []}
        prompts = data.get("prompts", [])

        current_prompt_obj = next((p for p in prompts if p.get("current")), None)

        if not current_prompt_obj:
            if prompt_template is not None:
                formatter = Formatter()
                variables = [
                    field_name
                    for _, field_name, _, _ in formatter.parse(prompt_template)
                    if field_name
                ]
                # Ensure no other prompt is marked as current.
                for p in prompts:
                    p["current"] = False
                current_prompt_obj = {
                    "prompt": prompt_template,
                    "variables": variables,
                    "current": True
                }
                prompts.append(current_prompt_obj)
                data["prompts"] = prompts
                with open(self.prompt_file, "w") as f:
                    json.dump(data, f, indent=2)
            else:
                raise ValueError("No current prompt found. Please provide a prompt_template.")

        prompt_template = current_prompt_obj["prompt"]
        variables = current_prompt_obj["variables"]

        if values is None:
            values = {}
        try:
            replaced_prompt = prompt_template.format(**values)
        except KeyError as e:
            missing = e.args[0]
            raise ValueError(f"Missing value for variable: {missing}")
        return replaced_prompt

    def log_interaction(self, prompt: str, output: str):
        """Logs a prompt-output interaction with a UTC timestamp."""
        entry = {"prompt": prompt, "output": output,
                 "timestamp": datetime.datetime.utcnow().isoformat() + "Z" }
        with open(self.log_file, "a") as f:
            f.write(json.dumps(entry) + "\n")

    def get_prompts(self):
        """Retrieves all stored prompt configurations for the agent."""
        if os.path.exists(self.prompt_file):
            with open(self.prompt_file) as f:
                data = json.load(f)
            return data.get("prompts", [])