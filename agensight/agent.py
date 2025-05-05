# fault/agent.py

import os
import json
from string import Formatter

class Agent:
    def __init__(self, name: str):
        self.name = name
        self.log_dir = os.path.join(os.getcwd(), "log", self.name)
        os.makedirs(self.log_dir, exist_ok=True)
        self.log_file = os.path.join(self.log_dir, "agent.log")
        self.prompt_file = os.path.join(self.log_dir, "prompt.json")

    def wrapper(self, prompt_template: str) -> str:
        formatter = Formatter()
        variables = [
            field_name 
            for _, field_name, _, _ in formatter.parse(prompt_template) 
            if field_name
        ]
        with open(self.prompt_file, "w") as f:
            json.dump({"agent": self.name, "prompt": prompt_template, "variables": variables}, f, indent=2)
        return prompt_template

    def log_interaction(self, prompt: str, output: str):
        entry = {"prompt": prompt, "output": output}
        with open(self.log_file, "a") as f:
            f.write(json.dumps(entry) + "\n")