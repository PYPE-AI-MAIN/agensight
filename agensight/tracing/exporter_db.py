import json
import re
from collections import defaultdict
from opentelemetry.sdk.trace.export import SpanExporter, SpanExportResult
from agensight.tracing.db import get_db
from agensight.tracing.utils import parse_normalized_io_for_span

# Regex patterns to find token counts in stringified attributes.
TOKEN_PATTERNS = [
    r'"total_tokens":\s*(\d+)',
    r'"completion_tokens":\s*(\d+)',
    r'"prompt_tokens":\s*(\d+)',
    r"'total_tokens':\s*(\d+)",
    r"'completion_tokens':\s*(\d+)",
    r"'prompt_tokens':\s*(\d+)"
]

def extract_token_counts_from_attrs(attrs, span_id, span_name):
    """Extracts token counts (total, prompt, completion) from span attributes."""
    tokens = {
        "total": attrs.get("llm.usage.total_tokens") or attrs.get("gen_ai.usage.total_tokens"),
        "prompt": attrs.get("gen_ai.usage.prompt_tokens"),
        "completion": attrs.get("gen_ai.usage.completion_tokens")
    }

    # Attempt to find token counts in numeric attribute values.
    for key, value in attrs.items():
        if isinstance(value, (int, float)) and 'token' in key.lower():
            if 'prompt' in key and tokens["prompt"] is None:
                tokens["prompt"] = value
            elif 'compl' in key and tokens["completion"] is None:
                tokens["completion"] = value
            elif 'total' in key and tokens["total"] is None:
                tokens["total"] = value

    # Attempt to find token counts in stringified JSON or by regex in string attributes.
    for key, value in attrs.items():
        if isinstance(value, str):
            try:
                parsed = json.loads(value) if '{' in value or '[' in value else None
                if isinstance(parsed, dict):
                    for k, v in parsed.items():
                        if 'token' in k.lower() and isinstance(v, (int, float)):
                            if 'prompt' in k.lower() and tokens["prompt"] is None:
                                tokens["prompt"] = v
                            elif 'compl' in k.lower() and tokens["completion"] is None:
                                tokens["completion"] = v
                            elif 'total' in k.lower() and tokens["total"] is None:
                                tokens["total"] = v
            except:
                pass # Ignore errors during string parsing.

            for pattern in TOKEN_PATTERNS:
                match = re.search(pattern, value)
                if match:
                    val = int(match.group(1))
                    if 'prompt' in pattern and tokens["prompt"] is None:
                        tokens["prompt"] = val
                    elif 'compl' in pattern and tokens["completion"] is None:
                        tokens["completion"] = val
                    elif 'total' in pattern and tokens["total"] is None:
                        tokens["total"] = val

    if tokens["total"] is None and tokens["prompt"] is not None and tokens["completion"] is not None:
        tokens["total"] = tokens["prompt"] + tokens["completion"]
    elif tokens["prompt"] is None and tokens["total"] is not None and tokens["completion"] is not None:
        tokens["prompt"] = tokens["total"] - tokens["completion"]
    elif tokens["completion"] is None and tokens["total"] is not None and tokens["prompt"] is not None:
        tokens["completion"] = tokens["total"] - tokens["prompt"]

    return tokens

def _make_io_from_openai_attrs(attrs: dict, span_id: str, span_name: str) -> str | None:
    """Constructs normalized input/output JSON string from OpenAI-like span attributes."""
    has_prompt = any('prompt' in k.lower() or 'input' in k.lower() for k in attrs)
    if not has_prompt:
        return None # Not an LLM-like span if no prompt/input attributes.

    prompts, completions = [], []
    i = 0
    while f"gen_ai.prompt.{i}.role" in attrs or f"gen_ai.prompt.{i}.content" in attrs:
        prompts.append({
            "role": attrs.get(f"gen_ai.prompt.{i}.role", "user"),
            "content": attrs.get(f"gen_ai.prompt.{i}.content", "")
        })
        i += 1

    if not prompts:
        fallback = attrs.get("gen_ai.input") or next(
            (attrs[k] for k in attrs if "prompt" in k.lower()), "[Input not found]"
        )
        prompts = [{"role": "user", "content": str(fallback)}]

    output = next(
        (attrs.get(k) for k in attrs if "completion" in k.lower() and ".content" in k),
        attrs.get("gen_ai.completion.0.content", "")
    )

    tokens = extract_token_counts_from_attrs(attrs, span_id, span_name)

    completions.append({
        "role": attrs.get("gen_ai.completion.0.role", "assistant"),
        "content": output,
        "finish_reason": attrs.get("gen_ai.completion.0.finish_reason"),
        "completion_tokens": tokens["completion"],
        "prompt_tokens": tokens["prompt"],
        "total_tokens": tokens["total"]
    })

    return json.dumps({"prompts": prompts, "completions": completions})

class DBSpanExporter(SpanExporter):
    """Exports OpenTelemetry spans to a SQLite database."""
    def export(self, spans):
        """Processes and stores a batch of spans in the database."""
        conn = get_db()
        total_tokens_by_trace = defaultdict(int)

        for span in spans:
            ctx = span.get_span_context()
            trace_id = format(ctx.trace_id, "032x")
            span_id = format(ctx.span_id, "016x")
            parent_id = format(span.parent.span_id, "016x") if span.parent else None

            start = span.start_time / 1e9
            end = span.end_time / 1e9
            dur = end - start
            attrs = dict(span.attributes)
            trace_id = attrs.get("trace_id") or format(ctx.trace_id, "032x")
            span_id = format(ctx.span_id, "016x")
            parent_id = format(span.parent.span_id, "016x") if span.parent else None
            start = span.start_time / 1e9
            end = span.end_time / 1e9
            duration = end - start

            is_llm = any(k in str(attrs) or k in span.name.lower() for k in ["llm", "openai", "gen_ai", "completion"])

            if "gen_ai.normalized_input_output" not in attrs and is_llm:
                attrs["gen_ai.normalized_input_output"] = _make_io_from_openai_attrs(attrs, span_id, span.name)

            try:
                session_id = attrs.get("session.id")
                if session_id:
                    try:
                        conn.execute(
                            "INSERT OR IGNORE INTO sessions (id, started_at, metadata) VALUES (?, ?, ?)",
                            (session_id, start, json.dumps({}))
                        )
                    except:
                        pass

                conn.execute(
                    """
                    INSERT INTO traces (id, session_id, name, started_at, ended_at, metadata)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        session_id = excluded.session_id,
                        name = excluded.name,
                        started_at = excluded.started_at,
                        ended_at = excluded.ended_at,
                        metadata = excluded.metadata
                    """,
                    (trace_id, session_id, span.name, start, end, json.dumps({}))
                )
                # Insert span record.
                conn.execute(
                    "INSERT INTO spans"
                    " (id, trace_id, parent_id, name, started_at, ended_at, duration,"
                    "  kind, status, attributes)"
                    " VALUES (?,?,?,?,?,?,?,?,?,?)",
                    (
                        span_id, trace_id, parent_id, span.name, start, end, duration,
                        str(span.kind), str(span.status.status_code), json.dumps(attrs)
                    )
                )
            except:
                pass

            try:
                nio = attrs.get("gen_ai.normalized_input_output")
                if nio:
                    prompts, completions = parse_normalized_io_for_span(span_id, nio)
                    for p in prompts:
                        conn.execute("INSERT INTO prompts (span_id, role, content, message_index) VALUES (?, ?, ?, ?)",
                                     (p["span_id"], p["role"], p["content"], p["message_index"]))
                    for c in completions:
                        conn.execute("INSERT INTO completions (span_id, role, content, finish_reason, total_tokens, prompt_tokens, completion_tokens) VALUES (?, ?, ?, ?, ?, ?, ?)",
                                     (
                                         c["span_id"], c["role"], c["content"], c["finish_reason"],
                                         c["total_tokens"], c["prompt_tokens"], c["completion_tokens"]
                                     ))
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
            for trace_id, total in total_tokens_by_trace.items():
                conn.execute("UPDATE traces SET total_tokens=? WHERE id=?", (total, trace_id))
            conn.commit()
        except:
            pass

        return SpanExportResult.SUCCESS