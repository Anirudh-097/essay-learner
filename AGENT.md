# AGENT.md

# GRE Essay Coach -- Implementation Plan

## Goal

Build a **personal GRE AWA practice platform** that:

-   Imports essay topics from a PDF.
-   Selects one topic daily.
-   Teaches essay structure.
-   Evaluates one paragraph at a time.
-   Tracks improvement.
-   Runs completely free where possible.

------------------------------------------------------------------------

# Tech Stack

  Layer              Technology
  ------------------ -----------------------------------------------
  Frontend           Next.js + Tailwind CSS
  Backend            FastAPI
  Database           SQLite + SQLAlchemy
  LLM Abstraction    LiteLLM
  PDF Parsing        PyMuPDF
  Authentication     JWT / Simple Password
  Charts             Recharts
  Frontend Hosting   Vercel
  Backend Hosting    Render Free or Oracle Cloud Free
  Model              Gemini 2.5 Flash (or Ollama/OpenRouter later)

------------------------------------------------------------------------

# Project Structure

``` text
gre-essay-coach/
├── frontend/
├── backend/
│   ├── api/
│   ├── core/
│   ├── db/
│   ├── services/
│   ├── schemas/
│   ├── utils/
│   └── main.py
├── data/
├── prompts/
├── scripts/
├── tests/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── README.md
```

------------------------------------------------------------------------

# Milestone 1 -- Project Setup

-   Create Git repository.
-   Create frontend and backend folders.
-   Initialise FastAPI.
-   Initialise Next.js.
-   Configure environment variables.
-   Set up SQLite and SQLAlchemy.
-   Verify frontend ↔ backend communication.

Deliverable: - Empty application running locally.

------------------------------------------------------------------------

# Milestone 2 -- PDF Import

## Objective

Extract GRE topics from a PDF.

Tasks

-   Upload PDF.
-   Parse using PyMuPDF.
-   Clean extracted text.
-   Store topics in SQLite.

Database

Topics

-   id
-   topic
-   category
-   used
-   last_used

Deliverable

-   Database populated with all essay prompts.

------------------------------------------------------------------------

# Milestone 3 -- Daily Topic

Tasks

-   Pick one topic daily.
-   Prevent immediate repetition.
-   Save today's topic.

API

GET /topic/today

Deliverable

-   Daily prompt page.

------------------------------------------------------------------------

# Milestone 4 -- Essay Planner

Generate guidance for:

1.  Introduction
2.  Primary argument
3.  Secondary argument
4.  Counterargument
5.  Conclusion

For each section generate:

-   Purpose
-   Checklist
-   Example paragraph

API

GET /planner/{topic_id}

Deliverable

-   Interactive essay planning page.

------------------------------------------------------------------------

# Milestone 5 -- Vocabulary Helper

Analyse generated content and detect repeated words.

For each repeated word provide:

-   Better synonym
-   Example sentence
-   Context

Example

important

-   crucial
-   pivotal
-   significant
-   fundamental

Deliverable

-   Vocabulary panel.

------------------------------------------------------------------------

# Milestone 6 -- Paragraph Practice

Instead of writing a full essay:

Randomly choose

-   Introduction
-   Body
-   Counterargument
-   Conclusion

User writes only that section.

Deliverable

-   Focused practice workflow.

------------------------------------------------------------------------

# Milestone 7 -- AI Evaluation

Prompt the model to evaluate:

-   Thesis clarity
-   Grammar
-   Vocabulary
-   Logical flow
-   Organisation

Return:

-   Score
-   Strengths
-   Weaknesses
-   Suggested rewrite
-   Better vocabulary

API

POST /evaluate

Deliverable

-   Instant paragraph feedback.

------------------------------------------------------------------------

# Milestone 8 -- Progress Tracking

Store every attempt.

Track

-   Grammar
-   Vocabulary
-   Structure
-   Argument quality

Visualise improvements with charts.

Deliverable

-   Dashboard.

------------------------------------------------------------------------

# Milestone 9 -- Authentication

Simple options:

-   Single password
-   JWT
-   Restrict to your email

Goal

Keep application private.

------------------------------------------------------------------------

# Milestone 10 -- Deployment

Frontend

-   Vercel

Backend

-   Render Free or
-   Oracle Cloud Free

Database

-   SQLite

Store secrets in environment variables.

------------------------------------------------------------------------

# API Endpoints

GET /topic/today

GET /planner/{topic_id}

POST /evaluate

GET /vocabulary

------------------------------------------------------------------------

# Prompt Files

prompts/

-   planner.txt
-   evaluator.txt
-   vocabulary.txt
-   rewrite.txt

Keep prompts outside code for easy iteration.

------------------------------------------------------------------------

# Future Enhancements

-   Personal vocabulary notebook
-   Spaced repetition
-   Timed writing mode
-   Whole essay scoring
-   Weakness detection
-   Side-by-side comparison with model essays
-   Multiple LLM providers
-   Ollama support

------------------------------------------------------------------------

# Suggested Development Order

1.  Repository setup
2.  FastAPI
3.  Next.js
4.  SQLite
5.  PDF import
6.  Daily topic
7.  Planner
8.  Vocabulary helper
9.  Paragraph practice
10. AI evaluation
11. Progress dashboard
12. Authentication
13. Deployment

------------------------------------------------------------------------

# Long-Term Architecture

PDF

↓

SQLite

↓

FastAPI

↓

LLM Service

↓

Next.js

The LLM should be isolated behind a provider interface so Gemini,
OpenRouter, or Ollama can be swapped without changing business logic.
