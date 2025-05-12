import json
from typing import List, Dict, Any

def ns_to_seconds(nanoseconds: int) -> float:
    return nanoseconds / 1e9

def transform_trace_to_agent_view(spans, span_details_by_id):
    agents = []
    span_map = {s["id"]: s for s in spans}

    trace_input = None # Overall input, taken from first user prompt.
    trace_output = None # Overall output, taken from last assistant completion.

    # Find the first user prompt content.
    for s in spans:
        details = span_details_by_id.get(s["id"], {})
        for p in details.get("prompts", []):
            if p["role"] == "user":
                trace_input = p["content"]
                break
        if trace_input:
            break

    # Find the last assistant completion content (search backwards).
    for s in reversed(spans):
        details = span_details_by_id.get(s["id"], {})
        for c in details.get("completions", []):
            if c["role"] == "assistant":
                trace_output = c["content"]
                break
        if trace_output:
            break

    # Main loop to identify and structure agent spans.
    for span in spans:
        # Heuristic: Only consider internal spans as potential agents.
        if span["kind"] != "SpanKind.INTERNAL":
            continue

        attributes = json.loads(span["attributes"])
        children = [s for s in spans if s["parent_id"] == span["id"]]
        # Heuristic: Check if any child is an LLM call.
        has_llm_child = any("openai.chat" in c["name"] for c in children)
        # Heuristic: Check if the span has normalized I/O attributes.
        has_io = "gen_ai.normalized_input_output" in attributes

        if not (has_llm_child or has_io):
            continue

        agent_name = attributes.get("agent.name") or span["name"] or f"Agent {len(agents) + 1}"

        # Create the basic agent structure.
        agent = {
            "span_id": span["id"],
            "name": agent_name,
            "duration": round(span["duration"], 2),
            "start_time": round(span["started_at"], 2),
            "end_time": round(span["ended_at"], 2),
            "tools_called": [],
            "final_completion": None
        }

        # Process children to find tool calls and final completion.
        for child in children:
            child_attrs = json.loads(child["attributes"])
            tool_calls = []

            # Extract tool calls based on specific attribute pattern (up to 5).
            for i in range(5):
                tool_name = child_attrs.get(f"gen_ai.completion.0.tool_calls.{i}.name")
                args_json = child_attrs.get(f"gen_ai.completion.0.tool_calls.{i}.arguments")
                if not tool_name:
                    break

                try:
                    args = json.loads(args_json) if args_json else None
                except Exception:
                    args = None

                # Find tool output from the child span's details.
                output = None
                for tool in span_details_by_id.get(child["id"], {}).get("tools", []):
                    if tool["name"] == tool_name:
                        # Assumes output is stored under 'arguments' key.
                        output = tool.get("arguments", None)

                tool_calls.append({
                    "name": tool_name,
                    "args": args,
                    "output": output,
                    "duration": round(child["duration"], 2),
                    "span_id": child["id"]
                })

            # Add all tool calls found in this child to the agent.
            agent["tools_called"].extend(tool_calls)

            for comp in span_details_by_id.get(child["id"], {}).get("completions", []):
                agent["final_completion"] = comp.get("content")

        # Add the completed agent structure to the list.
        agents.append(agent)

    return {
        "trace_input": trace_input,
        "trace_output": trace_output,
        "agents": agents
    }

def parse_normalized_io_for_span(span_id: str, attribute_json: str):
    # Tries to parse the 'gen_ai.normalized_input_output' JSON attribute.
    try:
        parsed = json.loads(attribute_json)
        if not isinstance(parsed, dict):
            return [], []

        prompt_records = []
        completion_records = []

        # Extract prompt details.
        for idx, prompt in enumerate(parsed.get("prompts", [])):
            prompt_records.append({
                "span_id": span_id,
                "role": prompt.get("role", "user"),
                "content": prompt.get("content", ""),
                "message_index": idx
            })

        # Extract completion details.
        for idx, completion in enumerate(parsed.get("completions", [])):
            completion_records.append({
                "span_id": span_id,
                "role": completion.get("role", "assistant"),
                "content": completion.get("content", ""),
                "message_index": idx,
                "finish_reason": completion.get("finish_reason", None),
                "completion_tokens": completion.get("completion_tokens", None),
                "prompt_tokens": completion.get("prompt_tokens", None),
                "total_tokens": completion.get("total_tokens", None)
            })

        # Return extracted prompts and completions.
        return prompt_records, completion_records

    # If JSON is invalid, return empty lists.
    except json.JSONDecodeError:
        return [], []
