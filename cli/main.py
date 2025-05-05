# fault/cli.py

import argparse
import webbrowser
from agensight.server import start_server


def main():
    parser = argparse.ArgumentParser(prog="agensight")
    subparsers = parser.add_subparsers(dest="command")

    view_parser = subparsers.add_parser("view", help="View the agensight project")

    args = parser.parse_args()
    if args.command == "view":
        start_server()
        webbrowser.open("http://localhost:5000")
    else:
        parser.print_help()

if __name__ == "__main__":
    main()