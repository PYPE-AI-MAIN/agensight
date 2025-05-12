from .exporters import get_collected_spans # Assumes an exporter collects spans in memory.
from .utils import ns_to_seconds

def visualize_trace():
    """
    Prints a simple text-based visualization of the collected trace spans.

    Retrieves spans (assuming they are collected in memory, e.g., by a
    MemorySpanExporter), sorts them by start time, calculates relative timings,
    and prints a table and a basic flow diagram to the console.
    """
    spans = get_collected_spans()
    if not spans:
        print("No spans collected for visualization.")
        return

    # Sort spans chronologically and find the trace start time.
    spans.sort(key=lambda x: x.start_time)
    first_time = spans[0].start_time

    # Calculate relative start/end times and duration in seconds for each span.
    for span in spans:
        span.relative_start = ns_to_seconds(span.start_time - first_time)
        span.relative_end = ns_to_seconds(span.end_time - first_time)
        span.duration = span.relative_end - span.relative_start

    # Print header for the table view.
    print(f"\n{'Name':<25} {'Start':<10} {'Duration':<10} {'Attributes'}")
    print("-" * 80)
    # Print each span's details.
    for span in spans:       
        print(f"{span.name:<25} {span.relative_start:.2f}s   {span.duration:.2f}s   {span.attributes}")
    
    # Print header for the flow diagram.
    print("\nFlow Diagram (Time relative to first span)")
    print("-" * 80)
    # Calculate scaling factor for the diagram bars.
    max_duration = max(span.duration for span in spans)
    scale = 50 / max_duration if max_duration > 0 else 1 # Scale to ~50 chars max width
    # Print each span as a bar in the diagram.
    for span in spans:
        # Ensure at least one block for visibility, scale duration.
        bar = "█" * max(1, int(span.duration * scale))
        print(f"{span.name:<25} [{bar}] {span.duration:.2f}s")
