#!/usr/bin/env python3
"""Import scraped GRE topics into the application's SQLite database.

The scraper's ``page`` metadata is intentionally ignored. The database keeps
only the fields needed by the planned daily-topic workflow.

Usage:
    python scripts/import_topics.py /tmp/essay-learner-topics.json
    python scripts/import_topics.py topics.json --database data/topics.db
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path
from typing import Any


SCHEMA = """
CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL UNIQUE,
    used INTEGER NOT NULL DEFAULT 0 CHECK (used IN (0, 1)),
    last_used TEXT
);
"""


def load_topics(json_path: Path) -> list[str]:
    records: Any = json.loads(json_path.read_text(encoding="utf-8"))
    if not isinstance(records, list):
        raise ValueError("JSON root must be a list")

    topics: list[str] = []
    for index, record in enumerate(records, start=1):
        if not isinstance(record, dict) or not isinstance(record.get("topic"), str):
            raise ValueError(f"Record {index} must contain a string 'topic'")
        topic = " ".join(record["topic"].split())
        if not topic:
            raise ValueError(f"Record {index} contains an empty topic")
        topics.append(topic)
    return topics


def import_topics(json_path: Path, database_path: Path) -> tuple[int, int]:
    topics = load_topics(json_path)
    database_path.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(database_path) as connection:
        connection.executescript(SCHEMA)
        before = connection.execute("SELECT COUNT(*) FROM topics").fetchone()[0]
        connection.executemany(
            "INSERT OR IGNORE INTO topics (topic) VALUES (?)",
            ((topic,) for topic in topics),
        )
        after = connection.execute("SELECT COUNT(*) FROM topics").fetchone()[0]
    return after - before, after


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("json", type=Path, help="Scraper JSON output")
    parser.add_argument(
        "--database",
        type=Path,
        default=Path("data/topics.db"),
        help="SQLite database path (default: data/topics.db)",
    )
    args = parser.parse_args()

    if not args.json.is_file():
        parser.error(f"JSON file does not exist: {args.json}")

    inserted, total = import_topics(args.json, args.database)
    print(f"Inserted {inserted} new topics; database contains {total} topics: {args.database}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
