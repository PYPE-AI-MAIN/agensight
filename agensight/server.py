from flask import Flask, jsonify, send_from_directory,request
import os
import json
from agensight.utils.agentUtils import add_new_prompt

app = Flask(__name__, static_folder="./frontend")
LOG_ROOT = os.path.join(os.getcwd(), "log")

@app.route("/agents")
def agents():
    if not os.path.exists(LOG_ROOT):
        return jsonify([])
    return jsonify([name for name in os.listdir(LOG_ROOT) if os.path.isdir(os.path.join(LOG_ROOT, name))])

@app.route("/log/<agent>")
def agent_log(agent):
    log_file = os.path.join(LOG_ROOT, agent, "agent.log")
    if not os.path.exists(log_file):
        return jsonify([])
    with open(log_file) as f:
        lines = f.readlines()
    return jsonify([json.loads(line) for line in lines])

@app.route("/prompt/<agent>", methods=["GET", "POST"])
def agent_prompt(agent):
    prompt_file = os.path.join(LOG_ROOT, agent, "prompt.json")
    if request.method == "POST":
        data = request.get_json()
        prompt_template = data.get("prompt")
        if not prompt_template:
            return jsonify({"error": "No prompt provided"}), 400
        add_new_prompt(agent, prompt_template, prompt_file)
        return jsonify({"status": "ok"})
    else:  # GET
        if not os.path.exists(prompt_file):
            return jsonify({})
        with open(prompt_file) as f:
            return jsonify(json.load(f))

@app.route("/prompt/<agent>/set_current", methods=["POST"])
def set_current_prompt(agent):
    data = request.get_json()
    idx = data.get("index")
    prompt_file = os.path.join(LOG_ROOT, agent, "prompt.json")
    if not os.path.exists(prompt_file):
        return jsonify({"error": "No prompt file found"}), 404
    with open(prompt_file) as f:
        promptData = json.load(f)
    prompts = promptData.get("prompts", [])
    try:
        idx = int(idx)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid index"}), 400
    if idx is None or not (0 <= idx < len(prompts)):
        return jsonify({"error": "Invalid index"}), 400
    for i, p in enumerate(prompts):
        p["current"] = (i == idx)
    with open(prompt_file, "w") as f:
        json.dump(promptData, f, indent=2)
    return jsonify({"status": "ok"})

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)

def start_server():
    app.run(debug=False)