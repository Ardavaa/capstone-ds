# Backend Setup

This backend is managed with `uv` and currently keeps the existing Python constraint from `pyproject.toml`.

## Initialize the Environment

From the `backend` directory:

```bash
uv venv
```

Activate the virtual environment:

```bash
# Windows PowerShell
.venv\Scripts\Activate.ps1

# Git Bash
source .venv/Scripts/activate
```

Install the locked dependencies:

```bash
uv sync
```

## Export `requirements.txt`

When dependencies change through `uv add`, regenerate `requirements.txt` with:

```bash
uv export --format requirements-txt --no-hashes --output-file requirements.txt
```

The current `requirements.txt` was generated from the existing `uv.lock`.
