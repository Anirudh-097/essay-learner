#!/usr/bin/env python3
"""Extract GRE Issue topics from the ETS Issue Pool PDF.

The PDF puts the actual topic before an italic task instruction such as
"Write a response in which you discuss ...".  The instruction is not part of
the stored topic, so it is removed from the extracted output.

Usage:
    python scripts/scrape_issue_pool.py issue-pool.pdf --json topics.json
    python scripts/scrape_issue_pool.py issue-pool.pdf

Requires PyMuPDF (the PDF parser selected in AGENT.md):
    python -m pip install PyMuPDF
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

try:
    import fitz
except ImportError:  # Keep --help and the error message usable without deps.
    fitz = None  # type: ignore[assignment]


TASK_START = re.compile(r"^write\s+a\s+response\s+in\s+which\b", re.I)
ISSUE_POOL_URL = re.compile(r"https?://\S*issue-pool\.pdf\b", re.I)
PAGE_NUMBER = re.compile(r"^\s*\d+\s*$")


def clean_line(line: str) -> str:
    """Normalize whitespace and common PDF ligatures in one extracted line."""

    return (
        line.replace("\u00ad", "")
        .replace("ﬁ", "fi")
        .replace("ﬂ", "fl")
        .replace("\u2011", "-")
        .replace("\u2013", "-")
        .replace("\u2014", "-")
        .strip()
    )


def is_noise(line: str) -> bool:
    lowered = line.casefold()
    return (
        not line
        or PAGE_NUMBER.fullmatch(line) is not None
        or "analytical writing" in lowered
        or "pool of issue topics" in lowered
        or "analyze an issue topic pool" in lowered
        or "this page contains the issue topics" in lowered
        or "for the analytical writing section" in lowered
        or "when you take the test" in lowered
        or "topic from this pool" in lowered
        or "each issue topic consists" in lowered
        or "specific task instructions" in lowered
        or "the wording of some" in lowered
        or "topics in the test might vary" in lowered
        or "there may be multiple versions" in lowered
        or "with different task instructions" in lowered
        or "read your test topic" in lowered
        or "specific task directions" in lowered
        or "as it appears in the actual test" in lowered
        or lowered in {"actual test", "actual test."}
        or "the writing of some topics" in lowered
        or ISSUE_POOL_URL.search(line) is not None
        or line.startswith("©")
    )


def extract_topics(pdf_path: Path) -> list[dict[str, Any]]:
    """Return one record per topic, preserving its source page number."""

    if fitz is None:
        raise ImportError("PyMuPDF is not installed")

    topics: list[dict[str, Any]] = []
    with fitz.open(pdf_path) as document:
        for page_number, page in enumerate(document, start=1):
            # Blocks preserve line order better than page.get_text("text") for
            # this PDF's two-column layout.  Within a block, each line is a
            # candidate topic or its following task instruction.
            blocks = page.get_text("blocks", sort=True)
            current: list[str] = []
            for block in blocks:
                lines = [clean_line(value) for value in block[4].splitlines()]
                lines = [value for value in lines if not is_noise(value)]
                instruction_started = False
                for line in lines:
                    if instruction_started:
                        # The italic instruction often wraps across several
                        # lines. Once it starts, the rest of this block is not
                        # topic text.
                        continue

                    if TASK_START.match(line):
                        # The task text can wrap across several lines.
                        # Everything after the topic is intentionally ignored.
                        if current:
                            topics.append(
                                {"topic": " ".join(current), "page": page_number}
                            )
                        current = []
                        instruction_started = True
                        continue

                    # A topic may wrap over multiple visual lines. Keep
                    # collecting until the task instruction marks its end.
                    current.append(line)

            # If the task instruction is in a following page/block, keep the
            # candidate in `current`; do not emit it at boundaries because
            # front matter and footer blocks do not have a task marker.

    # Remove duplicate fragments and obvious front-matter records while keeping
    # the PDF order stable.
    result: list[dict[str, Any]] = []
    seen: set[str] = set()
    for record in topics:
        topic = re.sub(r"\s+", " ", record["topic"]).strip()
        if len(topic) < 30 or topic.casefold() in seen:
            continue
        seen.add(topic.casefold())
        result.append({"topic": topic, "page": record["page"]})
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path, help="Path to the ETS Issue Pool PDF")
    parser.add_argument("--json", type=Path, help="Write extracted topics as JSON")
    args = parser.parse_args()

    if not args.pdf.is_file():
        parser.error(f"PDF does not exist: {args.pdf}")

    try:
        topics = extract_topics(args.pdf)
    except ImportError:
        print("PyMuPDF is required: python -m pip install PyMuPDF", file=sys.stderr)
        return 2

    if args.json:
        args.json.write_text(json.dumps(topics, indent=2, ensure_ascii=False) + "\n")
        print(f"Wrote {len(topics)} topics to {args.json}")
    else:
        for index, record in enumerate(topics, start=1):
            print(f"{index}. {record['topic']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
