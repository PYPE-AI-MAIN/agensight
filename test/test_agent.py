import openai
from agensight.agent import Agent


client = openai.OpenAI()  # Make sure to set your API key in env or pass it here
tell = "Deepesh"
agent = Agent("my_agent")

prompt = "Tell me a joke. {tell}"
wrapped = agent.wrapper(prompt)

response = openai.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": prompt.format(tell=tell)}]
)
output = response.choices[0].message.content


agent.log_interaction(prompt.format(tell=tell), output) 