# Frontend

Requirements: Node.js 20 or newer and npm.

Install and run from the project root:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open <http://localhost:3000>. The frontend expects the FastAPI backend at
`http://localhost:8000`; change `NEXT_PUBLIC_API_URL` in `.env.local` if needed.
