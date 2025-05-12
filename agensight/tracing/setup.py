"""
Initializes and configures the OpenTelemetry tracing system for Agensight.

This module is responsible for setting up the tracer provider, 
span processors (including a custom token propagator), and the chosen exporter 
(e.g., console, database). It also handles database schema initialization 
if the database exporter is selected.
"""
import os
from agensight.tracing.exporters import get_exporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry import trace
from agensight.tracing.token_propagator import TokenPropagator # Custom processor for token data.

def setup_tracing(service_name="default", exporter_type=None):
    """
    Configures and initializes the OpenTelemetry tracer.

    Args:
        service_name (str): The name of the service being traced.
        exporter_type (str, optional): The type of exporter to use ('console', 'db', etc.). 
    Returns:
        opentelemetry.trace.Tracer: The configured tracer instance.
    """
    # Determine exporter type, falling back to environment variable or console.
    if exporter_type is None:
        exporter_type = os.getenv("TRACE_EXPORTER", "console")
    # Initialize DB schema if using the database exporter.
    # Conditional import to avoid circular dependency if db itself uses tracing.
    from agensight.tracing.db import init_schema 
    if exporter_type == "db":
        init_schema()
    else:
        # Informative message if DB is not the chosen exporter.
        print(f"Database schema not initialized (exporter: {exporter_type}).")

    exporter = get_exporter(exporter_type) # Fetch the chosen exporter instance.
    processor = BatchSpanProcessor(exporter) # Use batch processing for efficiency.
    provider = TracerProvider() # Create the tracer provider.
    # Add custom span processor for token propagation.
    provider.add_span_processor(TokenPropagator())   
    # Add the main exporter processor.
    provider.add_span_processor(processor)

    trace.set_tracer_provider(provider) # Register the provider globally.
    return trace.get_tracer(service_name) # Return a named tracer.

