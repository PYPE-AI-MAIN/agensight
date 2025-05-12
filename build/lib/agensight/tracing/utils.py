import json
from typing import List, Dict, Any

def ns_to_seconds(nanoseconds: int) -> float:
    return nanoseconds / 1e9

def transform_trace_to_agent_view(spans, span_details_by_id):
    agents = []
    span_map = {s["id"]: s for s in spans}

    trace_input = None
    trace_output = None

    for s in spans:
        details = span_details_by_id.get(s["id"], {})
        for p in details.get("prompts", []):
            if p["role"] == "user":
                trace_input = p["content"]
                break
        if trace_input:
            break

    for s in reversed(spans):
        details = span_details_by_id.get(s["id"], {})
        for c in details.get("completions", []):
            if c["role"] == "assistant":
                trace_output = c["content"]
                break
        if trace_output:
            break

    for span in spans:
        if span["kind"] != "SpanKind.INTERNAL":
            continue

        attributes = json.loads(span["attributes"])
        children = [s for s in spans if s["parent_id"] == span["id"]]
        has_llm_child = any("openai.chat" in c["name"] for c in children)
        has_io = "gen_ai.normalized_input_output" in attributes

        if not (has_llm_child or has_io):
            continue

        agent_name = attributes.get("agent.name") or span["name"] or f"Agent {len(agents) + 1}"

        agent = {
            "span_id": span["id"],
            "name": agent_name,
            "duration": round(span["duration"], 2),
            "start_time": round(span["started_at"], 2),
            "end_time": round(span["ended_at"], 2),
            "tools_called": [],
            "final_completion": None
        }

        for child in children:
            child_attrs = json.loads(child["attributes"])
            tool_calls = []

            for i in range(5):
                tool_name = child_attrs.get(f"gen_ai.completion.0.tool_calls.{i}.name")
                args_json = child_attrs.get(f"gen_ai.completion.0.tool_calls.{i}.arguments")
                if not tool_name:
                    break

                try:
                    args = json.loads(args_json) if args_json else None
                except Exception:
                    args = None

                output = None
                for tool in span_details_by_id.get(child["id"], {}).get("tools", []):
                    if tool["name"] == tool_name:
                        output = tool.get("arguments", None)

                tool_calls.append({
                    "name": tool_name,
                    "args": args,
                    "output": output,
                    "duration": round(child["duration"], 2),
                    "span_id": child["id"]
                })

            agent["tools_called"].extend(tool_calls)

            for comp in span_details_by_id.get(child["id"], {}).get("completions", []):
                agent["final_completion"] = comp.get("content")

        agents.append(agent)

    return {
        "trace_input": trace_input,
        "trace_output": trace_output,
        "agents": agents
    }

def parse_normalized_io_for_span(span_id: str, attribute_json: str):
    try:
        parsed = json.loads(attribute_json)
        if not isinstance(parsed, dict):
            return [], []

        prompt_records = []
        completion_records = []

        for idx, prompt in enumerate(parsed.get("prompts", [])):
            prompt_records.append({
                "span_id": span_id,
                "role": prompt.get("role", "user"),
                "content": prompt.get("content", ""),
                "message_index": idx
            })

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

        return prompt_records, completion_records

    except json.JSONDecodeError:
        return [], []
