from flask import Flask, send_from_directory
from flask_cors import CORS
from .routes.config import config_bp
from .routes.prompt import prompt_bp
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder="../ui/out")
CORS(app, origins="*", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])

app.register_blueprint(config_bp)
app.register_blueprint(prompt_bp)

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)

def start_server():
    app.run(debug=False)

if __name__ == "__main__":
    start_server()