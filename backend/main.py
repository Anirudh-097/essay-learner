"""FastAPI application for the Essay Learner backend."""

from __future__ import annotations

import sqlite3
from datetime import datetime

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import db
from . import openrouter


PARAGRAPH_TYPES = (
    "Introduction",
    "Primary argument",
    "Secondary argument",
    "Counterargument",
    "Conclusion",
)


class Topic(BaseModel):
    id: int
    topic: str
    used: bool
    last_used: datetime | None = None


class TopicList(BaseModel):
    items: list[Topic]
    total: int


class EssayRequest(BaseModel):
    topic_id: int


class EssayResponse(BaseModel):
    topic: Topic
    essay: str


class PracticePrompt(BaseModel):
    topic: Topic
    paragraph_type: str


class EvaluationRequest(BaseModel):
    topic_id: int
    paragraph_type: str
    paragraph: str


class Evaluation(BaseModel):
    score: int
    strengths: list[str]
    weaknesses: list[str]
    suggested_rewrite: str
    better_vocabulary: list[dict[str, str]]


class EvaluationResponse(BaseModel):
    topic: Topic
    paragraph_type: str
    evaluation: Evaluation


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


def require_topic(topic_id: int) -> Topic:
    row = db.get_topic(topic_id=topic_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    return serialize_topic(row)


@app.post("/essay/generate", response_model=EssayResponse)
def generate_essay(request: EssayRequest) -> EssayResponse:
    topic = require_topic(request.topic_id)
    try:
        essay = openrouter.complete("essay.txt", {"topic": topic.topic})
    except openrouter.OpenRouterError as error:
        status = 503 if "not configured" in str(error) else 502
        raise HTTPException(status_code=status, detail=str(error)) from error
    return EssayResponse(topic=topic, essay=essay)


@app.get("/practice/prompt", response_model=PracticePrompt)
def practice_prompt(exclude_topic_id: int | None = Query(None, ge=1)) -> PracticePrompt:
    row = db.get_random_practice_topic(exclude_topic_id=exclude_topic_id)
    if row is None:
        raise HTTPException(status_code=404, detail="No practice topics have been imported")
    import random

    return PracticePrompt(
        topic=serialize_topic(row), paragraph_type=random.choice(PARAGRAPH_TYPES)
    )


@app.post("/evaluate", response_model=EvaluationResponse)
def evaluate_paragraph(request: EvaluationRequest) -> EvaluationResponse:
    if request.paragraph_type not in PARAGRAPH_TYPES:
        raise HTTPException(status_code=422, detail="Unknown paragraph type")
    if not request.paragraph.strip():
        raise HTTPException(status_code=422, detail="Paragraph cannot be empty")
    topic = require_topic(request.topic_id)
    try:
        raw_evaluation = openrouter.complete(
            "evaluate.txt",
            {
                "topic": topic.topic,
                "paragraph_type": request.paragraph_type,
                "paragraph": request.paragraph.strip(),
            },
        )
        cleaned = raw_evaluation.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        evaluation = Evaluation.model_validate_json(cleaned.strip())
    except openrouter.OpenRouterError as error:
        status = 503 if "not configured" in str(error) else 502
        raise HTTPException(status_code=status, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=502, detail="Model returned invalid evaluation JSON") from error
    return EvaluationResponse(
        topic=topic, paragraph_type=request.paragraph_type, evaluation=evaluation
    )
