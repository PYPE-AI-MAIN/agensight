import json
import sys
import re
from collections import defaultdict
from opentelemetry.sdk.trace.export import SpanExporter, SpanExportResult
from .db import get_db
from agensight.tracing.utils import parse_normalized_io_for_span

TOKEN_PATTERNS = [
    r'"total_tokens":\s*(\d+)',
    r'"completion_tokens":\s*(\d+)',
    r'"prompt_tokens":\s*(\d+)',
    r"'total_tokens':\s*(\d+)",
    r"'completion_tokens':\s*(\d+)",
    r"'prompt_tokens':\s*(\d+)",
    r"tokens.*?(\d+)",
    r"usage.*?total.*?(\d+)",
    r"usage.*?completion.*?(\d+)",
    r"usage.*?prompt.*?(\d+)"
]

def extract_token_counts_from_attrs(attrs, span_id, span_name):
    tokens = {
        "total": attrs.get("llm.usage.total_tokens") or attrs.get("gen_ai.usage.total_tokens"),
        "prompt": attrs.get("gen_ai.usage.prompt_tokens"),
        "completion": attrs.get("gen_ai.usage.completion_tokens")
    }

    for key, value in attrs.items():
        if isinstance(value, (int, float)) and ('token' in key.lower() or 'usage' in key.lower()):
            if 'prompt' in key.lower() and tokens["prompt"] is None:
                tokens["prompt"] = value
            elif 'compl' in key.lower() and tokens["completion"] is None:
                tokens["completion"] = value
            elif 'total' in key.lower() and tokens["total"] is None:
                tokens["total"] = value

    for key, value in attrs.items():
        if isinstance(value, str):
            try:
                if '{' in value or '[' in value:
                    try:
                        parsed = json.loads(value)
                        if isinstance(parsed, dict):
                            for token_key, token_val in parsed.items():
                                if 'token' in token_key.lower() and isinstance(token_val, (int, float)):
                                    if 'prompt' in token_key.lower() and tokens["prompt"] is None:
                                        tokens["prompt"] = token_val
                                    elif 'compl' in token_key.lower() and tokens["completion"] is None:
                                        tokens["completion"] = token_val
                                    elif 'total' in token_key.lower() and tokens["total"] is None:
                                        tokens["total"] = token_val
                    except json.JSONDecodeError:
                        pass

                for pattern in TOKEN_PATTERNS:
                    matches = re.search(pattern, value)
                    if matches:
                        found_value = int(matches.group(1))
                        if 'prompt' in pattern.lower() and tokens["prompt"] is None:
                            tokens["prompt"] = found_value
                        elif 'compl' in pattern.lower() and tokens["completion"] is None:
                            tokens["completion"] = found_value
                        elif 'total' in pattern and tokens["total"] is None:
                            tokens["total"] = found_value
            except:
                pass

    if tokens["total"] is not None and tokens["completion"] is None and tokens["prompt"] is not None:
        tokens["completion"] = int(tokens["total"]) - int(tokens["prompt"])
    elif tokens["total"] is not None and tokens["prompt"] is None and tokens["completion"] is not None:
        tokens["prompt"] = int(tokens["total"]) - int(tokens["completion"])
    elif tokens["prompt"] is not None and tokens["completion"] is not None and tokens["total"] is None:
        tokens["total"] = int(tokens["prompt"]) + int(tokens["completion"])

    return tokens

def _make_io_from_openai_attrs(attrs: dict, span_id: str, span_name: str) -> str | None:
    has_prompt = any('prompt' in k.lower() or 'input' in k.lower() for k in attrs)

    if not has_prompt:
        return None

    prompts, completions = [], []
    i = 0
    found_prompts = False

    while f"gen_ai.prompt.{i}.role" in attrs or f"gen_ai.prompt.{i}.content" in attrs:
        role = attrs.get(f"gen_ai.prompt.{i}.role", "user")
        content = attrs.get(f"gen_ai.prompt.{i}.content", "")
        prompts.append({"role": role, "content": content})
        found_prompts = True
        i += 1

    if not found_prompts:
        input_value = next(
            (attrs[k] for k in attrs if 'input' in k.lower() or 'prompt' in k.lower() and attrs[k]),
            None
        )
        if input_value:
            prompts.append({"role": "user", "content": str(input_value)})

    if not prompts:
        prompts.append({"role": "user", "content": f"[Input for span {span_id}]"})

    output_content = next(
        (attrs[k] for k in attrs if 'completion' in k.lower() and '.content' in k.lower()),
        None
    ) or next(
        (attrs[k] for k in attrs if 'output' in k.lower() or 'result' in k.lower() or 'response' in k.lower()),
        None
    )

    tokens = extract_token_counts_from_attrs(attrs, span_id, span_name)

    completions.append({
        "role": attrs.get("gen_ai.completion.0.role", "assistant"),
        "content": output_content or attrs.get("gen_ai.completion.0.content", ""),
        "finish_reason": attrs.get("gen_ai.completion.0.finish_reason"),
        "completion_tokens": tokens["completion"],
        "prompt_tokens": tokens["prompt"],
        "total_tokens": tokens["total"],
    })

    return json.dumps({"prompts": prompts, "completions": completions})

class DBSpanExporter(SpanExporter):
    def export(self, spans):
        conn = get_db()
        total_tokens_by_trace = defaultdict(int)

        for span in spans:
            ctx       = span.get_span_context()
            trace_id  = format(ctx.trace_id, "032x")
            span_id   = format(ctx.span_id,  "016x")
            parent_id = format(span.parent.span_id, "016x") if span.parent else None

            start = span.start_time / 1e9
            end   = span.end_time   / 1e9
            dur   = end - start
            attrs = dict(span.attributes)

            is_potential_llm_span = any(
                key in str(attrs) or key in span.name.lower()
                for key in ["gen_ai", "openai", "llm", "compl", "token", "prompt"]
            )

            if "gen_ai.normalized_input_output" not in attrs and is_potential_llm_span:
                nio = _make_io_from_openai_attrs(attrs, span_id, span.name)
                if nio:
                    attrs["gen_ai.normalized_input_output"] = nio
            else:
                try:
                    nio_data = json.loads(attrs["gen_ai.normalized_input_output"])
                    if nio_data and "completions" in nio_data and nio_data["completions"]:
                        completion = nio_data["completions"][0]
                        if any(completion.get(k) is None for k in ["total_tokens", "prompt_tokens", "completion_tokens"]):
                            tokens = extract_token_counts_from_attrs(attrs, span_id, span.name)
                            completion.update({
                                "completion_tokens": tokens["completion"],
                                "prompt_tokens": tokens["prompt"],
                                "total_tokens": tokens["total"]
                            })
                            nio_data["completions"][0] = completion
                            attrs["gen_ai.normalized_input_output"] = json.dumps(nio_data)
                except:
                    pass

            try:
                conn.execute(
                    "INSERT OR IGNORE INTO traces (id,name,started_at,ended_at,metadata)"
                    " VALUES (?,?,?,?,?)",
                    (trace_id, span.name, start, end, json.dumps({}))
                )
                conn.execute(
                    "INSERT INTO spans"
                    " (id, trace_id, parent_id, name, started_at, ended_at, duration,"
                    "  kind, status, attributes)"
                    " VALUES (?,?,?,?,?,?,?,?,?,?)",
                    (
                        span_id, trace_id, parent_id, span.name,
                        start, end, dur, str(span.kind),
                        str(span.status.status_code), json.dumps(attrs)
                    )
                )
            except:
                pass

            nio = attrs.get("gen_ai.normalized_input_output")
            if nio:
                try:
                    prompts, completions = parse_normalized_io_for_span(span_id, nio)
                    for p in prompts:
                        conn.execute(
                            "INSERT INTO prompts (span_id,role,content,message_index)"
                            " VALUES (?,?,?,?)",
                            (p["span_id"], p["role"], p["content"], p["message_index"])
                        )
                    for idx, c in enumerate(completions):
                        conn.execute(
                            "INSERT INTO completions"
                            " (span_id,role,content,finish_reason,total_tokens,prompt_tokens,completion_tokens)"
                            " VALUES (?,?,?,?,?,?,?)",
                            (
                                c["span_id"], c["role"], c["content"],
                                c["finish_reason"],
                                int(c["total_tokens"]) if c["total_tokens"] else None,
                                int(c["prompt_tokens"]) if c["prompt_tokens"] else None,
                                int(c["completion_tokens"]) if c["completion_tokens"] else None
                            )
                        )
                        if c["total_tokens"]:
                            total_tokens_by_trace[trace_id] += int(c["total_tokens"])
                except:
                    pass

            try:
                for i in range(5):
                    name = attrs.get(f"gen_ai.completion.0.tool_calls.{i}.name")
                    if not name:
                        break
                    args = attrs.get(f"gen_ai.completion.0.tool_calls.{i}.arguments")
                    conn.execute(
                        "INSERT INTO tools (span_id,name,arguments) VALUES (?,?,?)",
                        (span_id, name, args)
                    )
            except:
                pass

        try:
            for tid, tot in total_tokens_by_trace.items():
                conn.execute("UPDATE traces SET total_tokens=? WHERE id=?", (tot, tid))
            conn.commit()
        except:
            pass

        return SpanExportResult.SUCCESS
