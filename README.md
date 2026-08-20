# GitHub Repo Analyzer

Full-stack app that analyzes GitHub repositories and user profiles, compares them against your resume and a job description using AI, and persists results to PostgreSQL.

## Features

- **Repo analysis** — fetch top-level files, languages, and recent commits for any public repo
- **User profile aggregation** — summarize languages, topics, and repos across a GitHub username
- **Resume upload** — parse PDF resumes and extract text
- **AI gap analysis** — compare resume + GitHub profile + job description; get matched/missing skills and a suggested project
- **Save & history** — persist repo analyses to Supabase/PostgreSQL and reload past results

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React 19, Vite, TypeScript |
| Backend | Express 5, TypeScript, tsx |
| APIs | GitHub REST API, OpenRouter (AI) |
| Database | PostgreSQL via Supabase (`pg`) |
| Other | multer (file upload), pdf-parse |

## Project Structure

```
github-repo-analyzer/
├── backend/
│   └── src/
│       ├── server.ts           # Express routes
│       ├── services/
│       │   ├── github.ts       # GitHub API calls
│       │   ├── gemini.ts       # AI gap analysis (OpenRouter)
│       │   └── resume.ts       # PDF text extraction
│       └── db/
│           ├── client.ts       # Postgres pool
│           └── queries.ts      # CRUD for analyses
└── frontend/
    └── src/
        └── App.tsx             # Main UI
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [GitHub personal access token](https://github.com/settings/tokens)
- A [Supabase](https://supabase.com) project (for persistence)
- An [OpenRouter](https://openrouter.ai) API key (for AI analysis)

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/github-repo-analyzer.git
cd github-repo-analyzer

cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment variables

Create `backend/.env`:

```env
GITHUB_TOKEN=your_github_token
OPENROUTER_API_KEY=your_openrouter_key
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

> **Note:** Use Supabase's **Connection Pooler** URL, not the direct connection. On macOS, the direct host (`db.*.supabase.co`) is IPv6-only and may fail with `ENOTFOUND`.
>
> URL-encode special characters in your password (e.g. `!` → `%21`).

### 3. Database setup

Run this in the Supabase SQL editor:

```sql
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_url TEXT NOT NULL,
  result JSONB NOT NULL,
  analyzed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Run locally

```bash
# Terminal 1 — backend (port 4000)
cd backend && npm run dev

# Terminal 2 — frontend (port 5173)
cd frontend && npm run dev
```

Open http://localhost:5173

> Avoid port **5000** on macOS — it's used by AirPlay Receiver.

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/repo-data?owner=&repo=` | Files, languages, and commits combined |
| GET | `/repo-files?owner=&repo=` | Top-level filenames |
| GET | `/repo-languages?owner=&repo=` | Language names |
| GET | `/repo-commits?owner=&repo=` | Recent commits |
| GET | `/user-profile?username=` | Aggregated GitHub user profile |
| POST | `/parse-resume` | Upload PDF (`resume` field), returns extracted text |
| POST | `/resume-analysis` | Upload PDF + username + jobDescription → AI gap analysis |
| POST | `/analyses` | Save a repo analysis `{ repoUrl, result }` |
| GET | `/analyses` | List all saved analyses |
| GET | `/analyses/:id` | Get one saved analysis |

## Example: Save an analysis

```bash
curl -X POST http://localhost:4000/analyses \
  -H 'Content-Type: application/json' \
  -d '{"repoUrl":"facebook/react","result":{"files":["README.md"],"languages":["JavaScript"],"commits":[]}}'
```

## License

ISC
