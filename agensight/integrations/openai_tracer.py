# agensight/integrations/openai_tracer.py
# This module handles instrumentation for the OpenAI client.
# It utilizes the official OpenAIInstrumentor from the OpenTelemetry Python contrib library.

from opentelemetry.instrumentation.openai import OpenAIInstrumentor

def instrument_openai():
    """
    Instruments the OpenAI client for tracing.
    Automatically adds span context to OpenAI API calls.
    """
    try:
        # Apply the standard OpenTelemetry instrumentation for OpenAI.
        OpenAIInstrumentor().instrument()
    except Exception as e:
        print(f"[Tracing SDK] OpenAI instrumentation failed: {e}")
