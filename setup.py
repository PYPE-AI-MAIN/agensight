from setuptools import setup, find_packages


with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="agensight",
    version="0.1.9",
    author="Deepesh Agrawal",
    description="A Python SDK for logging and visualizing OpenAI agent interactions, with a built-in CLI and web dashboard.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    packages=find_packages(),
    install_requires=[
        "openai",  
        "requests",
        "flask",  
    ],
    entry_points={
        "console_scripts": [
            "agensight=cli.main:main",
        ],
    },
    python_requires=">=3.7",
    include_package_data=True,
)