"""Small SQLite data-access layer for the Essay Learner API."""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DATABASE = PROJECT_ROOT / "data" / "topics.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL UNIQUE,
    used INTEGER NOT NULL DEFAULT 0 CHECK (used IN (0, 1)),
    last_used TEXT
);
"""


@contextmanager
def connect(database_path: Path = DEFAULT_DATABASE) -> Iterator[sqlite3.Connection]:
    database_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(database_path, timeout=10)
    connection.row_factory = sqlite3.Row
    try:
        connection.executescript(SCHEMA)
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def get_topics(database_path: Path = DEFAULT_DATABASE) -> list[sqlite3.Row]:
    with connect(database_path) as connection:
        return connection.execute(
            "SELECT id, topic, used, last_used FROM topics ORDER BY id"
        ).fetchall()


def get_topic(database_path: Path = DEFAULT_DATABASE, topic_id: int = 0) -> sqlite3.Row | None:
    with connect(database_path) as connection:
        return connection.execute(
            "SELECT id, topic, used, last_used FROM topics WHERE id = ?",
            (topic_id,),
        ).fetchone()


def get_random_practice_topic(
    database_path: Path = DEFAULT_DATABASE, exclude_topic_id: int | None = None
) -> sqlite3.Row | None:
    with connect(database_path) as connection:
        if exclude_topic_id is None:
            return connection.execute(
                "SELECT id, topic, used, last_used FROM topics ORDER BY RANDOM() LIMIT 1"
            ).fetchone()
        return connection.execute(
            """SELECT id, topic, used, last_used FROM topics
               WHERE id != ? ORDER BY RANDOM() LIMIT 1""",
            (exclude_topic_id,),
        ).fetchone()


def get_or_assign_today(database_path: Path = DEFAULT_DATABASE) -> sqlite3.Row | None:
    """Return today's topic, assigning one if today's topic does not exist."""

    today = datetime.now(timezone.utc).date().isoformat()
    now = datetime.now(timezone.utc).isoformat()
    with connect(database_path) as connection:
        # BEGIN IMMEDIATE prevents two simultaneous first requests from being
        # assigned different topics.
        connection.execute("BEGIN IMMEDIATE")
        existing = connection.execute(
            """SELECT id, topic, used, last_used FROM topics
               WHERE last_used LIKE ? ORDER BY id LIMIT 1""",
            (f"{today}%",),
        ).fetchone()
        if existing:
            return existing

        selected = connection.execute(
            """SELECT id, topic, used, last_used FROM topics
               WHERE used = 0 ORDER BY RANDOM() LIMIT 1"""
        ).fetchone()
        if selected is None:
            # Once the pool is exhausted, start another cycle from the least
            # recently used topic while still avoiding today's assignment.
            selected = connection.execute(
                """SELECT id, topic, used, last_used FROM topics
                   ORDER BY last_used IS NOT NULL, last_used, RANDOM()
                   LIMIT 1"""
            ).fetchone()
        if selected is None:
            return None

        connection.execute(
            "UPDATE topics SET used = 1, last_used = ? WHERE id = ?",
            (now, selected["id"]),
        )
        return connection.execute(
            "SELECT id, topic, used, last_used FROM topics WHERE id = ?",
            (selected["id"],),
        ).fetchone()
