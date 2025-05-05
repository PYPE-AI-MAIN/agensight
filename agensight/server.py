from flask import Flask, jsonify, send_from_directory
import os
import json

app = Flask(__name__, static_folder="../frontend")
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

@app.route("/prompt/<agent>")
def agent_prompt(agent):
    prompt_file = os.path.join(LOG_ROOT, agent, "prompt.json")
    if not os.path.exists(prompt_file):
        return jsonify({})
    with open(prompt_file) as f:
        return jsonify(json.load(f))

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)

def start_server():
    app.run(debug=False)