from opentelemetry.instrumentation.openai import OpenAIInstrumentor

def instrument_openai():
    """
    Instruments the OpenAI client for tracing.
    Automatically adds span context to OpenAI API calls.
    """
    try:
        OpenAIInstrumentor().instrument()
    except Exception as e:
        print(f"[Tracing SDK] OpenAI instrumentation failed: {e}")
