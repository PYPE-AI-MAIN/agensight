from openai import OpenAI
import os
from agensight.tracing import setup_tracing, get_tracer, start_span, enable_session_tracking, set_session_id
from agensight.integrations import instrument_openai

# Setup
setup_tracing("chatbot-demo",exporter_type="db")
# enable_session_tracking()
# set_session_id("user-session-xyz")
instrument_openai()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
# tracer = get_tracer("chatbot")


def call_openai(message):
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "user", "content": message}
        ],
        temperature=0.7
    )
    print("Usage:", response.usage)
    return response.choices[0].message.content

if __name__ == "__main__":
    print("Response:", call_openai("What's the weather in Bangalore today?"))
