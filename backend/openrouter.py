"""OpenRouter client kept behind a small provider boundary."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROMPTS_DIR = PROJECT_ROOT / "prompts"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Loads local development secrets from the project root when present. In a
# container or hosted deployment, environment variables injected by Docker or
# the platform take precedence and no .env file is required.
load_dotenv(PROJECT_ROOT / ".env")


class OpenRouterError(RuntimeError):
    """An upstream OpenRouter request failed."""


def _prompt(name: str) -> str:
    return (PROMPTS_DIR / name).read_text(encoding="utf-8")


def complete(prompt_name: str, variables: dict[str, str]) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise OpenRouterError("OPENROUTER_API_KEY is not configured")

    prompt = _prompt(prompt_name).format(**variables)
    payload = {
        "model": os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash"),
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
    }
    request = urllib.request.Request(
        OPENROUTER_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": os.getenv("APP_URL", "http://localhost:3000"),
            "X-Title": "Essay Learner",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            body: dict[str, Any] = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise OpenRouterError(f"OpenRouter returned {error.code}: {detail[:500]}") from error
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        raise OpenRouterError(f"OpenRouter request failed: {error}") from error

    try:
        content = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as error:
        raise OpenRouterError("OpenRouter returned an unexpected response") from error
    if not isinstance(content, str) or not content.strip():
        raise OpenRouterError("OpenRouter returned an empty response")
    return content.strip()
