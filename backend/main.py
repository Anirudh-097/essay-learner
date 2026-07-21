"""FastAPI application for the Essay Learner backend."""

from __future__ import annotations

import sqlite3
from datetime import datetime

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import db


class Topic(BaseModel):
    id: int
    topic: str
    used: bool
    last_used: datetime | None = None


class TopicList(BaseModel):
    items: list[Topic]
    total: int


app = FastAPI(title="Essay Learner API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def serialize_topic(row: sqlite3.Row) -> Topic:
    return Topic(
        id=row["id"],
        topic=row["topic"],
        used=bool(row["used"]),
        last_used=row["last_used"],
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/topics", response_model=TopicList)
def list_topics(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
) -> TopicList:
    rows = db.get_topics()
    return TopicList(
        items=[serialize_topic(row) for row in rows[offset : offset + limit]],
        total=len(rows),
    )


@app.get("/topics/{topic_id}", response_model=Topic)
def topic_by_id(topic_id: int) -> Topic:
    row = db.get_topic(topic_id=topic_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    return serialize_topic(row)


@app.get("/topic/today", response_model=Topic)
def topic_today() -> Topic:
    row = db.get_or_assign_today()
    if row is None:
        raise HTTPException(status_code=404, detail="No topics have been imported")
    return serialize_topic(row)
