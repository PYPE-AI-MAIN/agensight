# fault/cli.py

import argparse
import webbrowser
from agensight.server import start_server

def main():
    parser = argparse.ArgumentParser(prog="fault")
    parser.add_argument("command", choices=["view"])
    args = parser.parse_args()

    if args.command == "view":
        start_server()
        webbrowser.open("http://localhost:5000")

if __name__ == "__main__":
    main()