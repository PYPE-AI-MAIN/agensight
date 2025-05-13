# agensight/main.py

import os
import json
from string import Formatter
import datetime

class Agent:
    def __init__(self, name: str):
        self.name= name
        self.log_dir = os.path.join(os.getcwd(), "log", self.name)
        os.makedirs(self.log_dir, exist_ok=True)
        self.log_file = os.path.join(self.log_dir, "agent.log")
        self.prompt_file = os.path.join(self.log_dir, "prompt.json")

    def wrapper(self, prompt_template: str = None, values: dict = None) -> str:
        if os.path.exists(self.prompt_file):
            with open(self.prompt_file) as f:
                data = json.load(f)
        else:
            data = {"agent": self.name, "prompts": []}
        prompts = data.get("prompts", [])

        # Find the current prompt
        current_prompt_obj = next((p for p in prompts if p.get("current")), None)

        # If no current prompt, use prompt_template (if provided) and add as current
        if not current_prompt_obj:
            if prompt_template is not None:
                formatter = Formatter()
                variables = [
                    field_name
                    for _, field_name, _, _ in formatter.parse(prompt_template)
                    if field_name
                ]
                # Set all existing prompts to current=False
                for p in prompts:
                    p["current"] = False
                # Add new prompt as current
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
        entry = {"prompt": prompt, "output": output,
                 "timestamp": datetime.datetime.utcnow().isoformat() + "Z" }
        with open(self.log_file, "a") as f:
            f.write(json.dumps(entry) + "\n")

    def get_prompts(self):
        if os.path.exists(self.prompt_file):
            with open(self.prompt_file) as f:
                data = json.load(f)
        return data.get("prompts", [])