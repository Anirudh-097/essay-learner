# Backend

Run from the project root:

```bash
venv/bin/uvicorn backend.main:app --reload
```

The API uses `data/topics.db` by default. Available endpoints:

- `GET /health`
- `GET /topics?offset=0&limit=50`
- `GET /topics/{topic_id}`
- `GET /topic/today`

Interactive API documentation is available at `/docs` while the server is running.
