from setuptools import setup, find_packages


with open("readme.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="agensight",
    version="0.3.6",
    author="Pype",
    description="A Python SDK for logging and visualizing OpenAI agent interactions, with a built-in CLI and web dashboard.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    packages=find_packages(),
    install_requires=[
        "openai",
        "requests",
        "flask",
        "flask_cors",
        "fastapi",
        "uvicorn",
        "sqlalchemy",
        "pydantic",
        "starlette",
        "typing-extensions",
        "python-multipart",
        "werkzeug",
        "jinja2",
        "aiofiles",
        "click",
        "opentelemetry-sdk",
        "opentelemetry-api",
        "opentelemetry-instrumentation",
        "opentelemetry-instrumentation-openai",
        "anthropic"
    ],
    entry_points={
        "console_scripts": [
            "agensight=cli.main:main",
        ],
    },
    python_requires=">=3.10",
    include_package_data=True,
)

