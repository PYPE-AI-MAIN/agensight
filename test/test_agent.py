import openai
from agensight.agent import Agent


client = openai.OpenAI()  # Make sure to set your API key in env or pass it here
tell = "Deepesh"
agent = Agent("my_agent")


prompt_template = "Tell me {tell} and say {say}"
values = {"tell": "hello", "say": "world"}

result = agent.wrapper(prompt_template, values)

response = openai.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": result}]
)
output = response.choices[0].message.content

agent.log_interaction(result, output) 