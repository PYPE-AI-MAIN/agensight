from setuptools import setup, find_packages

setup(
    name="agensight",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "Flask",
        "openai",
        "pytest"
    ],
    entry_points={
        "console_scripts": [
            "agensight=cli.main:main"
        ]
    },
    # ...other metadata
)